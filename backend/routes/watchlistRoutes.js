
const express = require('express')
const router = express.Router()

const {
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist
} = require('../controllers/watchlistController')

const protect = require('../middleware/authMiddleware')

// Get Watchlist
router.get('/', protect, getWatchlist)

// Add Movie
router.post('/', protect, addToWatchlist)

// Remove Movie
router.delete('/:movieId', protect, removeFromWatchlist)

module.exports = router
