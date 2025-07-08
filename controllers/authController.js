const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const TOKEN_CONFIG = {
  expiresIn: "24h",
  cookieMaxAge: 24 * 60 * 60 * 1000, // 24 hours
};
const generateToken = (user) => {
  return jwt.sign(
    { userId: user._id, email: user.email, role: user.role },
    process.env.JWT_TASK_SECRET_TOKEN,
    {
      expiresIn: TOKEN_CONFIG.expiresIn,
    }
  );
};

const setCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
  maxAge: TOKEN_CONFIG.cookieMaxAge,
});

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

    if (!name || !username || !email || !password) {
      return res.status(400).json({
        message: "Please provide all required fields",
      });
    }

    const isExistingUser = await User.findOne({
      $or: [{ email }, { username }],
    });
    // const isExistingUser = await User.findOne({ email });
    if (isExistingUser) {
      return res
        .status(400)
        .json({ message: "User  with this email or username already exists." });
    }

    let role =
      adminInviteToken && adminInviteToken === process.env.ADMIN_INVITE_TOKEN
        ? "admin"
        : "member";

    const salt = await bcrypt.genSalt(16);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      name,
      username,
      email,
      password: hashedPassword,
      bio,
      profileImageUrl,
      role,
    });
    const savedUser = await user.save();

    const accessToken = generateToken(savedUser);
    res.cookie("token", accessToken, setCookieOptions());
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

    if (!email || !password) {
      return res.status(400).json({
        message: "Please provide email and password",
      });
    }

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
    const token = generateToken(user);

    res.cookie("token", token, setCookieOptions());

    return res.status(200).json({
      message: `Welcome back ${user.name}!`,
      user: user,
      token: token,
    });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Failed to login a User.", error: error.message });
  }
};

// logout a user
const logoutUser = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
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
