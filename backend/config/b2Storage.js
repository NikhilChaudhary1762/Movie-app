const { S3Client } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const enabled = Boolean(process.env.B2_KEY_ID && process.env.B2_APPLICATION_KEY && process.env.B2_BUCKET && process.env.B2_ENDPOINT);
const client = enabled ? new S3Client({
  endpoint: process.env.B2_ENDPOINT,
  region: process.env.B2_REGION || 'us-east-1',
  credentials: { accessKeyId: process.env.B2_KEY_ID, secretAccessKey: process.env.B2_APPLICATION_KEY },
  forcePathStyle: true,
}) : null;

async function uploadVideo(localPath, originalName) {
  if (!enabled) throw new Error('Backblaze B2 is not configured. Set B2 environment variables.');
  const ext = path.extname(originalName || localPath).toLowerCase();
  const key = `videos/${new Date().toISOString().slice(0,10)}/${crypto.randomUUID()}${ext}`;
  const upload = new Upload({
    client,
    params: { Bucket: process.env.B2_BUCKET, Key: key, Body: fs.createReadStream(localPath), ContentType: 'video/*' },
    partSize: 100 * 1024 * 1024,
    queueSize: 3,
  });
  await upload.done();
  const base = (process.env.B2_PUBLIC_BASE_URL || '').replace(/\/$/, '');
  if (!base) throw new Error('Set B2_PUBLIC_BASE_URL to your public bucket URL or custom domain.');
  return `${base}/${key.split('/').map(encodeURIComponent).join('/')}`;
}
module.exports = { uploadVideo, b2Enabled: enabled };
