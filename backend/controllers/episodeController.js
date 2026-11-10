const Episode = require("../models/Episode");
const { getSignedVideoUrl } = require("../config/b2Storage");

const getEpisodesBySeriesAndSeason = async (req, res) => {
  try {
    const { seriesId, seasonNumber } = req.params;
    const episodes = await Episode.find({
      series: seriesId,
      seasonNumber: Number(seasonNumber),
    }).select("-videoUrl -downloadUrl").sort({ episodeNumber: 1 });
    res.status(200).json({ success: true, count: episodes.length, episodes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAllEpisodes = async (req, res) => {
  try {
    const episodes = await Episode.find()
      .select("-videoUrl -downloadUrl")
      .populate("series", "title")
      .sort({ seasonNumber: 1, episodeNumber: 1 });
    res.status(200).json({ success: true, episodes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Authenticated playback endpoint: converts private B2 object key to a short-lived URL.
const getEpisodeById = async (req, res) => {
  try {
    const episode = await Episode.findById(req.params.id).populate("series", "title");
    if (!episode) return res.status(404).json({ success: false, message: "Episode not found" });

    const data = episode.toObject();
    if (data.videoUrl) {
      data.videoUrl = await getSignedVideoUrl(data.videoUrl);
      // Download URLs are intentionally not exposed as a second permanent public link.
      data.downloadUrl = data.videoUrl;
    }

    return res.json({ success: true, episode: data });
  } catch (error) {
    console.error("Episode playback URL error:", error);
    return res.status(500).json({ success: false, message: error.message || "Could not prepare episode playback" });
  }
};

const createEpisode = async (req, res) => {
  try {
    const payload = { ...req.body };
    if (typeof payload.videoUrl === "string") payload.videoUrl = payload.videoUrl.trim();
    const episode = await Episode.create(payload);
    res.status(201).json({ success: true, message: "Episode added successfully", episode });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const updateEpisode = async (req, res) => {
  try {
    const payload = { ...req.body };
    // Do not erase an existing video when the admin edits metadata only.
    if (!payload.videoUrl) delete payload.videoUrl;
    if (!payload.downloadUrl) delete payload.downloadUrl;
    const episode = await Episode.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    if (!episode) return res.status(404).json({ success: false, message: "Episode not found" });
    res.json({ success: true, message: "Episode updated successfully", episode });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const deleteEpisode = async (req, res) => {
  try {
    const episode = await Episode.findByIdAndDelete(req.params.id);
    if (!episode) return res.status(404).json({ success: false, message: "Episode not found" });
    res.json({ success: true, message: "Episode deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getAllEpisodes, getEpisodeById, createEpisode, updateEpisode, deleteEpisode, getEpisodesBySeriesAndSeason };
