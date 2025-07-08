const mongoose = require("mongoose");
// Access your MongoDB connection string from secrets
require("dotenv").config();
const mongoURI = process.env.MONGODB;
const connectionOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 15000,
  // connectTimeoutMS: 20000,
  maxPoolSize: 10,
  bufferCommands: true,
  // bufferMaxEntries: 0,
  retryWrites: true,
};
mongoose
  .connect(mongoURI, connectionOptions)
  .then(() => {
    console.log("Connected to the MongoDB Successfully!");
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB:", error);
    setTimeout(() => {
      console.log("Retrying MongoDB connection...");
      mongoose.connect(mongoURI, connectionOptions);
    }, 5000);
  });
