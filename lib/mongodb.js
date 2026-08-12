const mongoose = require("mongoose")

let connected = false

async function connectMongoDB() {
  if (connected && mongoose.connection.readyState === 1) {
    return mongoose.connection
  }

  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI belum dikonfigurasi.")
  }

  const uri = process.env.MONGODB_URI

  await mongoose.connect(uri, {
    dbName: "test"
  })

  connected = true

  return mongoose.connection
}

module.exports = connectMongoDB
