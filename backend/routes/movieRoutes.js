
const express = require('express')
const router = express.Router()

const {
  getMovies,
  getMovieById,
  getMovieAccess,
  createMovie,
  deleteMovie,
  updateMovie
} = require("../controllers/movieController");

// Correct Middleware Import
const protect = require('../middleware/authMiddleware')
const admin = require('../middleware/adminMiddleware')
const upload = require("../middleware/upload");

// Public metadata routes (media URLs are intentionally withheld)
router.get('/', getMovies)
router.get('/:id/access', protect, getMovieAccess)
router.get('/:id', getMovieById)

// Admin Routes
router.post('/', protect, admin, createMovie)
router.delete('/:id', protect, admin, deleteMovie)
router.put("/:id", protect, admin, updateMovie);
router.post("/", protect, admin, upload.single("video"), createMovie);

module.exports = router
