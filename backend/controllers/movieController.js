
const Movie = require("../models/Movie");
const { getSignedVideoUrl } = require("../config/b2Storage");

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


const getMovieAccess = async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id).select('watchUrl downloadUrl');
    if (!movie) {
      return res.status(404).json({ success: false, message: 'Movie not found' });
    }
    const watchUrl = movie.watchUrl ? await getSignedVideoUrl(movie.watchUrl) : '';
    const downloadUrl = movie.downloadUrl ? await getSignedVideoUrl(movie.downloadUrl) : watchUrl;

    res.status(200).json({
      success: true,
      media: { watchUrl, downloadUrl },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Invalid movie ID' });
  }
};

// ===============================
// CREATE MOVIE WITH VIDEO UPLOAD
// ===============================
const createMovie = async (req, res) => {
  try {
    // Check video file
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please select a video file",
      });
    }

    // Video URL
    const videoUrl = `/uploads/${req.file.filename}`;

    // Create movie
    const movie = await Movie.create({
      ...req.body,
      videoUrl,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "Movie uploaded successfully",
      movie,
    });
  } catch (error) {
    console.error("Create movie error:", error.message);

    res.status(400).json({
      success: false,
      message: error.message,
    });
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
