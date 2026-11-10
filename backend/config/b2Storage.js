const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const required = ['B2_KEY_ID', 'B2_APPLICATION_KEY', 'B2_BUCKET', 'B2_ENDPOINT'];
const missing = required.filter((name) => !process.env[name]);
const enabled = missing.length === 0;

const endpoint = (process.env.B2_ENDPOINT || '').replace(/\/$/, '');
const region = process.env.B2_REGION || 'us-west-005';

const client = enabled ? new S3Client({
  endpoint,
  region,
  credentials: {
    accessKeyId: process.env.B2_KEY_ID,
    secretAccessKey: process.env.B2_APPLICATION_KEY,
  },
  forcePathStyle: true,
}) : null;

function getContentType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const types = {
    '.mp4': 'video/mp4', '.m4v': 'video/mp4', '.mkv': 'video/x-matroska',
    '.webm': 'video/webm', '.mov': 'video/quicktime', '.avi': 'video/x-msvideo',
    '.mpeg': 'video/mpeg', '.mpg': 'video/mpeg', '.ogv': 'video/ogg',
    '.ts': 'video/mp2t', '.m2ts': 'video/mp2t', '.mts': 'video/mp2t',
  };
  return types[ext] || 'application/octet-stream';
}

async function uploadVideo(localPath, originalName) {
  if (!enabled) throw new Error(`Backblaze B2 is not configured. Missing: ${missing.join(', ')}`);
  if (!fs.existsSync(localPath)) throw new Error(`Upload source file not found: ${localPath}`);

  const ext = path.extname(originalName || localPath).toLowerCase();
  const key = `videos/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}${ext}`;
  const upload = new Upload({
    client,
    params: {
      Bucket: process.env.B2_BUCKET,
      Key: key,
      Body: fs.createReadStream(localPath),
      ContentType: getContentType(originalName || localPath),
      CacheControl: 'private, no-cache',
    },
    partSize: 100 * 1024 * 1024,
    queueSize: 2,
    leavePartsOnError: false,
  });

  await upload.done();
  // Store a stable object key, never a public URL or expiring signed URL.
  return `b2://${key}`;
}

async function getSignedVideoUrl(fileKey, expiresIn = 7200) {
  if (!enabled) throw new Error(`Backblaze B2 is not configured. Missing: ${missing.join(', ')}`);
  if (!fileKey || typeof fileKey !== 'string') throw new Error('B2 file key is missing');
  const key = fileKey.startsWith('b2://') ? fileKey.slice(5) : fileKey;
  if (!key || key.startsWith('/')) throw new Error('Invalid B2 file key');

  const command = new GetObjectCommand({
    Bucket: process.env.B2_BUCKET,
    Key: key,
  });
  return getSignedUrl(client, command, { expiresIn });
}

module.exports = { uploadVideo, getSignedVideoUrl, b2Enabled: enabled, b2Missing: missing };
