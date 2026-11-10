
const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");

const {
  getAllEpisodes,
  getEpisodeById,
  createEpisode,
  updateEpisode,
  deleteEpisode,
  getEpisodesBySeriesAndSeason,
} = require("../controllers/episodeController");

// IMPORTANT: Specific route first
router.get(
  "/series/:seriesId/season/:seasonNumber",
  getEpisodesBySeriesAndSeason
);

router.get("/", getAllEpisodes);
router.get("/:id", protect, getEpisodeById);

router.post("/", protect, admin, createEpisode);
router.put("/:id", protect, admin, updateEpisode);
router.delete("/:id", protect, admin, deleteEpisode);

module.exports = router;
