const mongoose = require("mongoose");
const Episode = require("../models/Episode");
const { getSignedVideoUrl } = require("../config/b2Storage");

const getEpisodesBySeriesAndSeason = async (req, res) => {
  try {
    const { seriesId, seasonNumber } = req.params;
    if (!mongoose.Types.ObjectId.isValid(seriesId)) {
      return res.status(400).json({ success: false, message: "Invalid series ID" });
    }
    const episodes = await Episode.find({
      series: seriesId,
      seasonNumber: Number(seasonNumber),
    }).select("-videoUrl -downloadUrl").sort({ episodeNumber: 1 });
    return res.status(200).json({ success: true, count: episodes.length, episodes });
  } catch (error) {
    console.error("Get episodes by season failed:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getAllEpisodes = async (_req, res) => {
  try {
    const episodes = await Episode.find()
      .select("-videoUrl -downloadUrl")
      .populate("series", "title")
      .sort({ seasonNumber: 1, episodeNumber: 1 });
    return res.status(200).json({ success: true, episodes });
  } catch (error) {
    console.error("Get all episodes failed:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getEpisodeById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, code: "INVALID_EPISODE_ID", message: "Invalid episode ID" });
    }
    const episode = await Episode.findById(id).populate("series", "title");
    if (!episode) {
      return res.status(404).json({ success: false, code: "EPISODE_NOT_FOUND", message: "Episode not found in database" });
    }

    const data = episode.toObject();
    if (!data.videoUrl) {
      return res.status(409).json({ success: false, code: "EPISODE_VIDEO_MISSING", message: "Episode record exists, but no video file key is saved. Upload the video and click Save Episode." });
    }
    data.videoUrl = await getSignedVideoUrl(data.videoUrl);
    data.downloadUrl = data.videoUrl;
    return res.status(200).json({ success: true, episode: data });
  } catch (error) {
    console.error("Episode playback URL generation failed:", {
      message: error.message,
      code: error.Code || error.code,
      name: error.name,
      requestId: error.$metadata?.requestId,
    });
    return res.status(502).json({
      success: false,
      code: "VIDEO_URL_GENERATION_FAILED",
      message: `Could not generate private B2 playback URL: ${error.message}`,
    });
  }
};

const createEpisode = async (req, res) => {
  try {
    const payload = { ...req.body };
    if (typeof payload.videoUrl === "string") payload.videoUrl = payload.videoUrl.trim();
    if (!payload.videoUrl) {
      return res.status(400).json({ success: false, code: "VIDEO_KEY_REQUIRED", message: "Upload the episode video first; the B2 file key is missing." });
    }
    const episode = await Episode.create(payload);
    return res.status(201).json({ success: true, message: "Episode added successfully", episode });
  } catch (error) {
    console.error("Create episode failed:", error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

const updateEpisode = async (req, res) => {
  try {
    const payload = { ...req.body };
    if (!payload.videoUrl) delete payload.videoUrl;
    if (!payload.downloadUrl) delete payload.downloadUrl;
    const episode = await Episode.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    if (!episode) return res.status(404).json({ success: false, message: "Episode not found" });
    return res.json({ success: true, message: "Episode updated successfully", episode });
  } catch (error) {
    console.error("Update episode failed:", error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

const deleteEpisode = async (req, res) => {
  try {
    const episode = await Episode.findByIdAndDelete(req.params.id);
    if (!episode) return res.status(404).json({ success: false, message: "Episode not found" });
    return res.json({ success: true, message: "Episode deleted successfully" });
  } catch (error) {
    console.error("Delete episode failed:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getAllEpisodes, getEpisodeById, createEpisode, updateEpisode, deleteEpisode, getEpisodesBySeriesAndSeason };
