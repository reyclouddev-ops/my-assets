const mongoose = require("mongoose")

let connectionPromise = null

async function connectMongoDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection
  }

  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI belum dikonfigurasi.")
  }

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(
      process.env.MONGODB_URI,
      {
        dbName: "test"
      }
    )
  }

  try {
    await connectionPromise
    return mongoose.connection
  } catch (error) {
    connectionPromise = null
    throw error
  }
}

module.exports = connectMongoDB
