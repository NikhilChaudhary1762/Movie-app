
const {
  S3Client,
  GetObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  ListPartsCommand,
  AbortMultipartUploadCommand
} = require("@aws-sdk/client-s3");

const { Upload } = require("@aws-sdk/lib-storage");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// Required environment variables
const required = [
  "B2_KEY_ID",
  "B2_APPLICATION_KEY",
  "B2_BUCKET",
  "B2_ENDPOINT",
  "B2_REGION"
];

const missing = required.filter(
  name => !String(process.env[name] || "").trim()
);

// Normalize Backblaze endpoint
function normalizeEndpoint(value) {
  let raw = String(value || "")
    .trim()
    .replace(/[\s\u200B]+/g, "");

  // Remove accidental literal undefined suffix
  raw = raw.replace(/undefined$/i, "");

  if (!raw) return "";

  // Add HTTPS if protocol is missing
  const candidate = /^https?:\/\//i.test(raw)
    ? raw
    : `https://${raw}`;

  let parsed;

  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error(
      "Invalid B2_ENDPOINT. Use https://s3.us-east-005.backblazeb2.com"
    );
  }

  if (!["https:", "http:"].includes(parsed.protocol)) {
    throw new Error("Invalid B2 endpoint protocol");
  }

  if (
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error("B2_ENDPOINT contains invalid URL components");
  }

  if (parsed.pathname !== "/" && parsed.pathname !== "") {
    throw new Error("B2_ENDPOINT must not contain a path");
  }

  return `${parsed.protocol}//${parsed.host.toLowerCase()}`;
}

// Validate endpoint and region
let endpoint = "";
let endpointRegion = "";

const configProblems = [];

try {
  endpoint = normalizeEndpoint(process.env.B2_ENDPOINT);

  if (endpoint) {
    const hostname = new URL(endpoint).hostname;

    const match = hostname.match(
      /^s3[.-]([a-z0-9-]+)\.backblazeb2\.com$/i
    );

    endpointRegion = match ? match[1] : "";

    if (!endpointRegion) {
      configProblems.push(
        "Invalid Backblaze S3 endpoint hostname"
      );
    }
  }
} catch (error) {
  configProblems.push(error.message);
}

const region = String(process.env.B2_REGION || "").trim();

if (
  endpointRegion &&
  region &&
  endpointRegion.toLowerCase() !== region.toLowerCase()
) {
  configProblems.push(
    `B2_REGION (${region}) does not match endpoint region (${endpointRegion})`
  );
}

const configError = configProblems.join("; ");

const enabled =
  missing.length === 0 &&
  configProblems.length === 0;

// Create S3 client
const client = enabled
  ? new S3Client({
      endpoint,
      region,

      credentials: {
        accessKeyId: process.env.B2_KEY_ID.trim(),
        secretAccessKey: process.env.B2_APPLICATION_KEY.trim()
      },

      forcePathStyle: true,
      maxAttempts: 3,

      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED"
    })
  : null;

// Configuration validation
function checkB2() {
  if (!enabled) {
    throw new Error(
      `Backblaze B2 configuration error. Missing: ${missing.join(", ")}. Problems: ${configError}`
    );
  }
}

// Video content type
function getContentType(filename) {
  const ext = path.extname(filename).toLowerCase();

  const types = {
    ".mp4": "video/mp4",
    ".m4v": "video/mp4",
    ".mkv": "video/x-matroska",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
    ".avi": "video/x-msvideo",
    ".mpeg": "video/mpeg",
    ".mpg": "video/mpeg",
    ".ogv": "video/ogg",
    ".3gp": "video/3gpp",
    ".flv": "video/x-flv",
    ".vob": "video/mpeg",
    ".wmv": "video/x-ms-wmv",
    ".ts": "video/mp2t",
    ".m2ts": "video/mp2t",
    ".mts": "video/mp2t"
  };

  return types[ext] || "application/octet-stream";
}

// Standard video upload
async function uploadVideo(localPath, originalName) {
  checkB2();

  if (!fs.existsSync(localPath)) {
    throw new Error(`Upload file not found: ${localPath}`);
  }

  const ext = path.extname(originalName || localPath).toLowerCase();

  const key = `videos/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}${ext}`;

  const upload = new Upload({
    client,

    params: {
      Bucket: process.env.B2_BUCKET.trim(),
      Key: key,
      Body: fs.createReadStream(localPath),
      ContentType: getContentType(originalName || localPath),
      ContentDisposition: "inline",
      CacheControl: "private, no-cache"
    },

    partSize: 100 * 1024 * 1024,
    queueSize: 2,
    leavePartsOnError: false
  });

  await upload.done();

  return `b2://${key}`;
}

// Create multipart upload
async function createMultipartVideo(name, contentType) {
  checkB2();

  const ext = path.extname(name || "").toLowerCase();

  const key = `videos/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}${ext}`;

  const result = await client.send(
    new CreateMultipartUploadCommand({
      Bucket: process.env.B2_BUCKET.trim(),
      Key: key,

      ContentType:
        contentType && contentType !== "application/octet-stream"
          ? contentType
          : getContentType(name || ""),

      ContentDisposition: "inline",
      CacheControl: "private, no-cache"
    })
  );

  if (!result.UploadId) {
    throw new Error("Backblaze did not return multipart UploadId");
  }

  return {
    key,
    uploadId: result.UploadId
  };
}

// Generate signed part URL
async function signMultipartPart(
  key,
  uploadId,
  partNumber,
  expiresIn = 3600
) {
  checkB2();

  if (
    !key ||
    !uploadId ||
    !Number.isInteger(partNumber) ||
    partNumber < 1 ||
    partNumber > 10000
  ) {
    throw new Error("Invalid multipart part request");
  }

  const command = new UploadPartCommand({
    Bucket: process.env.B2_BUCKET.trim(),
    Key: key,
    UploadId: uploadId,
    PartNumber: partNumber
  });

  return getSignedUrl(client, command, { expiresIn });
}

// List uploaded parts
async function listMultipartParts(key, uploadId) {
  checkB2();

  const parts = [];
  let marker;

  do {
    const result = await client.send(
      new ListPartsCommand({
        Bucket: process.env.B2_BUCKET.trim(),
        Key: key,
        UploadId: uploadId,
        PartNumberMarker: marker
      })
    );

    for (const part of result.Parts || []) {
      parts.push({
        PartNumber: part.PartNumber,
        ETag: part.ETag,
        Size: part.Size
      });
    }

    marker = result.IsTruncated
      ? result.NextPartNumberMarker
      : undefined;

  } while (marker !== undefined);

  return parts;
}

// Complete multipart upload
async function completeMultipartVideo(key, uploadId, parts) {
  checkB2();

  const normalized = (parts || [])
    .map(part => ({
      PartNumber: Number(part.PartNumber),
      ETag: part.ETag
    }))
    .sort((a, b) => a.PartNumber - b.PartNumber);

  if (
    !normalized.length ||
    normalized.some(
      (part, index) =>
        !Number.isInteger(part.PartNumber) ||
        !part.ETag ||
        part.PartNumber !== index + 1
    )
  ) {
    throw new Error("Multipart parts are incomplete or invalid");
  }

  await client.send(
    new CompleteMultipartUploadCommand({
      Bucket: process.env.B2_BUCKET.trim(),
      Key: key,
      UploadId: uploadId,

      MultipartUpload: {
        Parts: normalized
      }
    })
  );

  return `b2://${key}`;
}

// Abort multipart upload
async function abortMultipartVideo(key, uploadId) {
  checkB2();

  await client.send(
    new AbortMultipartUploadCommand({
      Bucket: process.env.B2_BUCKET.trim(),
      Key: key,
      UploadId: uploadId
    })
  );
}

// Generate private video signed URL
async function getSignedVideoUrl(fileKey, expiresIn = 86400) {
  checkB2();

  if (!fileKey || typeof fileKey !== "string") {
    throw new Error("B2 file key is missing");
  }

  const key = fileKey.startsWith("b2://")
    ? fileKey.slice(5)
    : fileKey;

  if (!key || key.startsWith("/")) {
    throw new Error("Invalid B2 file key");
  }

  const command = new GetObjectCommand({
    Bucket: process.env.B2_BUCKET.trim(),
    Key: key
  });

  return getSignedUrl(client, command, { expiresIn });
}

// Export functions
module.exports = {
  uploadVideo,
  getSignedVideoUrl,
  createMultipartVideo,
  signMultipartPart,
  listMultipartParts,
  completeMultipartVideo,
  abortMultipartVideo,

  b2Enabled: enabled,
  b2Missing: missing,
  b2ConfigError: configError,
  b2Endpoint: endpoint,
  b2Region: region
};

// Configuration status
console.log("B2 Enabled:", enabled);
console.log("B2 Endpoint:", endpoint || "NOT CONFIGURED");
console.log("B2 Region:", region || "NOT CONFIGURED");

if (missing.length || configProblems.length) {
  console.error("B2 Configuration Problems:", {
    missing,
    configProblems
  });
}
