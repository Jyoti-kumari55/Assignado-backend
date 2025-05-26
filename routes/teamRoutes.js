const { createTeam, updateTeam, getAllTeams, deleteTeam } = require("../controllers/teamController");
const { protect, adminOnly } = require("../middlewares/verifyToken");

const router = require("express").Router();

router.post("/", protect, adminOnly, createTeam);
router.get("/", protect, adminOnly, getAllTeams);
router.put("/:id", protect, adminOnly, updateTeam);
router.delete("/:id", protect, adminOnly, deleteTeam);



module.exports = router;
