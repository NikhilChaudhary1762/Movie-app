
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Upload folder
const uploadDir = path.join(__dirname, "../uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Allowed video formats
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
  ".ogv"
];

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName =
      Date.now() + "-" + Math.round(Math.random() * 1e9) + ext;

    cb(null, uniqueName);
  }
});

// Multer configuration
const upload = multer({
  storage,

  limits: {
    fileSize: 20 * 1024 * 1024 * 1024, // 20 GB
    files: 1
  },

  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedFormats.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported video format"));
    }
  }
});

module.exports = upload;
