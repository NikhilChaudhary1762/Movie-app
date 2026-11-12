const Episode = require("../models/Episode");
const Series = require("../models/Series");
const { getSignedVideoUrl } = require("../config/b2Storage");

const signMedia = async (value, expiresIn = 86400) => {
  if (typeof value === "string" && value.startsWith("b2://")) {
    return getSignedVideoUrl(value, expiresIn);
  }
  return value || "";
};

// GET EPISODES BY SERIES AND SEASON
const getEpisodesBySeriesAndSeason = async (req, res) => {
  try {
    const { seriesId, seasonNumber } = req.params;
    const records = await Episode.find({
      series: seriesId,
      seasonNumber: Number(seasonNumber),
    }).sort({ episodeNumber: 1 }).lean();

    const episodes = await Promise.all(records.map(async (episode) => ({
      ...episode,
      // Keep private B2 keys intact so the frontend uses the authenticated
      // /api/episodes/:id/stream proxy instead of exposing a direct B2 URL.
      videoUrl: episode.videoUrl || "",
      downloadUrl: await signMedia(episode.downloadUrl, 3600),
    })));

    return res.status(200).json({ success: true, count: episodes.length, episodes });
  } catch (error) {
    console.error("Get episodes by season error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getAllEpisodes = async (req, res) => {
  try {
    const records = await Episode.find()
      .populate("series", "title")
      .sort({ seasonNumber: 1, episodeNumber: 1 }).lean();
    const episodes = await Promise.all(records.map(async (episode) => ({
      ...episode,
      // Keep private B2 keys intact so the frontend uses the authenticated
      // /api/episodes/:id/stream proxy instead of exposing a direct B2 URL.
      videoUrl: episode.videoUrl || "",
      downloadUrl: await signMedia(episode.downloadUrl, 3600),
    })));
    return res.status(200).json({ success: true, episodes });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getEpisodeById = async (req, res) => {
  try {
    const episode = await Episode.findById(req.params.id)
      .populate("series", "title").lean();
    if (!episode) return res.status(404).json({ success: false, message: "Episode not found" });

    // Do not convert b2:// video keys into public-facing signed URLs.
    // EpisodePlayer detects b2:// and streams through the authenticated API proxy.
    episode.downloadUrl = await signMedia(episode.downloadUrl, 3600);
    return res.json({ success: true, episode });
  } catch (error) {
    console.error("Get episode error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const createEpisode = async (req, res) => {
  try {
    const videoUrl = typeof req.body?.videoUrl === "string" ? req.body.videoUrl.trim() : "";
    if (!videoUrl) {
      return res.status(400).json({ success: false, message: "Upload the episode video first. Video URL is missing." });
    }
    const seriesExists = await Series.exists({ _id: req.body.series });
    if (!seriesExists) {
      return res.status(404).json({ success: false, message: "Selected series was not found" });
    }
    const episode = await Episode.create({
      series: req.body.series,
      seasonNumber: Number(req.body.seasonNumber),
      episodeNumber: Number(req.body.episodeNumber),
      title: String(req.body.title || "").trim(),
      description: String(req.body.description || ""),
      duration: Number(req.body.duration || 0),
      thumbnail: String(req.body.thumbnail || ""),
      videoUrl,
      downloadUrl: String(req.body.downloadUrl || "").trim(),
    });
    return res.status(201).json({ success: true, message: "Episode added successfully", episode });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const updateEpisode = async (req, res) => {
  try {
    if (req.body?.videoUrl !== undefined && typeof req.body.videoUrl !== "string") {
      return res.status(400).json({ success: false, message: "Invalid episode video URL" });
    }
    const allowed = ["series", "seasonNumber", "episodeNumber", "title", "description", "duration", "thumbnail", "videoUrl", "downloadUrl"];
    const update = {};
    for (const field of allowed) {
      if (req.body[field] !== undefined) update[field] = req.body[field];
    }
    if (typeof update.videoUrl === "string") update.videoUrl = update.videoUrl.trim();
    if (typeof update.title === "string") update.title = update.title.trim();
    if (update.series && !(await Series.exists({ _id: update.series }))) {
      return res.status(404).json({ success: false, message: "Selected series was not found" });
    }
    const episode = await Episode.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!episode) return res.status(404).json({ success: false, message: "Episode not found" });
    return res.json({ success: true, message: "Episode updated successfully", episode });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const deleteEpisode = async (req, res) => {
  try {
    const episode = await Episode.findByIdAndDelete(req.params.id);
    if (!episode) return res.status(404).json({ success: false, message: "Episode not found" });
    return res.json({ success: true, message: "Episode deleted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
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
