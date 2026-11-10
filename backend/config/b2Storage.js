const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const required = ['B2_KEY_ID', 'B2_APPLICATION_KEY', 'B2_BUCKET', 'B2_ENDPOINT'];
const missing = required.filter((name) => !process.env[name]);
const b2Enabled = missing.length === 0;

const client = b2Enabled
  ? new S3Client({
      endpoint: process.env.B2_ENDPOINT,
      region: process.env.B2_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.B2_KEY_ID,
        secretAccessKey: process.env.B2_APPLICATION_KEY,
      },
      forcePathStyle: true,
    })
  : null;

const MIME_TYPES = {
  '.mp4': 'video/mp4', '.m4v': 'video/mp4', '.mkv': 'video/x-matroska',
  '.mov': 'video/quicktime', '.avi': 'video/x-msvideo', '.webm': 'video/webm',
  '.mpeg': 'video/mpeg', '.mpg': 'video/mpeg', '.3gp': 'video/3gpp',
  '.wmv': 'video/x-ms-wmv', '.flv': 'video/x-flv', '.ts': 'video/mp2t',
  '.m2ts': 'video/mp2t', '.mts': 'video/mp2t', '.ogv': 'video/ogg',
  '.vob': 'video/dvd', '.divx': 'video/x-msvideo', '.xvid': 'video/x-msvideo',
};

function assertB2Configured() {
  if (!b2Enabled) {
    throw new Error(`Backblaze B2 is not configured. Missing: ${missing.join(', ')}`);
  }
}

async function uploadVideo(localPath, originalName) {
  assertB2Configured();
  const ext = path.extname(originalName || localPath).toLowerCase();
  const key = `videos/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}${ext}`;
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  const safeName = path.basename(originalName || 'video').replace(/[\r\n"\\]/g, '_');

  const upload = new Upload({
    client,
    params: {
      Bucket: process.env.B2_BUCKET,
      Key: key,
      Body: fs.createReadStream(localPath),
      ContentType: contentType,
      ContentDisposition: `inline; filename="${safeName}"`,
      CacheControl: 'private, max-age=0, no-cache',
    },
    partSize: 100 * 1024 * 1024,
    queueSize: 2,
    leavePartsOnError: false,
  });

  await upload.done();
  // Store only the permanent object key. Never store an expiring signed URL in MongoDB.
  return `b2://${key}`;
}

function extractB2Key(value) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('Episode video key is empty');
  }
  const valueTrimmed = value.trim();
  if (valueTrimmed.startsWith('b2://')) return valueTrimmed.slice(5).replace(/^\/+/, '');
  // Backward compatibility: accept old Backblaze download URLs and extract their object key.
  const marker = `/file/${process.env.B2_BUCKET}/`;
  const markerIndex = valueTrimmed.indexOf(marker);
  if (markerIndex >= 0) {
    return valueTrimmed.slice(markerIndex + marker.length).split('?')[0]
      .split('/').map((part) => decodeURIComponent(part)).join('/');
  }
  // Existing non-B2 URLs remain playable without signing.
  if (/^https:\/\//i.test(valueTrimmed)) return null;
  throw new Error('Invalid episode video reference. Expected b2:// object key or HTTPS URL.');
}

async function getSignedVideoUrl(videoReference, expiresIn = 21600) {
  assertB2Configured();
  const key = extractB2Key(videoReference);
  if (!key) return videoReference; // legacy external/public URL

  const command = new GetObjectCommand({
    Bucket: process.env.B2_BUCKET,
    Key: key,
  });
  return getSignedUrl(client, command, { expiresIn });
}

module.exports = {
  uploadVideo,
  getSignedVideoUrl,
  extractB2Key,
  b2Enabled,
};
