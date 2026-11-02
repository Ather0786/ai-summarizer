const mongoose = require("mongoose");

const summarySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    originalText: {
      type: String,
      required: true,
    },

    summary: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Summary = mongoose.model("Summary", summarySchema);

module.exports = Summary;