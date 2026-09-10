const mongoose = require('mongoose')

const connectDB = () => {
  const db = process.env.MONGO_URI

  mongoose
    .connect(db, { dbName: 'dev-db' })
    .then(conn =>
      console.log(`MongoDB connected — db: ${conn.connection.name}`),
    )
    .catch(error => {
      console.error(error.message)
      process.exit(1)
    })
}

module.exports = connectDB
