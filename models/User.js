const mongoose = require("mongoose")

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    maxlength: 32
  },
  email: {
    type: String,
    default: ""
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    default: "User"
  },
  dnsUsed: {
    type: Number,
    default: 0
  },
  lastReset: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
})

module.exports =
  mongoose.models.User ||
  mongoose.model("User", UserSchema)
