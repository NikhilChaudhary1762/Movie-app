
const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");

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

router.post("/", createEpisode);
router.put("/:id", updateEpisode);
router.delete("/:id", deleteEpisode);

module.exports = router;
