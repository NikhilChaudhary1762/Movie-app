const express = require('express');
const crypto = require('crypto');
const path = require('path');
const {
  CreateMultipartUploadCommand,
  UploadPartCommand,
  ListPartsCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { client, bucket, getContentType, b2Enabled, b2Missing, b2ConfigError } = require('../config/b2Storage');
const UploadSession = require('../models/UploadSession');
const protect = require('../middleware/authMiddleware');
const admin = require('../middleware/adminMiddleware');

const router = express.Router();
const CHUNK_SIZE = Math.max(5 * 1024 * 1024, Number(process.env.UPLOAD_CHUNK_SIZE || 8 * 1024 * 1024));
const MAX_VIDEO_SIZE = Number(process.env.MAX_VIDEO_SIZE || 50 * 1024 * 1024 * 1024);
const PART_URL_EXPIRY = Math.min(3600, Math.max(60, Number(process.env.B2_PART_URL_EXPIRY || 900)));
const ALLOWED_FORMATS = new Set([
  '.mp4', '.mkv', '.mov', '.avi', '.webm', '.wmv', '.mpeg', '.mpg', '.3gp',
  '.m4v', '.flv', '.ts', '.ogv', '.m2ts', '.mts', '.vob', '.divx', '.xvid',
]);

const requireB2 = (_req, res, next) => {
  if (!b2Enabled || !client || !bucket) {
    return res.status(503).json({ success: false, message: b2ConfigError || `Backblaze B2 is not configured. Missing: ${b2Missing.join(', ')}` });
  }
  next();
};

const validSessionId = (value) => typeof value === 'string' && /^[a-f0-9-]{36}$/i.test(value);
const sessionForUser = (sessionId, userId) => UploadSession.findOne({ sessionId, userId, status: 'uploading' });

async function listAllParts(session) {
  const parts = [];
  let partNumberMarker;
  do {
    const result = await client.send(new ListPartsCommand({
      Bucket: bucket,
      Key: session.objectKey,
      UploadId: session.b2UploadId,
      PartNumberMarker: partNumberMarker,
      MaxParts: 1000,
    }));
    parts.push(...(result.Parts || []));
    partNumberMarker = result.IsTruncated ? result.NextPartNumberMarker : undefined;
  } while (partNumberMarker !== undefined);
  return parts;
}

// All upload operations require a logged-in administrator.
router.use('/b2', protect, admin, requireB2);

// POST /api/upload/b2/init
router.post('/b2/init', async (req, res) => {
  try {
    const { sessionId, fileName, fileSize, contentType } = req.body || {};
    const size = Number(fileSize);
    if (!validSessionId(sessionId)) return res.status(400).json({ success: false, message: 'Invalid upload session ID' });
    if (!fileName || !Number.isSafeInteger(size) || size <= 0 || size > MAX_VIDEO_SIZE) {
      return res.status(400).json({ success: false, message: 'Invalid file name or size. Maximum allowed size is 50 GB.' });
    }
    const extension = path.extname(fileName).toLowerCase();
    if (!ALLOWED_FORMATS.has(extension)) return res.status(415).json({ success: false, message: 'Unsupported video format' });

    let session = await UploadSession.findOne({ sessionId });
    if (session && String(session.userId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'This upload session belongs to another user' });
    }
    if (session && (session.fileSize !== size || session.fileName !== fileName)) {
      return res.status(409).json({ success: false, message: 'Upload session belongs to a different file. Select the file again to create a new session.' });
    }
    if (session?.status === 'completed') {
      return res.json({ success: true, completed: true, videoUrl: session.videoUrl, watchUrl: session.videoUrl, downloadUrl: session.videoUrl, receivedParts: [] });
    }
    if (session?.status === 'aborted') {
      await UploadSession.deleteOne({ _id: session._id });
      session = null;
    }

    if (!session) {
      const type = contentType || getContentType(fileName);
      const objectKey = `videos/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}${extension}`;
      const totalParts = Math.ceil(size / CHUNK_SIZE);
      if (totalParts > 10000) return res.status(400).json({ success: false, message: 'File requires more than 10,000 parts. Increase UPLOAD_CHUNK_SIZE.' });
      const created = await client.send(new CreateMultipartUploadCommand({
        Bucket: bucket,
        Key: objectKey,
        ContentType: type,
        CacheControl: 'private, no-cache',
        Metadata: { originalfilename: encodeURIComponent(fileName.slice(0, 200)) },
      }));
      try {
        session = await UploadSession.create({
          sessionId, b2UploadId: created.UploadId, objectKey, fileName, fileSize: size,
          contentType: type, partSize: CHUNK_SIZE, totalParts, userId: req.user._id,
        });
      } catch (dbError) {
        await client.send(new AbortMultipartUploadCommand({ Bucket: bucket, Key: objectKey, UploadId: created.UploadId })).catch(() => {});
        throw dbError;
      }
    }

    const uploadedParts = await listAllParts(session);
    const receivedParts = uploadedParts.map((part) => ({ partNumber: part.PartNumber, size: part.Size }));
    return res.json({ success: true, sessionId, objectKey: session.objectKey, partSize: session.partSize, totalParts: session.totalParts, receivedParts });
  } catch (error) {
    console.error('B2 multipart init error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Unable to start B2 multipart upload' });
  }
});

// POST /api/upload/b2/part-url
router.post('/b2/part-url', async (req, res) => {
  try {
    const { sessionId, partNumber } = req.body || {};
    const session = await sessionForUser(sessionId, req.user._id);
    if (!session) return res.status(404).json({ success: false, message: 'Upload session not found or expired. Start the upload again.' });
    const part = Number(partNumber);
    if (!Number.isInteger(part) || part < 1 || part > session.totalParts) return res.status(400).json({ success: false, message: 'Invalid part number' });
    const command = new UploadPartCommand({ Bucket: bucket, Key: session.objectKey, UploadId: session.b2UploadId, PartNumber: part });
    const uploadUrl = await getSignedUrl(client, command, { expiresIn: PART_URL_EXPIRY });
    return res.json({ success: true, uploadUrl, expiresIn: PART_URL_EXPIRY, partNumber: part });
  } catch (error) {
    console.error('B2 part URL error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Unable to create part upload URL' });
  }
});

// POST /api/upload/b2/complete
router.post('/b2/complete', async (req, res) => {
  try {
    const { sessionId } = req.body || {};
    const session = await sessionForUser(sessionId, req.user._id);
    if (!session) {
      const completed = await UploadSession.findOne({ sessionId, userId: req.user._id, status: 'completed' });
      if (completed) return res.json({ success: true, videoUrl: completed.videoUrl, watchUrl: completed.videoUrl, downloadUrl: completed.videoUrl });
      return res.status(404).json({ success: false, message: 'Upload session not found or already closed' });
    }

    const uploadedParts = await listAllParts(session);
    const byNumber = new Map(uploadedParts.map((part) => [part.PartNumber, part]));
    const missing = [];
    for (let number = 1; number <= session.totalParts; number++) {
      const part = byNumber.get(number);
      const expectedSize = Math.min(session.partSize, session.fileSize - (number - 1) * session.partSize);
      if (!part || part.Size !== expectedSize || !part.ETag) missing.push(number);
    }
    if (missing.length) {
      return res.status(409).json({ success: false, message: `B2 is missing ${missing.length} part(s). Upload them again before completing.`, missingParts: missing.slice(0, 100) });
    }

    const result = await client.send(new CompleteMultipartUploadCommand({
      Bucket: bucket,
      Key: session.objectKey,
      UploadId: session.b2UploadId,
      MultipartUpload: { Parts: uploadedParts.sort((a, b) => a.PartNumber - b.PartNumber).map((part) => ({ ETag: part.ETag, PartNumber: part.PartNumber })) },
    }));
    const videoUrl = `b2://${session.objectKey}`;
    session.status = 'completed';
    session.videoUrl = videoUrl;
    session.updatedAt = new Date();
    await session.save();
    return res.status(201).json({ success: true, message: 'Video uploaded successfully to Backblaze B2', fileName: session.fileName, size: session.fileSize, videoUrl, watchUrl: videoUrl, downloadUrl: videoUrl, etag: result.ETag });
  } catch (error) {
    console.error('B2 multipart completion error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Unable to complete B2 multipart upload' });
  }
});

// DELETE /api/upload/b2/:sessionId
router.delete('/b2/:sessionId', async (req, res) => {
  try {
    const session = await sessionForUser(req.params.sessionId, req.user._id);
    if (!session) return res.status(404).json({ success: false, message: 'Active upload session not found' });
    await client.send(new AbortMultipartUploadCommand({ Bucket: bucket, Key: session.objectKey, UploadId: session.b2UploadId }));
    session.status = 'aborted';
    session.updatedAt = new Date();
    await session.save();
    return res.json({ success: true, message: 'B2 multipart upload aborted' });
  } catch (error) {
    console.error('B2 multipart abort error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Unable to abort upload' });
  }
});

// Keep a small diagnostic endpoint public; it never returns credentials.
router.get('/status', (_req, res) => res.json({
  success: true,
  storage: b2Enabled ? 'Backblaze B2 Private (direct multipart)' : 'Not configured',
  b2Configured: b2Enabled,
  missingEnvironmentVariables: b2Missing,
  configurationError: b2ConfigError || null,
  region: process.env.B2_REGION || 'us-east-005',
  endpoint: process.env.B2_ENDPOINT || null,
  bucketConfigured: Boolean(bucket),
  chunkSize: CHUNK_SIZE,
  maxVideoSize: MAX_VIDEO_SIZE,
  uploadMode: 'browser-to-b2-multipart',
}));

module.exports = router;
