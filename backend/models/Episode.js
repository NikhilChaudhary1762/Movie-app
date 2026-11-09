
const mongoose = require("mongoose");

const episodeSchema = new mongoose.Schema(
  {
    series: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Series",
      required: true,
    },

    seasonNumber: {
      type: Number,
      required: true,
      min: 1,
    },

    episodeNumber: {
      type: Number,
      required: true,
      min: 1,
    },

    title: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      default: "",
    },

    duration: {
      type: Number,
      default: 0,
    },

    thumbnail: {
      type: String,
      default: "",
    },

    videoUrl: {
      type: String,
      default: "",
    },

    downloadUrl: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Same season mein duplicate episode number prevent karega
episodeSchema.index(
  { series: 1, seasonNumber: 1, episodeNumber: 1 },
  { unique: true }
);

module.exports = mongoose.model("Episode", episodeSchema);
