
const Episode = require("../models/Episode");
const { getSignedVideoUrl } = require("../config/b2Storage");

// GET EPISODES BY SERIES AND SEASON
const getEpisodesBySeriesAndSeason = async (req, res) => {
  try {
    const { seriesId, seasonNumber } = req.params;

    const episodes = await Episode.find({
      series: seriesId,
      seasonNumber: Number(seasonNumber),
    }).select('-videoUrl').sort({ episodeNumber: 1 });

    res.status(200).json({
      success: true,
      count: episodes.length,
      episodes,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  // Existing exports ko preserve karo
  getEpisodesBySeriesAndSeason,
};


const getAllEpisodes = async (req, res) => {
  try {
    const episodes = await Episode.find()
      .select('-videoUrl')
      .populate("series", "title")
      .sort({ seasonNumber: 1, episodeNumber: 1 });

    res.status(200).json({
      success: true,
      episodes,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getEpisodeById = async (req, res) => {
  try {
    const episode = await Episode.findById(req.params.id)
      .populate("series", "title");

    if (!episode) {
      return res.status(404).json({
        success: false,
        message: "Episode not found",
      });
    }

    const episodeData = episode.toObject();
    if (episodeData.videoUrl && episodeData.videoUrl.startsWith("b2://")) {
      episodeData.videoUrl = await getSignedVideoUrl(episodeData.videoUrl);
    }
    if (episodeData.downloadUrl && episodeData.downloadUrl.startsWith("b2://")) {
      episodeData.downloadUrl = await getSignedVideoUrl(episodeData.downloadUrl, 3600);
    }
    res.json({ success: true, episode: episodeData });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const createEpisode = async (req, res) => {
  try {
    if (!req.body?.videoUrl || typeof req.body.videoUrl !== "string" || !req.body.videoUrl.trim()) {
      return res.status(400).json({ success: false, message: "Upload the episode video first. Video URL is missing." });
    }
    const episode = await Episode.create({ ...req.body, videoUrl: req.body.videoUrl.trim() });

    res.status(201).json({
      success: true,
      message: "Episode added successfully",
      episode,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const updateEpisode = async (req, res) => {
  try {
    if (req.body?.videoUrl !== undefined && typeof req.body.videoUrl !== "string") {
      return res.status(400).json({ success: false, message: "Invalid episode video URL" });
    }
    const episode = await Episode.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!episode) {
      return res.status(404).json({
        success: false,
        message: "Episode not found",
      });
    }

    res.json({
      success: true,
      message: "Episode updated successfully",
      episode,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteEpisode = async (req, res) => {
  try {
    const episode = await Episode.findByIdAndDelete(req.params.id);

    if (!episode) {
      return res.status(404).json({
        success: false,
        message: "Episode not found",
      });
    }

    res.json({
      success: true,
      message: "Episode deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getAllEpisodes,
  getEpisodeById,
  createEpisode,
  updateEpisode,
  deleteEpisode,
  getEpisodesBySeriesAndSeason,
};
