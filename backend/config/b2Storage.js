const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const required = ['B2_KEY_ID', 'B2_APPLICATION_KEY', 'B2_BUCKET', 'B2_ENDPOINT', 'B2_REGION'];
const missing = required.filter((name) => !String(process.env[name] || '').trim());

// Render values are sometimes entered as a bare host. AWS SDK needs an
// absolute URL, so normalize `s3.us-east-005.backblazeb2.com` to HTTPS.
function normalizeEndpoint(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  const parsed = new URL(candidate);
  if (!['https:', 'http:'].includes(parsed.protocol)) {
    throw new Error('B2_ENDPOINT must start with https:// or http://');
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error('B2_ENDPOINT must not contain credentials, query parameters, or a fragment');
  }
  if (parsed.pathname && parsed.pathname !== '/') {
    throw new Error('B2_ENDPOINT must be only the S3 hostname, without a path');
  }
  return `${parsed.protocol}//${parsed.host}`;
}

let endpoint = '';
let endpointRegion = '';
const configProblems = [];
try {
  endpoint = normalizeEndpoint(process.env.B2_ENDPOINT);
  if (endpoint) {
    const hostname = new URL(endpoint).hostname;
    endpointRegion = (hostname.match(/^s3[.-]([a-z0-9-]+)\.backblazeb2\.com$/i) || [])[1] || '';
    if (!endpointRegion) configProblems.push('B2_ENDPOINT must be a Backblaze S3 endpoint such as s3.us-east-005.backblazeb2.com');
  }
} catch (error) {
  configProblems.push(error.message || 'B2_ENDPOINT is invalid');
}

const region = String(process.env.B2_REGION || '').trim();
if (endpointRegion && region && endpointRegion.toLowerCase() !== region.toLowerCase()) {
  configProblems.push(`B2_REGION (${region}) does not match B2_ENDPOINT region (${endpointRegion})`);
}
const configError = configProblems.join('; ');
const enabled = missing.length === 0 && configProblems.length === 0;

const client = enabled ? new S3Client({
  endpoint: new URL(endpoint),
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

module.exports = {
  uploadVideo, getSignedVideoUrl, b2Enabled: enabled, b2Missing: missing,
  b2ConfigError: configError, b2Endpoint: endpoint, b2Region: region,
};
