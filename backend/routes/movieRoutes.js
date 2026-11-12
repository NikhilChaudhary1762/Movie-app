const express = require("express");
const router = express.Router();

const {
  getMovies,
  getMovieById,
  getMovieAccess,
  createMovie,
  deleteMovie,
  updateMovie
} = require("../controllers/movieController");

const protect = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");
const streamAuth = require("../middleware/streamAuth");
const { streamMovie } = require("../controllers/mediaStreamController");

router.get("/", getMovies);
router.get("/:id/stream", streamAuth, streamMovie);
router.get("/:id/access", protect, getMovieAccess);
router.get("/:id", getMovieById);

router.post("/", protect, admin, createMovie);
router.delete("/:id", protect, admin, deleteMovie);
router.put("/:id", protect, admin, updateMovie);

module.exports = router;
