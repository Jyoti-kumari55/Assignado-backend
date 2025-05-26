const mongoose = require("mongoose");
// Team Schema
const teamSchema = new mongoose.Schema({
  teamName: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  description: {
    type: String,
  },
}, {timestamps: true });


module.exports = mongoose.model("AssignadoTeam", teamSchema);
