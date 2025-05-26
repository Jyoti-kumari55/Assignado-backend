const {
  registerUser,
  loginUser,
  logoutUser,
  getUserProfile,
} = require("../controllers/authController");
const upload = require("../middlewares/uploader");
const { protect } = require("../middlewares/verifyToken");
const cloudinary = require("cloudinary").v2;
const router = require("express").Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/logout", logoutUser);
router.get("/user-profile", protect, getUserProfile);

// router.post("/upload-image", upload.single("image"), async (req, res) => {
//   try {
//     const file = req.file;
//     if (!file) {
//       return res.status(400).json({ message: "No file uploaded." });
//     }
//     // const imageUrl = `${req.protocol}://${req.get("host")}/uploads/${
//     //   req.file.filename
//     // }`;

//     const result = await cloudinary.uploader.upload(file.path, {
//       folder: "uploads",
//     });

//     console.log("Rsss: ", result);

//     res.status(200).json({
//       message: "Image uploaded successfully!",
//       imageUrl: result.secure_url, // URL of the uploaded image
//       imageId: result.public_id,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Error uploading image.", error: error });
//   }
// });

module.exports = router;
