const mongoose = require("mongoose");
// Team Schema
const teamSchema = new mongoose.Schema(
  {
    teamName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      maxlength: [100, "Description cannot exceed 100 characters"],
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AssignadoUsers",
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AssignadoTeam", teamSchema);
