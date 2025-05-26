const express = require("express");
const router = express.Router();
const { updateAdminProfile } = require("../controllers/adminController");
const { protect, adminOnly } = require("../middlewares/verifyToken");

// Route: Only logged-in admins can update their own details
router.put("/:id", protect, adminOnly, updateAdminProfile);

module.exports = router;