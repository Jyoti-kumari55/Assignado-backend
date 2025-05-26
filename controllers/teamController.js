const express = require("express");
const router = express.Router();
const Team = require("../models/Team");

// Create a team
const createTeam = async (req, res) => {
  try {
    const { teamName, description } = req.body;

    const newTeam = await Team.create({ teamName, description });
    console.log(newTeam);
    res
      .status(201)
      .json({ message: "Team created successfully", teamName: newTeam });
  } catch (err) {
    console.error("error: ", err);
    res
      .status(500)
      .json({ error: "Failed to create team", details: err.message });
  }
};

// Update a team
const updateTeam = async (req, res) => {
  try {
    const { teamName, description } = req.body;

    const updatedTeam = await Team.findByIdAndUpdate(
      req.params.id,
      { teamName, description },
      { new: true, runValidators: true }
    );

    if (!updatedTeam) {
      return res.status(404).json({ error: "Team not found" });
    }

    res.json({ message: "Team updated successfully", team: updatedTeam });
  } catch (err) {
    if (err.code === 11000) {
      res.status(400).json({ error: "Team name must be unique" });
    } else {
      res
        .status(500)
        .json({ error: "Failed to update team", details: err.message });
    }
  }
};

//delete team
const deleteTeam = async (req, res) => {
  try {
    const deletedTeam = await Team.findByIdAndDelete(req.params.id);

    if (!deletedTeam) {
      return res.status(404).json({ error: "Team not found" });
    }

    res.json({ message: "Team deleted successfully", team: deletedTeam });
  } catch (err) {
    console.error("Error: ", error);
    res
      .status(500)
      .json({ error: "Failed to update team", details: err.message });
  }
};

// Get all teams
const getAllTeams = async (req, res) => {
  try {
    const teams = await Team.find();
    res.status(200).json({ message: "All Teams", teams: teams });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to retrieve teams", details: err.message });
  }
};

module.exports = { createTeam, updateTeam, deleteTeam, getAllTeams };
