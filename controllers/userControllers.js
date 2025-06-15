const User = require("../models/User");
const Task = require("../models/Task");
const bcrypt = require("bcryptjs");

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
    return res.status(200).json({ message: "User Found", user: user });
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

    user.name = name || user.name;
    user.username = username || user.username;
    user.bio = bio || user.bio;
    user.profileImageUrl = profileImageUrl || user.profileImageUrl;

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
      const salt = await bcrypt.genSalt(16);
      user.password = await bcrypt.hash(newPassword, salt);
    }
    const updatedUser = await user.save();
    console.log(updateUser);

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
    const requestingUserId = req.user.id;
    const requestingUserRole = req.user.role;

    // Allow if admin or user deleting their own account
    if (requestingUserRole !== "admin" && requestingUserId !== targetUserId) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this user." });
    }

    const user = await User.findByIdAndDelete(targetUserId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.status(200).json({ message: "User deleted successfully." });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Failed to delete user.", error: error.message });
  }
};

// Change user password
const changeUserPassword = async (req, res) => {
  try {
    const userId = req.params.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Current and new password are required." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ message: "Current password is incorrect." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: "Password updated successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to change password.",
      error: error.message,
    });
  }
};

// const updateUser = async (req, res) => {
//   try {
//     const {
//       name,
//       username,
//       bio,
//       profileImageUrl,
//       email,
//       currentPassword,
//       newPassword,
//     } = req.body;

//     // const profileImageUrl = req.file ? `/uploads/${req.file.filename}` : null;
//     // Determine which user's profile to update
//     const targetUserId = req.params.id || req.user._id;

//     // If not admin, ensure they can only update their own profile
//     if (req.user.role !== "admin" && targetUserId.toString() !== req.user._id.toString()) {
//       return res.status(403).json({ message: "Access denied. You can only update your own profile." });
//     }

//     const user = await User.findById(targetUserId);
//     if (!user) {
//       return res.status(404).json({ message: "User not found." });
//     }

//     // Update fields if provided
//     user.name = name || user.name;
//     user.username = username || user.username;
//     user.bio = bio || user.bio;
//     user.profileImageUrl = profileImageUrl ||  user.profileImageUrl;
//     user.email = email || user.email;

//     // Update email with uniqueness check
//     if (email && email !== user.email) {
//       const emailExists = await User.findOne({ email });
//       if (emailExists) {
//         return res.status(400).json({ message: "Email already in use." });
//       }
//       user.email = email;
//     }

//     // Password change (requires current password)
//     if (currentPassword && newPassword) {
//       const isPasswordMatch = await bcrypt.compare(currentPassword, user.password);
//       if (!isPasswordMatch) {
//         return res.status(401).json({ message: "Current password is incorrect." });
//       }
//       const salt = await bcrypt.genSalt(16);
//       user.password = await bcrypt.hash(newPassword, salt);
//     }

//     const updatedUser = await user.save();

//     res.status(200).json({
//       message: "User profile updated successfully.",
//       user: updatedUser,
//     });
//   } catch (error) {
//     console.error("Error updating user:", error.message);
//     res.status(500).json({
//       message: "Failed to update user.",
//       error: error.message,
//     });
//   }
// };

//Delete user
// const deleteUser = async (req, res) => {
//   try {
//     const user = await User.findByIdAndDelete(req.params.id);
//     if (!user) {
//       return res.status(404).json({ message: "User not found." });
//     }

//     res.status(200).json({ message: "User deleted successfully." });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Failed to delete user.", error: error.message });
//   }
// };

// Delete user with role-based access control

module.exports = { getUsers, getUserById, updateUser, deleteUser };
