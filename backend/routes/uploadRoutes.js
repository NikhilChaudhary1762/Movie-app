const express = require('express');
const crypto = require('crypto');
const path = require('path');
const {
  CreateMultipartUploadCommand,
  UploadPartCommand,
  ListPartsCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  HeadObjectCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const {
  client, bucket, getContentType, b2Enabled, b2Missing, b2ConfigError,
} = require('../config/b2Storage');
const UploadSession = require('../models/UploadSession');
const protect = require('../middleware/authMiddleware');
const admin = require('../middleware/adminMiddleware');

const router = express.Router();
const MiB = 1024 * 1024;
const CHUNK_SIZE = Math.max(5 * MiB, Number(process.env.UPLOAD_CHUNK_SIZE || 8 * MiB));
const MAX_VIDEO_SIZE = Number(process.env.MAX_VIDEO_SIZE || 50 * 1024 * MiB);
const PART_URL_EXPIRY = Math.min(3600, Math.max(60, Number(process.env.B2_PART_URL_EXPIRY || 900)));
const ALLOWED_FORMATS = new Set([
  '.mp4', '.mkv', '.mov', '.avi', '.webm', '.wmv', '.mpeg', '.mpg', '.3gp',
  '.m4v', '.flv', '.ts', '.ogv', '.m2ts', '.mts', '.vob', '.divx', '.xvid',
]);

const requireB2 = (_req, res, next) => {
  if (!b2Enabled || !client || !bucket) {
    return res.status(503).json({
      success: false,
      message: b2ConfigError || `Backblaze B2 is not configured. Missing: ${b2Missing.join(', ')}`,
    });
  }
  return next();
};

const validSessionId = (value) => typeof value === 'string' && /^[a-f0-9-]{36}$/i.test(value);
const sessionForUser = (sessionId, userId) => {
  if (!validSessionId(sessionId)) return null;
  return UploadSession.findOne({ sessionId, userId, status: 'uploading' });
};

function publicError(error) {
  // Keep useful AWS/B2 diagnostics, but never serialize credentials or signed URLs.
  return error?.Code || error?.code || error?.name || error?.message || 'Unknown storage error';
}

async function listAllParts(session) {
  const parts = [];
  let marker;
  do {
    const result = await client.send(new ListPartsCommand({
      Bucket: bucket,
      Key: session.objectKey,
      UploadId: session.b2UploadId,
      PartNumberMarker: marker,
      MaxParts: 1000,
    }));
    parts.push(...(result.Parts || []));
    marker = result.IsTruncated ? result.NextPartNumberMarker : undefined;
    if (result.IsTruncated && marker === undefined) {
      throw new Error('B2 returned a truncated parts list without a continuation marker');
    }
  } while (marker !== undefined);
  return parts;
}

async function findCompletedObject(session) {
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: session.objectKey }));
    return true;
  } catch (error) {
    const status = error?.$metadata?.httpStatusCode;
    if (status === 404 || error?.name === 'NotFound' || error?.name === 'NoSuchKey') return false;
    throw error;
  }
}

router.use('/b2', protect, admin, requireB2);

// Create or resume a B2 multipart upload. Only metadata is stored in MongoDB.
router.post('/b2/init', async (req, res) => {
  try {
    const { sessionId, fileName, fileSize } = req.body || {};
    const size = Number(fileSize);
    if (!validSessionId(sessionId)) {
      return res.status(400).json({ success: false, message: 'Invalid upload session ID. Refresh and select the file again.' });
    }
    if (typeof fileName !== 'string' || !fileName.trim() || !Number.isSafeInteger(size) || size <= 0 || size > MAX_VIDEO_SIZE) {
      return res.status(400).json({ success: false, message: `Invalid file name or size. Maximum allowed size is ${(MAX_VIDEO_SIZE / (1024 ** 3)).toFixed(0)} GB.` });
    }
    const extension = path.extname(fileName).toLowerCase();
    if (!ALLOWED_FORMATS.has(extension)) {
      return res.status(415).json({ success: false, message: `Unsupported video format: ${extension || 'no extension'}` });
    }

    let session = await UploadSession.findOne({ sessionId });
    if (session && String(session.userId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'This upload session belongs to another administrator.' });
    }
    if (session && (Number(session.fileSize) !== size || session.fileName !== fileName)) {
      return res.status(409).json({ success: false, message: 'This upload session belongs to a different file. Select the correct file or clear the old upload session.' });
    }
    if (session?.status === 'completed') {
      return res.json({ success: true, completed: true, videoUrl: session.videoUrl, watchUrl: session.videoUrl, downloadUrl: session.videoUrl, objectKey: session.objectKey, receivedParts: [] });
    }
    if (session && session.status !== 'uploading') {
      await UploadSession.deleteOne({ _id: session._id });
      session = null;
    }

    if (!session) {
      const contentType = getContentType(fileName);
      const objectKey = `videos/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}${extension}`;
      const totalParts = Math.ceil(size / CHUNK_SIZE);
      if (totalParts > 10000) {
        return res.status(400).json({ success: false, message: 'This file needs more than 10,000 parts. Increase UPLOAD_CHUNK_SIZE.' });
      }
      const created = await client.send(new CreateMultipartUploadCommand({
        Bucket: bucket,
        Key: objectKey,
        ContentType: contentType,
        CacheControl: 'private, no-cache',
        Metadata: { originalfilename: encodeURIComponent(fileName.slice(0, 200)) },
      }));
      if (!created.UploadId) throw new Error('Backblaze did not return a multipart UploadId');
      try {
        session = await UploadSession.create({
          sessionId,
          b2UploadId: created.UploadId,
          objectKey,
          fileName,
          fileSize: size,
          contentType,
          partSize: CHUNK_SIZE,
          totalParts,
          userId: req.user._id,
          status: 'uploading',
        });
      } catch (dbError) {
        await client.send(new AbortMultipartUploadCommand({ Bucket: bucket, Key: objectKey, UploadId: created.UploadId })).catch(() => {});
        throw dbError;
      }
    }

    let uploadedParts;
    try {
      uploadedParts = await listAllParts(session);
    } catch (storageError) {
      // The B2 multipart session may have expired or been aborted outside the app.
      if (['NoSuchUpload', 'NoSuchUploadException', 'NotFound'].includes(storageError?.name || storageError?.Code)) {
        await UploadSession.deleteOne({ _id: session._id });
        return res.status(410).json({ success: false, restartUpload: true, message: 'The old B2 upload session has expired. Select the file again to start a fresh upload.' });
      }
      throw storageError;
    }
    const receivedParts = uploadedParts.map((part) => ({ partNumber: part.PartNumber, size: part.Size }));
    return res.json({ success: true, sessionId, objectKey: session.objectKey, partSize: session.partSize, totalParts: session.totalParts, receivedParts });
  } catch (error) {
    console.error('B2 multipart init error:', error);
    return res.status(500).json({ success: false, message: `B2 upload initialization failed: ${publicError(error)}` });
  }
});

// Return a short-lived URL for exactly one part. Video bytes never pass through Render.
router.post('/b2/part-url', async (req, res) => {
  try {
    const { sessionId, partNumber } = req.body || {};
    const session = await sessionForUser(sessionId, req.user._id);
    if (!session) return res.status(404).json({ success: false, restartUpload: true, message: 'Upload session not found. Start the upload again.' });
    const part = Number(partNumber);
    if (!Number.isInteger(part) || part < 1 || part > session.totalParts) {
      return res.status(400).json({ success: false, message: 'Invalid upload part number.' });
    }
    const command = new UploadPartCommand({
      Bucket: bucket,
      Key: session.objectKey,
      UploadId: session.b2UploadId,
      PartNumber: part,
    });
    const uploadUrl = await getSignedUrl(client, command, { expiresIn: PART_URL_EXPIRY });
    return res.json({ success: true, uploadUrl, expiresIn: PART_URL_EXPIRY, partNumber: part });
  } catch (error) {
    console.error('B2 part URL error:', error);
    return res.status(500).json({ success: false, message: `Could not create B2 part URL: ${publicError(error)}` });
  }
});

// Complete only after B2 confirms every expected part exists with the expected size.
router.post('/b2/complete', async (req, res) => {
  try {
    const { sessionId } = req.body || {};
    if (!validSessionId(sessionId)) return res.status(400).json({ success: false, message: 'Invalid upload session ID.' });
    let session = await sessionForUser(sessionId, req.user._id);
    if (!session) {
      const completed = await UploadSession.findOne({ sessionId, userId: req.user._id, status: 'completed' });
      if (completed) return res.json({ success: true, videoUrl: completed.videoUrl, watchUrl: completed.videoUrl, downloadUrl: completed.videoUrl, objectKey: completed.objectKey });
      return res.status(404).json({ success: false, message: 'Upload session not found or already closed. Select the file again.' });
    }

    const uploadedParts = await listAllParts(session);
    const byNumber = new Map(uploadedParts.map((part) => [Number(part.PartNumber), part]));
    const missingParts = [];
    for (let number = 1; number <= session.totalParts; number += 1) {
      const part = byNumber.get(number);
      const expectedSize = Math.min(session.partSize, session.fileSize - ((number - 1) * session.partSize));
      if (!part || Number(part.Size) !== expectedSize || !part.ETag) missingParts.push(number);
    }
    if (missingParts.length) {
      return res.status(409).json({ success: false, message: `Backblaze is missing ${missingParts.length} part(s). Retry those parts.`, missingParts });
    }

    const parts = uploadedParts
      .sort((a, b) => a.PartNumber - b.PartNumber)
      .map((part) => ({ ETag: part.ETag, PartNumber: part.PartNumber }));

    try {
      await client.send(new CompleteMultipartUploadCommand({
        Bucket: bucket,
        Key: session.objectKey,
        UploadId: session.b2UploadId,
        MultipartUpload: { Parts: parts },
      }));
    } catch (completeError) {
      // A request may have reached B2 even if Render lost the response. Verify the final object
      // before reporting failure, making completion safely retryable.
      if (!await findCompletedObject(session)) throw completeError;
    }

    const videoUrl = `b2://${session.objectKey}`;
    session.status = 'completed';
    session.videoUrl = videoUrl;
    session.updatedAt = new Date();
    await session.save();
    return res.status(201).json({ success: true, message: 'Video uploaded successfully to Backblaze B2.', fileName: session.fileName, size: session.fileSize, videoUrl, watchUrl: videoUrl, downloadUrl: videoUrl, objectKey: session.objectKey });
  } catch (error) {
    console.error('B2 multipart completion error:', error);
    const status = error?.$metadata?.httpStatusCode;
    return res.status(status && status >= 400 && status < 500 ? status : 500).json({ success: false, message: `Could not complete B2 video upload: ${publicError(error)}` });
  }
});

router.delete('/b2/:sessionId', async (req, res) => {
  try {
    const session = await sessionForUser(req.params.sessionId, req.user._id);
    if (!session) return res.status(404).json({ success: false, message: 'Active upload session not found.' });
    await client.send(new AbortMultipartUploadCommand({ Bucket: bucket, Key: session.objectKey, UploadId: session.b2UploadId }));
    session.status = 'aborted';
    session.updatedAt = new Date();
    await session.save();
    return res.json({ success: true, message: 'B2 multipart upload aborted.' });
  } catch (error) {
    console.error('B2 multipart abort error:', error);
    return res.status(500).json({ success: false, message: `Unable to abort B2 upload: ${publicError(error)}` });
  }
});

router.get('/status', (_req, res) => res.json({
  success: true,
  storage: b2Enabled ? 'Backblaze B2 Private (direct multipart)' : 'Not configured',
  b2Configured: b2Enabled,
  missingEnvironmentVariables: b2Missing,
  configurationError: b2ConfigError || null,
  region: process.env.B2_REGION || null,
  endpoint: process.env.B2_ENDPOINT || null,
  bucketConfigured: Boolean(bucket),
  chunkSize: CHUNK_SIZE,
  maxVideoSize: MAX_VIDEO_SIZE,
  uploadMode: 'browser-to-b2-multipart',
}));

module.exports = router;
