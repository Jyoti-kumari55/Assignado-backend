const {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  updateTasksStatus,
  updateTaskCheckList,
  getDashboardData,
  getUserDashboardData,
} = require("../controllers/taskController");
const { protect, adminOnly } = require("../middlewares/verifyToken");

const router = require("express").Router();

router.get("/dashboard", protect, adminOnly, getDashboardData);
router.get("/user-dashboard", protect, getUserDashboardData);
router.get("/tasks", protect, getTasks);
router.get("/tasks/:id", protect, getTaskById);
router.post("/task", protect, adminOnly, createTask);
router.put("/tasks/:id", protect, adminOnly, updateTask);
router.delete("/tasks/:id", protect, adminOnly, deleteTask);
router.put("/tasks/:id/status", protect, updateTasksStatus);
router.put("/tasks/:id/todo", protect, updateTaskCheckList);

module.exports = router;
