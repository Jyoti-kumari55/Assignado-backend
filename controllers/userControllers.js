const User = require("../models/User");
const Task = require("../models/Task");
const bcrypt = require("bcryptjs");

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(16);
  return bcrypt.hash(password, salt);
};

//Create user
const createUser = async (req, res) => {
  try {
    const {
      name,
      username,
      email,
      password,
      role = "member",
      bio,
      profileImageUrl,
    } = req.body;

    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Access denied required.",
      });
    }

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email, and password are required.",
      });
    }

    // const existingUser = await User.findOne({
    //   $or: [{ email }, { username }],
    // });

    const existingConditions = [{ email }];
    if (username) {
      existingConditions.push({ username });
    }

    const existingUser = await User.findOne({
      $or: existingConditions,
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({ message: "Email already exists." });
      }
      if (username && existingUser.username === username) {
        return res.status(400).json({ message: "Username already exists." });
      }
    }

    // if (existingUser) {
    //   return res
    //     .status(400)
    //     .json({ message: "Email or Username already exists." });
    // }
    // if (existingUser.username === username) {
    //   return res.status(400).json({ message: "Username already exists." });
    // }

    // Validate role
    const validRoles = ["admin", "member"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        message: "Invalid role.",
      });
    }

    const hashedPassword = await hashPassword(password);

    // Create new user
    const newUser = new User({
      name,
      username: username || null,
      email,
      password: hashedPassword,
      role,
      bio: bio || "",
      profileImageUrl: profileImageUrl || "/default-avatar.png",
    });

    const savedUser = await newUser.save();

    // Remove password from response
    const newUserData = savedUser.toObject();
    delete userResponse.password;

    //remove password from user details
    // const { password: _, ...userResponse } = newUser.toObject();

    res.status(201).json({
      message: "User created successfully.",
      user: newUserData,
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({
      message: "Failed to create user.",
      error: error.message,
    });
  }
};

// Get all users
const getUsers = async (req, res) => {
  try {
    const users = await User.find({ role: "member" }).select("-password");

    const userWithTaskCounts = await Promise.all(
      users.map(async (user) => {
        const pendingTasks = await Task.countDocuments({
          assignedTo: user._id,
          status: "Pending",
        });
        const inProgressTasks = await Task.countDocuments({
          assignedTo: user._id,
          status: "In Progress",
        });
        const completedTasks = await Task.countDocuments({
          assignedTo: user._id,
          status: "Completed",
        });

        return {
          ...user._doc,
          pendingTasks,
          inProgressTasks,
          completedTasks,
        };
      })
    );

    res.status(200).json({ message: "All users", users: userWithTaskCounts });
  } catch (error) {
    console.log(error);
    if (!res.headersSent) {
      res.status(500).json({
        message: "Failed to get users.",
        error: error.message,
      });
    }
  }
};

//Get user by id
const getUserById = async (req, res) => {
  try {
    const userId = req.params.id;
    if (!userId) {
      return res.status(400).json({ message: "User ID is required." });
    }
    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    res.status(200).json({ message: "User Found", user: user });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Failed to fetch user by Id.", error: error.message });
  }
};

// Update user
const updateUser = async (req, res) => {
  try {
    const {
      name,
      username,
      bio,
      profileImageUrl,
      email,
      currentPassword,
      newPassword,
    } = req.body;
    const userId = req.params.id;

    if (req.user._id.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "Unauthorized to update this user." });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Update fields
    Object.assign(user, { name, username, bio, profileImageUrl });
    // user.name = name || user.name;
    // user.username = username || user.username;
    // user.bio = bio || user.bio;
    // user.profileImageUrl = profileImageUrl || user.profileImageUrl;

    // Check if email is being updated and if it's already taken
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({ message: "Email already in use." });
      }
      user.email = email;
    }

    if (currentPassword && newPassword) {
      const isPasswordMatch = await bcrypt.compare(
        currentPassword,
        user.password
      );
      if (!isPasswordMatch) {
        return res
          .status(401)
          .json({ message: "Current password is incorrect." });
      }
      // const salt = await bcrypt.genSalt(16);
      // user.password = await bcrypt.hash(newPassword, salt);
      user.password = await hashPassword(newPassword);
    }
    const updatedUser = await user.save();
    // console.log(updateUser);

    res
      .status(200)
      .json({ message: "User updated successfully", user: updatedUser });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Failed to update user.", error: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const requestingUserId = req.user._id.toString();
    const requestingUserRole = req.user.role;

    // Allow if admin or user deleting their own account
    if (requestingUserRole !== "admin" && requestingUserId !== targetUserId) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this user." });
    }

    // Check if the user exists before attempting to delete
    const userToDelete = await User.findById(targetUserId);
    if (!userToDelete) {
      return res.status(404).json({ message: "User not found." });
    }
    // Prevent admin from deleting themselves (optional safety check)
    if (requestingUserRole === "admin" && requestingUserId === targetUserId) {
      return res.status(400).json({
        message: "Admins cannot delete their own account.",
      });
    }

    // Delete the user
    await User.findByIdAndDelete(targetUserId);

    // Optional: Also delete all tasks assigned to this user
    // await Task.deleteMany({ assignedTo: targetUserId });

    res.status(200).json({
      message: "User deleted successfully.",
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Failed to delete user.", error: error.message });
  }
};

module.exports = { createUser, getUsers, getUserById, updateUser, deleteUser };
