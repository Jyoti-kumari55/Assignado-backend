const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  try {
    let token = req.cookies.token;

    // console.log("tototot: ", token);
    if (!token && req.headers.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }
    if (!token) {
      return res
        .status(401)
        .json({ message: "No token, authorization denied" });
    }

    const decoded = jwt.verify(token, process.env.JWT_TASK_SECRET_TOKEN);
    // req.user = await User.findById(decoded.id).select("-password");
    const user = await User.findById(decoded.userId || decoded).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    req.user = user;
    next();
    // } else {
    //   res.status(401).json({ message: "Not authorized, no token" });
    // }
  } catch (error) {
    console.error("JWT verification error:", error.message);
    res
      .status(401)
      .json({ message: "Token failed or expired", error: error.message });
  }
};

const adminOnly = (req, res, next) => {
  // console.log("Inside adminOnly middleware", req.user);
  if (req.user?.role !== "admin") {
      //  console.error("Admin-only access denied for user:", req.user);
    res.status(403).json({
      message: "Access denied. Only Admin Allowed.",
    });
  }
  next();

};

module.exports = { protect, adminOnly };
