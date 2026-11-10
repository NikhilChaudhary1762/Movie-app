
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const fsp = require("fs/promises");
const crypto = require("crypto");
const os = require("os");
const jwt = require("jsonwebtoken");
const protect = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");

const { uploadVideo, createMultipartVideo, signMultipartPart, listMultipartParts, completeMultipartVideo, abortMultipartVideo, b2Enabled, b2Missing, b2ConfigError, b2Endpoint, b2Region } = require("../config/b2Storage");
const cloudinary = require("../config/cloudinary");

const router = express.Router();

// Every upload operation (including signing B2 part URLs) is admin-only.
router.use(protect, admin);

function issueMultipartToken(session) {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not configured");
  return jwt.sign(
    { purpose: "movieflex-b2-multipart", ...session },
    process.env.JWT_SECRET,
    { expiresIn: "7d", issuer: "movieflex-api", audience: "movieflex-upload" }
  );
}

function readMultipartToken(req) {
  const token = req.body?.sessionToken || req.headers["x-multipart-session"];
  if (!token || !process.env.JWT_SECRET) throw new Error("Valid multipart session token is required");
  const session = jwt.verify(token, process.env.JWT_SECRET, {
    issuer: "movieflex-api",
    audience: "movieflex-upload"
  });
  if (session.purpose !== "movieflex-b2-multipart" ||
      String(session.userId || "") !== String(req.user?._id || "") ||
      typeof session.key !== "string" || !session.key.startsWith("videos/") ||
      typeof session.uploadId !== "string" || !session.uploadId ||
      !Number.isSafeInteger(session.size) || !Number.isSafeInteger(session.totalParts) ||
      !Number.isSafeInteger(session.partSize)) {
    throw new Error("Invalid multipart session token");
  }
  return session;
}

/* ================= CONFIG ================= */

const TEMP_DIR = path.resolve(
  process.env.UPLOAD_TEMP_DIR || path.join(os.tmpdir(), "movieflex-uploads")
);

const CHUNK_DIR = path.join(TEMP_DIR, "chunks");

const CHUNK_SIZE = Number(
  process.env.UPLOAD_CHUNK_SIZE || 8 * 1024 * 1024
);

const MAX_VIDEO_SIZE = Number(
  process.env.MAX_VIDEO_SIZE || 53687091200
);

const ALLOWED_FORMATS = [
  ".mp4", ".mkv", ".mov", ".avi", ".webm",
  ".wmv", ".mpeg", ".mpg", ".3gp", ".m4v",
  ".flv", ".ts", ".ogv", ".m2ts", ".mts",
  ".vob", ".divx", ".xvid"
];

fs.mkdirSync(TEMP_DIR, { recursive: true });
fs.mkdirSync(CHUNK_DIR, { recursive: true });

/* ================= HELPERS ================= */

function isValidUploadId(id) {
  return /^[a-f0-9-]{20,80}$/i.test(id || "");
}

function getUploadDir(uploadId) {
  if (!isValidUploadId(uploadId)) {
    throw new Error("Invalid upload ID");
  }

  return path.join(CHUNK_DIR, uploadId);
}

function getMetaPath(uploadId) {
  return path.join(getUploadDir(uploadId), "meta.json");
}

async function getMeta(uploadId) {
  try {
    return JSON.parse(
      await fsp.readFile(getMetaPath(uploadId), "utf8")
    );
  } catch {
    return null;
  }
}

function getTotalChunks(meta) {
  return Math.ceil(meta.size / meta.chunkSize);
}

function getExpectedChunkSize(meta, index) {
  return Math.min(
    meta.chunkSize,
    meta.size - index * meta.chunkSize
  );
}

/* ================= MULTER ================= */

const videoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, TEMP_DIR),

  filename: (_req, file, cb) => {
    cb(
      null,
      crypto.randomUUID() +
        path.extname(file.originalname).toLowerCase()
    );
  }
});

const videoUpload = multer({
  storage: videoStorage,
  limits: {
    fileSize: MAX_VIDEO_SIZE,
    files: 1
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    if (ALLOWED_FORMATS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported video format"));
    }
  }
});

const chunkStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    try {
      const dir = getUploadDir(req.params.uploadId);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    } catch (error) {
      cb(error);
    }
  },

  filename: (req, _file, cb) => {
    cb(null, `${req.params.index}.part`);
  }
});

const chunkUpload = multer({
  storage: chunkStorage,
  limits: {
    fileSize: CHUNK_SIZE,
    files: 1
  }
});

/* ================= DIRECT-TO-B2 MULTIPART UPLOAD ================= */
// Video chunks are PUT directly from the browser to Backblaze. Render Free
// handles only small JSON requests and signed URL generation, never video bytes.
const multipartSessions = new Map(); // informational in-memory cache; client also persists session details

router.post("/multipart/init", async (req, res) => {
  try {
    const { name, size, type } = req.body || {};
    const fileSize = Number(size);
    const ext = path.extname(String(name || '')).toLowerCase();
    if (!name || !Number.isSafeInteger(fileSize) || fileSize <= 0 || fileSize > MAX_VIDEO_SIZE) return res.status(400).json({ success:false, message:"Invalid filename or video size" });
    if (!ALLOWED_FORMATS.includes(ext)) return res.status(400).json({ success:false, message:"Unsupported video format" });
    const partSize = Math.max(8 * 1024 * 1024, CHUNK_SIZE); // S3 multipart minimum is 5 MiB (except final part)
    const totalParts = Math.ceil(fileSize / partSize);
    if (totalParts > 10000) return res.status(400).json({ success:false, message:"Video requires more than 10,000 parts; increase UPLOAD_CHUNK_SIZE" });
    const session = await createMultipartVideo(name, type || "application/octet-stream");
    const claims = { ...session, name: String(name), size: fileSize, partSize, totalParts };
    const sessionToken = issueMultipartToken({ ...claims, userId: String(req.user._id) });
    multipartSessions.set(session.uploadId, { ...claims, createdAt:Date.now() });
    return res.status(201).json({ success:true, ...session, name, size:fileSize, partSize, totalParts, sessionToken });
  } catch (error) {
    console.error("B2 multipart init error:", error);
    return res.status(500).json({ success:false, message:error.message || "Unable to start direct B2 upload" });
  }
});

router.post("/multipart/part-url", async (req, res) => {
  try {
    const session = readMultipartToken(req);
    const number = Number(req.body?.partNumber);
    if (req.body?.key !== session.key || req.body?.uploadId !== session.uploadId ||
        !Number.isInteger(number) || number < 1 || number > session.totalParts) {
      return res.status(400).json({ success:false, message:"Invalid multipart session or part number" });
    }
    const url = await signMultipartPart(session.key, session.uploadId, number);
    return res.json({ success:true, url, partNumber:number });
  } catch (error) {
    console.error("B2 multipart sign error:", error);
    return res.status(401).json({ success:false, message:error.message || "Unable to sign upload part" });
  }
});

router.get("/multipart/:uploadId/status", async (req, res) => {
  try {
    const session = readMultipartToken(req);
    if (req.params.uploadId !== session.uploadId || req.query.key !== session.key) {
      return res.status(403).json({ success:false, message:"Multipart session does not match" });
    }
    const parts = await listMultipartParts(session.key, session.uploadId);
    return res.json({ success:true, parts });
  } catch (error) {
    console.error("B2 multipart status error:", error);
    return res.status(401).json({ success:false, message:error.message || "Unable to read uploaded parts" });
  }
});

router.post("/multipart/complete", async (req, res) => {
  try {
    const session = readMultipartToken(req);
    const { key, uploadId, parts, name, size } = req.body || {};
    if (key !== session.key || uploadId !== session.uploadId ||
        Number(size) !== session.size || String(name || "") !== session.name ||
        !Array.isArray(parts) || parts.length !== session.totalParts) {
      return res.status(400).json({ success:false, message:"Multipart completion details do not match the upload session" });
    }
    const storedParts = await listMultipartParts(session.key, session.uploadId);
    const uploaded = new Map(storedParts.map(p => [Number(p.PartNumber), p]));
    const requested = parts.map(p => ({ PartNumber:Number(p.PartNumber), ETag:p.ETag }));
    if (requested.length !== session.totalParts) {
      return res.status(409).json({ success:false, message:"Not all video parts have been uploaded" });
    }
    for (let index = 0; index < session.totalParts; index++) {
      const part = requested[index];
      const expectedNumber = index + 1;
      const actual = uploaded.get(expectedNumber);
      if (!part || part.PartNumber !== expectedNumber || !actual || actual.ETag !== part.ETag) {
        return res.status(409).json({ success:false, message:`Part ${expectedNumber} is missing or its ETag does not match` });
      }
    }
    const videoUrl = await completeMultipartVideo(session.key, session.uploadId, requested);
    multipartSessions.delete(session.uploadId);
    return res.status(201).json({ success:true, message:"Video uploaded directly to Backblaze B2", filename:session.name, size:session.size, videoUrl, watchUrl:videoUrl, downloadUrl:videoUrl });
  } catch (error) {
    console.error("B2 multipart completion error:", error);
    return res.status(401).json({ success:false, message:error.message || "Multipart completion failed" });
  }
});

router.delete("/multipart/:uploadId", async (req, res) => {
  try {
    const session = readMultipartToken(req);
    if (req.params.uploadId !== session.uploadId || req.query.key !== session.key) {
      return res.status(403).json({ success:false, message:"Multipart session does not match" });
    }
    await abortMultipartVideo(session.key, session.uploadId);
    multipartSessions.delete(session.uploadId);
    return res.json({ success:true, message:"Multipart upload cancelled" });
  } catch (error) {
    return res.status(401).json({ success:false, message:error.message || "Unable to cancel multipart upload" });
  }
});

/* ================= CHUNK INIT ================= */

// POST /api/upload/chunk/init

router.post("/chunk/init", async (req, res) => {
  try {
    const { uploadId, name, size, type } = req.body || {};

    if (!name || !Number.isFinite(Number(size))) {
      return res.status(400).json({
        success: false,
        message: "Invalid file name or size"
      });
    }

    const fileSize = Number(size);

    if (fileSize <= 0 || fileSize > MAX_VIDEO_SIZE) {
      return res.status(400).json({
        success: false,
        message: "Video size exceeds allowed limit"
      });
    }

    const ext = path.extname(name).toLowerCase();

    if (!ALLOWED_FORMATS.includes(ext)) {
      return res.status(400).json({
        success: false,
        message: "Unsupported video format"
      });
    }

    const id = uploadId || crypto.randomUUID();
    const dir = getUploadDir(id);

    await fsp.mkdir(dir, { recursive: true });

    let meta = await getMeta(id);

    if (meta) {
      if (
        meta.name !== name ||
        meta.size !== fileSize
      ) {
        return res.status(409).json({
          success: false,
          message: "Upload ID belongs to another file"
        });
      }
    } else {
      meta = {
        uploadId: id,
        name,
        size: fileSize,
        type: type || "video/*",
        chunkSize: CHUNK_SIZE,
        createdAt: new Date().toISOString()
      };

      await fsp.writeFile(
        getMetaPath(id),
        JSON.stringify(meta, null, 2)
      );
    }

    const receivedChunks = [];

    for (let i = 0; i < getTotalChunks(meta); i++) {
      const chunkPath = path.join(dir, `${i}.part`);

      if (fs.existsSync(chunkPath)) {
        receivedChunks.push(i);
      }
    }

    return res.json({
      success: true,
      uploadId: id,
      chunkSize: meta.chunkSize,
      totalChunks: getTotalChunks(meta),
      receivedChunks
    });
  } catch (error) {
    console.error("Chunk init error:", error);

    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/* ================= CHUNK STATUS ================= */

// GET /api/upload/chunk/:uploadId/status

router.get("/chunk/:uploadId/status", async (req, res) => {
  try {
    const meta = await getMeta(req.params.uploadId);

    if (!meta) {
      return res.status(404).json({
        success: false,
        message: "Upload session not found"
      });
    }

    const dir = getUploadDir(req.params.uploadId);
    const receivedChunks = [];

    for (let i = 0; i < getTotalChunks(meta); i++) {
      if (fs.existsSync(path.join(dir, `${i}.part`))) {
        receivedChunks.push(i);
      }
    }

    return res.json({
      success: true,
      uploadId: req.params.uploadId,
      chunkSize: meta.chunkSize,
      totalChunks: getTotalChunks(meta),
      receivedChunks
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/* ================= CHUNK UPLOAD ================= */

// POST /api/upload/chunk/:uploadId/:index

router.post("/chunk/:uploadId/:index", (req, res, next) => {
  const { uploadId, index } = req.params;

  // Let the dedicated /complete endpoint below handle this reserved word.
  if (index === "complete") return next();

  // IMPORTANT: Correct digit validation regex
  if (
    !isValidUploadId(uploadId) ||
    !/^\d+$/.test(index)
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid upload ID or chunk index"
    });
  }

  // Check the session before Multer writes a chunk to disk. A missing
  // session usually means the Render instance restarted or its temp disk
  // was lost; return a clear response instead of creating orphaned chunks.
  getMeta(uploadId).then((sessionMeta) => {
    if (!sessionMeta) {
      return res.status(404).json({
        success: false,
        code: "UPLOAD_SESSION_NOT_FOUND",
        message: "Upload session not found. Start the upload again."
      });
    }

    chunkUpload.single("chunk")(req, res, async (error) => {
    if (error) {
      return res.status(
        error.code === "LIMIT_FILE_SIZE" ? 413 : 400
      ).json({
        success: false,
        message: error.message
      });
    }

    try {
      const meta = await getMeta(uploadId);

      if (!meta) {
        return res.status(404).json({
          success: false,
          message: "Upload session not found"
        });
      }

      const chunkIndex = Number(index);
      const totalChunks = getTotalChunks(meta);

      if (
        !Number.isSafeInteger(chunkIndex) ||
        chunkIndex < 0 ||
        chunkIndex >= totalChunks
      ) {
        return res.status(400).json({
          success: false,
          message: "Chunk index out of range"
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Chunk file missing. FormData field must be 'chunk'"
        });
      }

      const expectedSize = getExpectedChunkSize(
        meta,
        chunkIndex
      );

      if (req.file.size !== expectedSize) {
        await fsp.unlink(req.file.path).catch(() => {});

        return res.status(400).json({
          success: false,
          message: "Invalid chunk size",
          expectedSize,
          actualSize: req.file.size,
          chunkIndex
        });
      }

      return res.json({
        success: true,
        message: "Chunk uploaded successfully",
        uploadId,
        index: chunkIndex,
        received: true
      });
    } catch (error) {
      console.error("Chunk upload error:", error);

      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    });
  }).catch((error) => {
    console.error("Chunk session lookup error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to verify upload session"
    });
  });
});

/* ================= CHUNK COMPLETE ================= */

// POST /api/upload/chunk/:uploadId/complete

router.post("/chunk/:uploadId/complete", async (req, res) => {
  let mergedFile = null;

  try {
    const uploadId = req.params.uploadId;
    const meta = await getMeta(uploadId);

    if (!meta) {
      return res.status(404).json({
        success: false,
        message: "Upload session not found"
      });
    }

    const dir = getUploadDir(uploadId);
    const totalChunks = getTotalChunks(meta);

    // Check missing chunks
    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = path.join(dir, `${i}.part`);

      if (!fs.existsSync(chunkPath)) {
        return res.status(409).json({
          success: false,
          message: `Missing chunk ${i}`,
          missingChunk: i
        });
      }
    }

    mergedFile = path.join(
      TEMP_DIR,
      `${uploadId}${path.extname(meta.name).toLowerCase()}`
    );

    // Merge chunks sequentially. Waiting for each append to finish avoids
    // stream race conditions that can produce a truncated merged video.
    await fsp.writeFile(mergedFile, Buffer.alloc(0));
    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = path.join(dir, `${i}.part`);
      const chunkBuffer = await fsp.readFile(chunkPath);
      await fsp.appendFile(mergedFile, chunkBuffer);
    }

    const mergedStat = await fsp.stat(mergedFile);

    if (mergedStat.size !== meta.size) {
      throw new Error("Merged video size mismatch");
    }

    // Upload merged video to Backblaze B2
    const videoUrl = await uploadVideo(
      mergedFile,
      meta.name
    );

    // Cleanup after successful B2 upload
    await fsp.rm(dir, {
      recursive: true,
      force: true
    });

    return res.status(201).json({
      success: true,
      message: "Video uploaded successfully to B2",
      filename: meta.name,
      size: meta.size,
      videoUrl,
      watchUrl: videoUrl,
      downloadUrl: videoUrl
    });
  } catch (error) {
    console.error("Chunk completion error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Chunk completion failed",
      hint: /Backblaze B2 is not configured|B2_ENDPOINT|B2_REGION/i.test(error.message || "")
        ? "Check B2_ENDPOINT, B2_REGION, B2_KEY_ID, B2_APPLICATION_KEY and B2_BUCKET in Render Environment."
        : undefined
    });
  } finally {
    if (mergedFile) {
      await fsp.unlink(mergedFile).catch(() => {});
    }
  }
});

/* ================= CANCEL UPLOAD ================= */

// DELETE /api/upload/chunk/:uploadId

router.delete("/chunk/:uploadId", async (req, res) => {
  try {
    const dir = getUploadDir(req.params.uploadId);

    await fsp.rm(dir, {
      recursive: true,
      force: true
    });

    return res.json({
      success: true,
      message: "Upload session cancelled"
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/* ================= NORMAL UPLOAD ================= */

async function uploadNormalVideo(req, res) {
  let filePath;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Video file is required"
      });
    }

    filePath = req.file.path;

    const videoUrl = await uploadVideo(
      filePath,
      req.file.originalname
    );

    return res.status(201).json({
      success: true,
      message: "Video uploaded successfully",
      filename: req.file.originalname,
      size: req.file.size,
      videoUrl,
      watchUrl: videoUrl,
      downloadUrl: videoUrl
    });
  } catch (error) {
    console.error("Normal upload error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Video upload failed"
    });
  } finally {
    if (filePath) {
      await fsp.unlink(filePath).catch(() => {});
    }
  }
}

router.post(
  "/movie",
  videoUpload.single("video"),
  uploadNormalVideo
);

router.post(
  "/episode",
  videoUpload.single("video"),
  uploadNormalVideo
);

/* ================= ADMIN IMAGE UPLOAD ================= */

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif|avif)$/.test(file.mimetype)) return cb(null, true);
    cb(new Error("Only JPG, PNG, WEBP, GIF and AVIF images are allowed"));
  }
});

router.post("/", imageUpload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success:false, message:"Image file is required" });
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return res.status(503).json({ success:false, message:"Image storage is not configured. Set Cloudinary environment variables." });
    }
    const uploaded = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder:"movieflex/series", resource_type:"image", transformation:[{ quality:"auto", fetch_format:"auto" }] },
        (error, result) => error ? reject(error) : resolve(result)
      );
      stream.end(req.file.buffer);
    });
    return res.status(201).json({ success:true, url:uploaded.secure_url, fileUrl:uploaded.secure_url, publicId:uploaded.public_id });
  } catch (error) {
    console.error("Admin image upload error:", error);
    return res.status(500).json({ success:false, message:error.message || "Image upload failed" });
  }
});

/* ================= STATUS ================= */

router.get("/status", (_req, res) => {
  res.json({
    success: true,
    storage: b2Enabled ? "Backblaze B2 Private (direct multipart browser upload supported)" : "Not configured",
    directMultipartUpload: b2Enabled,
    b2Configured: b2Enabled,
    missingEnvironmentVariables: b2Missing,
    region: b2Region || null,
    endpoint: b2Endpoint || process.env.B2_ENDPOINT || null,
    configurationError: b2ConfigError || null,
    bucketConfigured: Boolean(process.env.B2_BUCKET),
    chunkSize: CHUNK_SIZE,
    maxVideoSize: MAX_VIDEO_SIZE
  });
});

/* ================= ERROR HANDLER ================= */

router.use((error, _req, res, _next) => {
  console.error("Upload route error:", error);

  if (error instanceof multer.MulterError) {
    return res.status(
      error.code === "LIMIT_FILE_SIZE" ? 413 : 400
    ).json({
      success: false,
      message: error.message
    });
  }

  return res.status(400).json({
    success: false,
    message: error.message || "Upload request failed"
  });
});

module.exports = router;
