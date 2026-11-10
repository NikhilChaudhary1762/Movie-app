
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const fsp = require("fs/promises");
const crypto = require("crypto");

const { uploadVideo, b2Enabled, b2Missing, b2ConfigError, b2Endpoint, b2Region } = require("../config/b2Storage");

const router = express.Router();

/* ================= CONFIG ================= */

const TEMP_DIR = path.resolve(
  process.env.UPLOAD_TEMP_DIR || path.join(__dirname, "../temp-uploads")
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
      message: error.message || "Chunk completion failed"
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

/* ================= STATUS ================= */

router.get("/status", (_req, res) => {
  res.json({
    success: true,
    storage: b2Enabled ? "Backblaze B2 Private" : "Not configured",
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
