const Team = require("../models/Team");
const User = require("../models/User");

const validateMembers = async (members) => {
  if (!members?.length) return [];

  const users = await User.find({ _id: { $in: members } });
  if (users.length !== members.length) {
    throw new Error("One or more selected users are invalid");
  }
  return members;
};
// Create a team
const createTeam = async (req, res) => {
  try {
    const { teamName, description, members = [] } = req.body;

    if (!teamName.trim()) {
      return res.status(400).json({ error: "Team name is required" });
    }
    const trimmedName = teamName.trim();
    const existingTeam = await Team.findOne({ teamName: trimmedName });
    if (existingTeam) {
      return res.status(400).json({ error: "Team already exists" });
    }

    const validatedMembers = await validateMembers(members);
    const newTeam = await Team.create({
      teamName: trimmedName,
      description: description?.trim() || "",
      members: validatedMembers,
    });
    const populatedTeam = await Team.findById(newTeam._id).populate(
      "members",
      "name email username"
    );

    console.log("Team created:", populatedTeam);

    //  console.log(newTeam);
    res
      .status(201)
      .json({ message: "Team created successfully", team: populatedTeam });
  } catch (error) {
    console.error("error: ", err);
    res
      .status(500)
      .json({ error: "Failed to create team", details: error.message });
  }
};

// Update a team
const updateTeam = async (req, res) => {
  try {
    const { teamName, description, members } = req.body;
    const teamId = req.params.id;

    // Update updatedAt field
    const updateData = { updatedAt: new Date() };

    if (teamName !== undefined) {
      if (!teamName.trim()) {
        return res.status(400).json({ error: "Team name cannot be empty" });
      }
      updateData.teamName = teamName.trim();
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || "";
    }

    if (members !== undefined) {
      updateData.members = await validateMembers(members);
    }

    // updateData.updatedAt = new Date();

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
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Failed to update team", details: error.message });
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
  } catch (error) {
    console.error("Error: ", error);
    res
      .status(500)
      .json({ error: "Failed to update team", message: error.message });
  }
};

// Get all teams
const getAllTeams = async (req, res) => {
  try {
    const teams = await Team.find()
      .populate("members", "name email username profileImageUrl")
      .sort({ createdAt: -1 });
    res
      .status(200)
      .json({ message: "Teams fetched successfully", teams: teams });
  } catch (error) {
    console.error("Error fetching teams:", error);
    res
      .status(500)
      .json({ error: "Failed to retrieve teams", details: error.message });
  }
};

module.exports = { createTeam, updateTeam, deleteTeam, getAllTeams };
