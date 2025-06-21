const router = require("express").Router();
const {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  createUser,
} = require("../controllers/userControllers");
const upload = require("../middlewares/uploader");
const { protect, adminOnly } = require("../middlewares/verifyToken");

router.post("/", protect, adminOnly, createUser);
router.get("/users", protect, adminOnly, getUsers);
router.get("/users/:id", protect, getUserById);
router.put("/users/:id", protect, updateUser);
router.delete("/users/:id", protect, deleteUser);
// router.put("/admin", protect, adminOnly, updateUser);
// router.put("/users/:id", protect,  upload.single("profileImageUrl"), updateUser);

module.exports = router;
