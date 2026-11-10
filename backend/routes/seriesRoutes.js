const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");

const {
  getAllSeries,
  getSeriesById,
  createSeries,
  updateSeries,
  deleteSeries,
} = require("../controllers/seriesController");

// Public catalogue; writes are administrator-only.
router.get("/", getAllSeries);
router.get("/:id", getSeriesById);
router.post("/", protect, admin, createSeries);
router.put("/:id", protect, admin, updateSeries);
router.delete("/:id", protect, admin, deleteSeries);

module.exports = router;
