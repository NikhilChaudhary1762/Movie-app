
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
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
  })
);

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
