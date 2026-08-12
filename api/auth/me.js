const jwt = require("jsonwebtoken")
const User = require("../../models/User")
const connectMongoDB = require("../../lib/mongodb")

function getCookie(req, name) {
  const cookies = String(
    req.headers.cookie || ""
  )

  const found = cookies
    .split(";")
    .map(x => x.trim())
    .find(x => x.startsWith(`${name}=`))

  if (!found) {
    return null
  }

  return decodeURIComponent(
    found.substring(name.length + 1)
  )
}

module.exports = async function(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Method tidak diizinkan."
    })
  }

  try {
    await connectMongoDB()

    const token =
      getCookie(
        req,
        "reycloud_session"
      )

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Session tidak ditemukan."
      })
    }

    const decoded =
      jwt.verify(
        token,
        process.env.JWT_SECRET
      )

    const user =
      await User.findById(
        decoded.userId
      ).select("-password")

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "User tidak ditemukan."
      })
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email || "",
        role: user.role,
        dnsUsed: user.dnsUsed || 0
      }
    })
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: "Session tidak valid."
    })
  }
}
