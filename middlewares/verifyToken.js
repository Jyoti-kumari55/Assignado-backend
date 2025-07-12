const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  try {
    let token = req.cookies.token;

    if (!token && req.headers.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }
    if (!token) {
      return res
        .status(401)
        .json({ message: "No token, authorization denied" });
    }

    //Verify Token
    const decoded = jwt.verify(token, process.env.JWT_TASK_SECRET_TOKEN);

    const user = await User.findById(decoded.userId).select("-password").lean();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // console.log("Authenticated user:", { id: user._id, role: user.role });
    req.user = user;
    next();
  } catch (error) {
    console.error("JWT verification error:", error.message);
    res
      .status(401)
      .json({ message: "Token failed or expired", error: error.message });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({
      message: "Access denied. Only Admin Allowed.",
    });
  }
  next();
};

module.exports = { protect, adminOnly };
