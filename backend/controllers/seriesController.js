
const Series = require("../models/Series");

// Get all series
exports.getAllSeries = async (req, res) => {
  try {
    const series = await Series.find().sort({ createdAt: -1 });
    res.json({ success: true, series });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single series
exports.getSeriesById = async (req, res) => {
  try {
    const series = await Series.findById(req.params.id);

    if (!series) {
      return res.status(404).json({
        success: false,
        message: "Series not found",
      });
    }

    res.json({ success: true, series });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create series
exports.createSeries = async (req, res) => {
  try {
    const series = await Series.create(req.body);

    res.status(201).json({
      success: true,
      message: "Series created successfully",
      series,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Update series
exports.updateSeries = async (req, res) => {
  try {
    const series = await Series.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!series) {
      return res.status(404).json({ message: "Series not found" });
    }

    res.json({ success: true, series });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Delete series
exports.deleteSeries = async (req, res) => {
  try {
    const series = await Series.findByIdAndDelete(req.params.id);

    if (!series) {
      return res.status(404).json({ message: "Series not found" });
    }

    res.json({ success: true, message: "Series deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
