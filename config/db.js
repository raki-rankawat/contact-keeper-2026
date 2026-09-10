const mongoose = require('mongoose')

const connectDB = () => {
  const db = process.env.MONGO_URI

  if (!db) {
    console.error('MONGO_URI is not set — copy .env.example to .env')
    process.exit(1)
  }

  mongoose
    .connect(db)
    .then(() => console.log('MongoDB connected'))
    .catch(error => {
      console.error(error.message)
      process.exit(1)
    })
}

module.exports = connectDB
