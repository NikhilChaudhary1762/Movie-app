
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const movieRoutes = require("./routes/movieRoutes");
const healthRoutes = require("./routes/healthRoutes");
const watchlistRoutes = require("./routes/watchlistRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const seriesRoutes = require("./routes/seriesRoutes");
const episodeRoutes = require("./routes/episodeRoutes");

const app = express();

// ===============================
// CORS
// ===============================

// FRONTEND_URL and ALLOWED_ORIGINS may contain comma-separated origins.
// Keep stable production origins here and allow this project's Vercel previews.
const allowedOrigins = [
  "http://localhost:5173",
  "https://movieflex98.onrender.com",
  "https://movieflex99.onrender.com",
  ...(process.env.FRONTEND_URL || "").split(",").map((value) => value.trim().replace(/\/+$/, "")).filter(Boolean),
  ...(process.env.ALLOWED_ORIGINS || "").split(",").map((value) => value.trim().replace(/\/+$/, "")).filter(Boolean),
];

// Example: https://movie-app99-<deployment-id>-nikhilchaudhary1762.vercel.app
const vercelPreviewOrigin = /^https:\/\/(?:movie-app99|movie)-[a-z0-9-]+-nikhilchaudhary1762\.vercel\.app$/i;

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || vercelPreviewOrigin.test(origin)) {
      return callback(null, true);
    }

    console.error("CORS rejected origin:", origin);
    return callback(new Error(`CORS origin not allowed: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Range", "X-Multipart-Session"],
  exposedHeaders: [
    "Content-Length",
    "Content-Range",
    "Accept-Ranges",
    "Content-Type",
  ],
  optionsSuccessStatus: 204,
  maxAge: 86400,
};

// Register CORS before body parsers and every API route so preflight,
// JSON/API requests, multipart uploads, and video Range requests share policy.
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

// ===============================
// BODY PARSER
// ===============================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===============================
// STATIC VIDEO UPLOADS
// ===============================
const uploadDir = path.join(__dirname, "uploads");

app.use("/uploads", express.static(uploadDir));

// ===============================
// API ROUTES
// ===============================
app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/movies", movieRoutes);
app.use("/api/watchlist", watchlistRoutes);
app.use("/api/series", seriesRoutes);
app.use("/api/episodes", episodeRoutes);

// Movie video upload
app.use("/api/upload", uploadRoutes);

// ===============================
// HOME ROUTE
// ===============================
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to MovieFlex API",
  });
});

// ===============================
// MULTER ERROR HANDLER
// ===============================
app.use((err, req, res, next) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      success: false,
      message: "Video exceeds the maximum upload size",
    });
  }

  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message || "Something went wrong",
    });
  }

  next();
});

// ===============================
// 404 ROUTE
// ===============================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found",
  });
});

// ===============================
// SERVER START
// ===============================
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`MovieFlex server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup error:", error.message);
    process.exit(1);
  }
};

startServer();
