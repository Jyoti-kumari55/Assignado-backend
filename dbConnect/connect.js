const mongoose = require('mongoose')
// Access your MongoDB connection string from secrets
const mongoURI = process.env.MONGODB
mongoose
  .connect(mongoURI)
  .then(() => {
    console.log('Connected to the MongoDB Successfully!')
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB:', error)
  });