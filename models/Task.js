const mongoose = require("mongoose");

const todoSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
  },
  completed: {
    type: Boolean,
    default: false,
  },
});

// const teamSchema = new mongoose.Schema({
//   name: { type: String, required: true, unique: true },
//   description: { type: String },
// });

// Task Schema
const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Low",
    },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Completed"],
      default: "Pending",
    },
    dueDate: {
      type: Date,
      required: true,
    },
    assignedTo: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AssignadoUsers",
        required: true,
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AssignadoUsers",
    },
    attachments: [
      {
        type: String,
      },
    ],
    todoCheckList: [todoSchema],
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AssignadoTeam",
      required: true,
    },
    progress: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);
module.exports = mongoose.model("AssignadoTasks", taskSchema);
