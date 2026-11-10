
const Movie = require("../models/Movie");

// ===============================
// GET ALL MOVIES
// ===============================
const getMovies = async (req, res) => {
  try {
    const { search, genre } = req.query;

    let filter = {};

    if (search) {
      filter.title = {
        $regex: search,
        $options: "i",
      };
    }

    if (genre) {
      filter.genres = genre;
    }

    const records = await Movie.find(filter).sort({
      createdAt: -1,
    }).lean();

    // Keep media URLs private; public pages only need availability flags.
    const movies = records.map((movie) => {
      const safeMovie = { ...movie };
      safeMovie.hasWatchUrl = Boolean(safeMovie.watchUrl);
      safeMovie.hasDownloadUrl = Boolean(safeMovie.downloadUrl);
      delete safeMovie.watchUrl;
      delete safeMovie.downloadUrl;
      return safeMovie;
    });

    res.status(200).json({
      success: true,
      count: movies.length,
      movies,
    });
  } catch (error) {
    console.error("Get movies error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to fetch movies",
    });
  }
};

// ===============================
// GET SINGLE MOVIE
// ===============================
const getMovieById = async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);

    if (!movie) {
      return res.status(404).json({
        success: false,
        message: "Movie not found",
      });
    }

    const safeMovie = movie.toObject();
    safeMovie.hasWatchUrl = Boolean(safeMovie.watchUrl);
    safeMovie.hasDownloadUrl = Boolean(safeMovie.downloadUrl);
    delete safeMovie.watchUrl;
    delete safeMovie.downloadUrl;

    res.status(200).json({
      success: true,
      movie: safeMovie,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Invalid movie ID",
    });
  }
};


const { getSignedVideoUrl } = require("../config/b2Storage");

const getMovieAccess = async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id).select("watchUrl downloadUrl");
    if (!movie) return res.status(404).json({ success: false, message: "Movie not found" });

    const signIfB2 = async (value, expiresIn = 7200) =>
      value && value.startsWith("b2://") ? getSignedVideoUrl(value, expiresIn) : (value || "");

    res.status(200).json({
      success: true,
      media: {
        watchUrl: await signIfB2(movie.watchUrl),
        downloadUrl: await signIfB2(movie.downloadUrl, 3600),
      },
    });
  } catch (error) {
    console.error("Movie access error:", error);
    res.status(500).json({ success: false, message: error.message || "Unable to create video URL" });
  }
};

// ===============================
// CREATE MOVIE WITH VIDEO UPLOAD
// ===============================
const createMovie = async (req, res) => {
  try {
    const { title, description, poster, watchUrl, downloadUrl, ...details } = req.body || {};

    if (!title?.trim() || !description?.trim() || !poster?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Movie title, description and poster are required",
      });
    }
    if (!watchUrl || typeof watchUrl !== "string" || !watchUrl.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please upload the movie video first. Video URL is missing.",
      });
    }

    const movie = await Movie.create({
      ...details,
      title: title.trim(),
      description: description.trim(),
      poster: poster.trim(),
      watchUrl: watchUrl.trim(),
      downloadUrl: (downloadUrl || "").trim(),
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "Movie saved successfully",
      movie,
    });
  } catch (error) {
    console.error("Create movie error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// ===============================
// DELETE MOVIE
// ===============================
const deleteMovie = async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);

    if (!movie) {
      return res.status(404).json({
        success: false,
        message: "Movie not found",
      });
    }

    await movie.deleteOne();

    res.status(200).json({
      success: true,
      message: "Movie deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// UPDATE MOVIE
// ===============================
const updateMovie = async (req, res) => {
  try {
    const movie = await Movie.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!movie) {
      return res.status(404).json({
        success: false,
        message: "Movie not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Movie updated successfully",
      movie,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// EXPORT CONTROLLERS
// ===============================
module.exports = {
  getMovies,
  getMovieById,
  getMovieAccess,
  createMovie,
  deleteMovie,
  updateMovie,
};
