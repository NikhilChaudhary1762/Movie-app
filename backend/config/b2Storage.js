const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const required = ['B2_KEY_ID', 'B2_APPLICATION_KEY', 'B2_BUCKET', 'B2_ENDPOINT'];
const missing = required.filter((name) => !String(process.env[name] || '').trim());
const b2Enabled = missing.length === 0;

function getEndpointRegion() {
  const endpoint = String(process.env.B2_ENDPOINT || '').trim();
  const match = endpoint.match(/^https:\/\/s3\.([a-z0-9-]+)\.backblazeb2\.com\/?$/i);
  if (!match) return null;
  return match[1];
}

const endpointRegion = getEndpointRegion();
const configuredRegion = String(process.env.B2_REGION || endpointRegion || '').trim();

if (b2Enabled && !endpointRegion) {
  throw new Error('Invalid B2_ENDPOINT. Expected https://s3.<region>.backblazeb2.com');
}
if (b2Enabled && configuredRegion && configuredRegion !== endpointRegion) {
  throw new Error(`B2_REGION (${configuredRegion}) does not match B2_ENDPOINT region (${endpointRegion}). Use the exact region shown in the Backblaze bucket details.`);
}

const client = b2Enabled
  ? new S3Client({
      endpoint: process.env.B2_ENDPOINT.trim().replace(/\/$/, ''),
      region: configuredRegion || endpointRegion,
      credentials: {
        accessKeyId: process.env.B2_KEY_ID.trim(),
        secretAccessKey: process.env.B2_APPLICATION_KEY.trim(),
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
    throw new Error(`Backblaze B2 is not configured. Missing Render environment variables: ${missing.join(', ')}`);
  }
}

function safeFileName(name) {
  return path.basename(name || 'video').replace(/[\r\n"\\]/g, '_');
}

async function uploadVideo(localPath, originalName) {
  assertB2Configured();
  if (!fs.existsSync(localPath)) throw new Error(`Merged upload file does not exist: ${localPath}`);

  const ext = path.extname(originalName || localPath).toLowerCase();
  const key = `videos/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}${ext}`;
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  const stat = await fs.promises.stat(localPath);

  const uploader = new Upload({
    client,
    params: {
      Bucket: process.env.B2_BUCKET.trim(),
      Key: key,
      Body: fs.createReadStream(localPath),
      ContentLength: stat.size,
      ContentType: contentType,
      ContentDisposition: `inline; filename="${safeFileName(originalName)}"`,
      CacheControl: 'private, max-age=0, no-cache',
    },
    // B2 multipart upload requires parts of at least 5 MiB (except the last).
    partSize: 64 * 1024 * 1024,
    queueSize: 2,
    leavePartsOnError: false,
  });

  try {
    await uploader.done();
  } catch (error) {
    console.error('B2 upload failed:', {
      name: error.name,
      code: error.Code || error.code,
      message: error.message,
      requestId: error.$metadata?.requestId,
      httpStatusCode: error.$metadata?.httpStatusCode,
    });
    throw new Error(`Backblaze B2 upload failed: ${error.message}`);
  }

  // The database stores this stable object key, never an expiring signed URL.
  return `b2://${key}`;
}

function extractB2Key(reference) {
  if (typeof reference !== 'string' || !reference.trim()) {
    throw new Error('Episode video reference is empty. Upload the episode video again.');
  }
  const value = reference.trim();
  if (value.startsWith('b2://')) return value.slice(5).replace(/^\/+/, '');

  // Support older B2 public URLs already stored in MongoDB.
  const bucket = String(process.env.B2_BUCKET || '');
  const marker = `/file/${bucket}/`;
  const markerAt = value.indexOf(marker);
  if (markerAt >= 0) {
    return value.slice(markerAt + marker.length).split('?')[0]
      .split('/').map((part) => decodeURIComponent(part)).join('/');
  }

  // Preserve external HTTPS video URLs from older records.
  if (/^https:\/\//i.test(value)) return null;
  throw new Error('Invalid episode video reference. Expected b2:// object key or HTTPS URL.');
}

async function getSignedVideoUrl(reference, expiresIn = 21600) {
  assertB2Configured();
  const key = extractB2Key(reference);
  if (!key) return reference;

  const command = new GetObjectCommand({
    Bucket: process.env.B2_BUCKET.trim(),
    Key: key,
    ResponseContentDisposition: 'inline',
  });
  return getSignedUrl(client, command, { expiresIn });
}

module.exports = {
  uploadVideo,
  getSignedVideoUrl,
  extractB2Key,
  b2Enabled,
  b2ConfigStatus: {
    configured: b2Enabled,
    missing,
    endpointRegion,
    configuredRegion,
    bucketConfigured: Boolean(process.env.B2_BUCKET),
  },
};
