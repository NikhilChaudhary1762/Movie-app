const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");
const streamAuth = require("../middleware/streamAuth");
const { streamEpisode } = require("../controllers/mediaStreamController");

const {
  getAllEpisodes,
  getEpisodeById,
  createEpisode,
  updateEpisode,
  deleteEpisode,
  getEpisodesBySeriesAndSeason,
} = require("../controllers/episodeController");

router.get("/:id/stream", streamAuth, streamEpisode);

// Episode media URLs are signed; require a logged-in user to retrieve them.
router.get("/series/:seriesId/season/:seasonNumber", protect, getEpisodesBySeriesAndSeason);
router.get("/", protect, admin, getAllEpisodes);
router.get("/:id", protect, getEpisodeById);

// Only administrators may create, edit, or delete episodes.
router.post("/", protect, admin, createEpisode);
router.put("/:id", protect, admin, updateEpisode);
router.delete("/:id", protect, admin, deleteEpisode);

module.exports = router;
