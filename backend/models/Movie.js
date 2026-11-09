
const mongoose = require('mongoose')

const movieSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
    },

    poster: {
      type: String,
      required: true,
    },

    releaseDate: {
      type: Date,
    },

    genres: [
      {
        type: String,
      },
    ],

    language: {
      type: String,
      default: 'Hindi',
    },

    rating: {
      type: Number,
      min: 0,
      max: 10,
      default: 0,
    },

    duration: {
      type: Number,
      min: 1,
    },

    featured: {
      type: Boolean,
      default: false,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    trailerUrl: {
      type: String,
      default: '',
    },

    // Online Watch URL
    watchUrl: {
      type: String,
      default: '',
    },

    // Movie Download URL
    downloadUrl: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
)

module.exports = mongoose.model('Movie', movieSchema, 'Data store')
