const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_TASK_SECRET_TOKEN, {
    expiresIn: "1d",
  });
};

// Register a user
const registerUser = async (req, res) => {
  try {
    const {
      name,
      username,
      email,
      password,
      bio,
      profileImageUrl,
      adminInviteToken,
    } = req.body;

    const isExistingUser = await User.findOne({ email });
    if (isExistingUser) {
      return res.status(400).json({ message: "User already exists." });
    }

    let role = "member";
    if (
      adminInviteToken &&
      adminInviteToken == process.env.ADMIN_INVITE_TOKEN
    ) {
      role = "admin";
    }

    const salt = await bcrypt.genSalt(16);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      name: name,
      username: username,
      email: email,
      password: hashedPassword,
      bio: bio,
      profileImageUrl,
      role,
    });
    const savedUser = await user.save();

    const accessToken = jwt.sign(
      { userId: savedUser._id, email: savedUser.email, role: savedUser.role },
      process.env.JWT_TASK_SECRET_TOKEN,
      {
        expiresIn: "1d",
      }
    );
    res.status(201).json({
      message: "User registered successfully.",
      user: savedUser,
      token: accessToken,
    });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Failed to register a User.", error: error.message });
  }
};

// Login a user
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found." });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res
        .status(401)
        .json({ message: "Please enter your valid password." });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role, _id: user._id },
      process.env.JWT_TASK_SECRET_TOKEN,
      {
        expiresIn: "8h",
      }
    );
    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      // sameSite: "None",
      maxAge: 8 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      message: `Welcome back ${user.name}!`,
      user: user,
      token: token,
    });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Failed to logged in a User.", error: error.message });
  }
};

// logout a user
const logoutUser = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: true,
      sameSite: "None",
    });

    res.status(200).json({ message: `You are successfully logged out.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occured while loging out." });
  }
};

const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password -email");
    // console.log("00000", user);
    if (!user) {
      return res.status(401).json({
        message: "User not found.This account may have been deleted.",
      });
    }
    return res.status(200).json({ message: "User Details", user: user });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Failed to logged in a User.", error: error.message });
  }
};

module.exports = { registerUser, loginUser, logoutUser, getUserProfile };
