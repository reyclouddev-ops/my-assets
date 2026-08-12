const mongoose = require("mongoose")

let connected = false

async function connectMongoDB() {
  if (connected && mongoose.connection.readyState === 1) {
    return mongoose.connection
  }

  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI belum dikonfigurasi.")
  }

  const dbName =
    process.env.MONGODB_DB || "Reyz4You"

  await mongoose.connect(
    process.env.MONGODB_URI,
    {
      dbName
    }
  )

  connected = true

  return mongoose.connection
}

module.exports = connectMongoDB
