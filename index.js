require("dotenv").config();
require("./db/dbConnect");

const express = require("express");
const cors = require("cors");
const cloudinary = require("cloudinary").v2;
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const fs = require("fs");

//Import Routes
const authRoute = require("./routes/authRoutes");
const adminRoute = require("./routes/adminRoutes");
const userRoute = require("./routes/userRoutes");
const taskRoute = require("./routes/taskRoutes");
const teamRoute = require("./routes/teamRoutes");
const reportRoute = require("./routes/reportRoutes");

const { protect } = require("./middlewares/verifyToken");
const upload = require("./middlewares/uploader");

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "https://assignado-app.vercel.app",
];
const corsOptions = {
  origin: function (origin, callback) {
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error("CORS not allowed"), false);
    }
  },
  credentials: true,
  optionSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
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

//Routes
app.use("/api/auth", authRoute);
app.use("/api/admin", adminRoute);
app.use("/api/user", userRoute);
app.use("/api/tasks", taskRoute);
app.use("/api/reports", reportRoute);
app.use("/api/teams", teamRoute);

app.post(
  "/api/upload-image",
  protect,
  upload.single("image"),
  async (req, res) => {
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

      // console.log("Rsss: ", result);

      fs.unlink(file.path, (err) => {
        if (err) console.error("Error deleting file:", err);
      });

      res.status(200).json({
        message: "Image uploaded successfully!",
        imageUrl: result.secure_url,
        imageId: result.public_id,
      });
    } catch (error) {
      console.error(error);
      // Clean up file if upload failed
      if (req.file && req.file.path) {
        fs.unlink(req.file.path, (err) => {
          if (err) console.error("Error deleting file:", err);
        });
      }

      res.status(500).json({ message: "Error uploading image.", error: error });
    }
  }
);
const PORT = 5001;
app.listen(PORT, () => {
  console.log(`Server of Assignado is running on ${PORT}.`);
});
