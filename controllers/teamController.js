const express = require("express");
const router = express.Router();
const Team = require("../models/Team");
const User = require("../models/User");

// Create a team
const createTeam = async (req, res) => {
  try {
    const { teamName, description, members = [] } = req.body;

    if (!teamName || !teamName.trim()) {
      return res.status(400).json({ error: "Team name is required" });
    }

    const existingTeam = await Team.findOne({ teamName: teamName.trim() });
    if (existingTeam) {
      return res.status(400).json({ error: "Team already exists" });
    }

    let validateMembers = [];
    if (members && members.length > 0) {
      const users = await User.find({ _id: { $in: members } });
      if (users.length !== members.length) {
        return res
          .status(400)
          .json({ error: "One or more selected users are invalid" });
      }
      validateMembers = members;
    }
    const newTeam = await Team.create({
      teamName: teamName.trim(),
      description: description?.trim() || "",
      members: validateMembers,
    });
    const populatedTeam = await Team.findById(newTeam._id).populate(
      "members",
      "name email username"
    );

    console.log("Team created:", populatedTeam);

    //  console.log(newTeam);
    res
      .status(201)
      .json({ message: "Team created successfully", teamName: populatedTeam });
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
    const { teamName, description, members } = req.body;
    const teamId = req.params.id;
    const updateData = {};
    if (teamName !== undefined) {
      if (!teamName.trim()) {
        return res.status(400).json({ error: "Team name cannot be empty" });
      }
      updateData.teamName = teamName.trim();
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || "";
    }

    // Validate members if provided
    if (members !== undefined) {
      if (members.length > 0) {
        const users = await User.find({ _id: { $in: members } });
        if (users.length !== members.length) {
          return res
            .status(400)
            .json({ error: "One or more selected users are invalid" });
        }
      }
      updateData.members = members;
    }

    // Update updatedAt field
    updateData.updatedAt = new Date();

    const updatedTeam = await Team.findByIdAndUpdate(teamId, updateData, {
      new: true,
      runValidators: true,
    }).populate("members", "name email username profileImageUrl");

    if (!updatedTeam) {
      return res.status(404).json({ error: "Team not found" });
    }

    res.json({
      message: "Team updated successfully",
      team: updatedTeam,
    });
    // const updatedTeam = await Team.findByIdAndUpdate(
    //   req.params.id,
    //   { teamName, description },
    //   { new: true, runValidators: true }
    // );

    // if (!updatedTeam) {
    //   return res.status(404).json({ error: "Team not found" });
    // }

    // res.json({ message: "Team updated successfully", team: updatedTeam });
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
    const teamId = req.params.id;

    const deletedTeam = await Team.findByIdAndDelete(teamId);

    if (!deletedTeam) {
      return res.status(404).json({ error: "Team not found" });
    }

    console.log("deleted team: ", deletedTeam);

    res.json({
      message: "Team deleted successfully",
      team: deletedTeam,
    });
  } catch (err) {
    console.error("Error: ", err);
    res
      .status(500)
      .json({ error: "Failed to update team", message: err.message });
  }
};

// Get all teams
const getAllTeams = async (req, res) => {
  try {
    const teams = await Team.find()
      .populate("members", "name email username profileImageUrl") // Populate member details
      .sort({ createdAt: -1 });
    res
      .status(200)
      .json({ message: "Teams fetched successfully", teams: teams });
  } catch (err) {
    console.error("Error fetching teams:", err);
    res
      .status(500)
      .json({ error: "Failed to retrieve teams", details: err.message });
  }
};

module.exports = { createTeam, updateTeam, deleteTeam, getAllTeams };
