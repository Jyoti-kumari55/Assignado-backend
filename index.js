require("./db/dbConnect");
// require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const cookieParser = require("cookie-parser"); 
const authRoute = require("./routes/authRoutes");
const adminRoute = require("./routes/adminRoutes");
const userRoute = require("./routes/userRoutes");
const taskRoute = require("./routes/taskRoutes");
const teamRoute = require("./routes/teamRoutes");
const reportRoute = require("./routes/reportRoutes");
const { protect } = require("./middlewares/verifyToken");
const upload = require("./middlewares/uploader");

const app = express();

const corsOptions = {
    origin: "http://localhost:5173",
    credentials: true,
    optionSuccessStatus: 200,
  };
  
  app.use(cors(corsOptions));
  app.use(express.json());
  app.use(cookieParser());
  app.use(
    express.urlencoded({
      extended: true,
    })
  );

  cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
  
  app.get("/", (req, res) => {
    res.send("Hello, Task Manager!");
  });

  // All Routes
  app.use('/api/auth', authRoute);
  app.use("/api/admin", adminRoute);
  app.use('/api/user', userRoute);
  app.use('/api/tasks', taskRoute);
  app.use('/api/reports', reportRoute);
  app.use('/api/teams', teamRoute);

  // Upload 
  // app.use("/uploads", express.static(path.join(__dirname, "uploads")));

  app.post("/api/upload-image", protect, upload.single("image"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: "No file uploaded." });
    }
    // const imageUrl = `${req.protocol}://${req.get("host")}/uploads/${
    //   req.file.filename
    // }`;

    const result = await cloudinary.uploader.upload(file.path, {
      folder: "uploads",
    });

    console.log("Rsss: ", result);
    
    res.status(200).json({
      message: "Image uploaded successfully!",
      imageUrl: result.secure_url, // URL of the uploaded image
      imageId: result.public_id,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error uploading image.", error: error });
  }
});
const PORT = 5001;
app.listen(PORT, () => {
  console.log(`Server of Assignado is running on ${PORT}.`)
});