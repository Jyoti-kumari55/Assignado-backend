const { exportTasksReport, exportUsersReport } = require("../controllers/reportController");
const { protect, adminOnly } = require("../middlewares/verifyToken");

const router = require("express").Router();

router.get("/tasks", protect, adminOnly, exportTasksReport );
router.get("/users", protect, adminOnly, exportUsersReport);

module.exports = router;