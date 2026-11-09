
const User = require('../models/User')
const Movie = require('../models/Movie')

// Get Watchlist
const getWatchlist = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('watchlist')

    res.status(200).json({
      success: true,
      watchlist: user.watchlist
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
}

// Add Movie to Watchlist
const addToWatchlist = async (req, res) => {
  try {
    const { movieId } = req.body

    const movie = await Movie.findById(movieId)

    if (!movie) {
      return res.status(404).json({
        success: false,
        message: 'Movie not found'
      })
    }

    const user = await User.findById(req.user._id)

    if (user.watchlist.includes(movie._id)) {
      return res.status(400).json({
        success: false,
        message: 'Movie already in watchlist'
      })
    }

    user.watchlist.push(movie._id)
    await user.save()

    res.status(200).json({
      success: true,
      message: 'Movie added to watchlist'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
}

// Remove Movie from Watchlist
const removeFromWatchlist = async (req, res) => {
  try {
    const { movieId } = req.params

    const user = await User.findById(req.user._id)

    user.watchlist = user.watchlist.filter(
      (id) => id.toString() !== movieId
    )

    await user.save()

    res.status(200).json({
      success: true,
      message: 'Movie removed from watchlist'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
}

module.exports = {
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist
}
