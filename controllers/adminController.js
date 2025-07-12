const User = require("../models/User");
const bcrypt = require("bcryptjs");

const updateAdminProfile = async (req, res) => {
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

    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Admin not found." });
    }

    user.name = name || user.name;
    user.username = username || user.username;
    user.bio = bio || user.bio;
    user.profileImageUrl = profileImageUrl || user.profileImageUrl;

    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res
          .status(400)
          .json({ message: "Email already in use by another user." });
      }
      user.email = email;
    }
    // compare password
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

    res.status(200).json({
      message: "Admin profile updated successfully.",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating admin profile:", error.message);
    res.status(500).json({
      message: "Failed to update admin profile.",
      error: error.message,
    });
  }
};

module.exports = { updateAdminProfile };
