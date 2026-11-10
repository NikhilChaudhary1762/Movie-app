const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const path = require('path');

const required = ['B2_KEY_ID', 'B2_APPLICATION_KEY', 'B2_BUCKET', 'B2_ENDPOINT'];
const missing = required.filter((name) => !String(process.env[name] || '').trim());
const endpoint = String(process.env.B2_ENDPOINT || '').trim().replace(/\/$/, '');
const region = String(process.env.B2_REGION || '').trim();
const endpointRegion = (endpoint.match(/^https?:\/\/s3[.-]([a-z0-9-]+)\.backblazeb2\.com$/i) || [])[1];
const configProblems = [];
if (endpoint && !endpointRegion) configProblems.push('B2_ENDPOINT must be the S3 endpoint for your Backblaze B2 region');
if (endpointRegion && region && endpointRegion !== region) {
  configProblems.push(`B2_REGION (${region}) does not match B2_ENDPOINT region (${endpointRegion})`);
}
if (endpointRegion && !region) configProblems.push('B2_REGION is required and must match B2_ENDPOINT');
const configError = configProblems.join('; ');
const enabled = missing.length === 0 && configProblems.length === 0;

// Backblaze B2's S3-compatible API is signed using the bucket's actual region.
// WHEN_REQUIRED avoids SDK versions adding optional checksum headers to browser
// presigned UploadPart requests that the browser does not send.
const client = enabled ? new S3Client({
  endpoint,
  region,
  credentials: {
    accessKeyId: process.env.B2_KEY_ID,
    secretAccessKey: process.env.B2_APPLICATION_KEY,
  },
  forcePathStyle: true,
  maxAttempts: 3,
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
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
