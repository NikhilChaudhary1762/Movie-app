
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

// ===============================
// UPLOAD DIRECTORY
// ===============================
const uploadDir = path.join(__dirname, "../uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ===============================
// ALLOWED VIDEO FORMATS
// ===============================
const allowedFormats = [
  ".mp4",
  ".mkv",
  ".mov",
  ".avi",
  ".webm",
  ".wmv",
  ".mpeg",
  ".mpg",
  ".3gp",
  ".m4v",
  ".flv",
  ".ts",
  ".ogv",
];

// ===============================
// STORAGE
// ===============================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    const uniqueName =
      Date.now() + "-" + Math.round(Math.random() * 1e9) + ext;

    cb(null, uniqueName);
  },
});

// ===============================
// FILE FILTER
// ===============================
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedFormats.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Unsupported video format"));
  }
};

// ===============================
// MULTER CONFIGURATION
// ===============================
const upload = multer({
  storage,
  fileFilter,

  limits: {
    fileSize: 20 * 1024 * 1024 * 1024, // 20 GB
    files: 1,
  },
});

// ===============================
// UPLOAD MOVIE
// ===============================
router.post("/movie", upload.single("video"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please select a video",
      });
    }

    const watchUrl =
      `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;

    res.status(201).json({
      success: true,
      message: "Video uploaded successfully",
      filename: req.file.filename,
      watchUrl,
      size: req.file.size,
    });
  } catch (error) {
    console.error("Upload error:", error.message);

    res.status(500).json({
      success: false,
      message: "Video upload failed",
    });
  }
});

// ===============================
// MULTER ERROR HANDLING
// ===============================
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        success: false,
        message: "Video size exceeds 20 GB limit",
      });
    }

    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  next();
});

module.exports = router;
