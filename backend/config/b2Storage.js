const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const path = require('path');

const required = ['B2_KEY_ID', 'B2_APPLICATION_KEY', 'B2_BUCKET', 'B2_ENDPOINT'];
const missing = required.filter((name) => !process.env[name]);
const endpoint = (process.env.B2_ENDPOINT || '').replace(/\/$/, '');
// Set B2_REGION explicitly in Render. Default matches the current MovieFlex deployment.
const region = process.env.B2_REGION || 'us-east-005';
const endpointRegion = (endpoint.match(/s3[.-]([a-z0-9-]+)\.backblazeb2\.com/i) || [])[1];
const regionMismatch = Boolean(endpointRegion && endpointRegion !== region);
const configError = regionMismatch ? `B2_REGION (${region}) does not match B2_ENDPOINT region (${endpointRegion})` : '';
const enabled = missing.length === 0 && !regionMismatch;

const client = enabled ? new S3Client({
  endpoint,
  region,
  credentials: {
    accessKeyId: process.env.B2_KEY_ID,
    secretAccessKey: process.env.B2_APPLICATION_KEY,
  },
  forcePathStyle: true,
  maxAttempts: 3,
}) : null;

function getContentType(filename) {
  const ext = path.extname(filename || '').toLowerCase();
  const types = {
    '.mp4': 'video/mp4', '.m4v': 'video/mp4', '.mkv': 'video/x-matroska',
    '.webm': 'video/webm', '.mov': 'video/quicktime', '.avi': 'video/x-msvideo',
    '.mpeg': 'video/mpeg', '.mpg': 'video/mpeg', '.ogv': 'video/ogg',
    '.ts': 'video/mp2t', '.m2ts': 'video/mp2t', '.mts': 'video/mp2t',
    '.3gp': 'video/3gpp', '.wmv': 'video/x-ms-wmv', '.flv': 'video/x-flv',
  };
  return types[ext] || 'application/octet-stream';
}

async function getSignedVideoUrl(fileKey, expiresIn = 7200) {
  if (!enabled) throw new Error(`Backblaze B2 is not configured. Missing: ${missing.join(', ')}`);
  if (!fileKey || typeof fileKey !== 'string') throw new Error('B2 file key is missing');
  const key = fileKey.startsWith('b2://') ? fileKey.slice(5) : fileKey;
  if (!key || key.startsWith('/') || key.includes('..')) throw new Error('Invalid B2 file key');
  return getSignedUrl(client, new GetObjectCommand({ Bucket: process.env.B2_BUCKET, Key: key }), { expiresIn });
}

module.exports = {
  client,
  bucket: process.env.B2_BUCKET,
  getContentType,
  getSignedVideoUrl,
  b2Enabled: enabled,
  b2Missing: missing,
  b2ConfigError: configError,
};
