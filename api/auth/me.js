const jwt = require("jsonwebtoken")
const User = require("../../models/User")
const connectMongoDB = require("../../lib/mongodb")

function send(res, status, data) {
  return res.status(status).json(data)
}

function getCookie(req, name) {
  const cookies = String(
    req.headers.cookie || ""
  )

  const parts = cookies.split(";")

  for (const part of parts) {
    const item = part.trim()

    if (!item.startsWith(`${name}=`)) {
      continue
    }

    return decodeURIComponent(
      item.substring(name.length + 1)
    )
  }

  return null
}

module.exports = async function(req, res) {
  if (req.method !== "GET") {
    return send(res, 405, {
      success: false,
      error: "Method tidak diizinkan."
    })
  }

  try {
    if (!process.env.JWT_SECRET) {
      return send(res, 500, {
        success: false,
        error: "JWT_SECRET belum dikonfigurasi."
      })
    }

    await connectMongoDB()

    const token =
      getCookie(
        req,
        "reycloud_session"
      )

    if (!token) {
      return send(res, 401, {
        success: false,
        error: "Session tidak ditemukan."
      })
    }

    let payload

    try {
      payload = jwt.verify(
        token,
        process.env.JWT_SECRET
      )
    } catch {
      return send(res, 401, {
        success: false,
        error: "Session sudah tidak valid."
      })
    }

    if (!payload?.userId) {
      return send(res, 401, {
        success: false,
        error: "Session tidak valid."
      })
    }

    const user = await User.findById(
      payload.userId
    ).select(
      "username email role dnsUsed lastReset createdAt updatedAt"
    )

    if (!user) {
      return send(res, 401, {
        success: false,
        error: "User tidak ditemukan."
      })
    }

    return send(res, 200, {
      success: true,
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
        dnsUsed: user.dnsUsed,
        lastReset: user.lastReset,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    })
  } catch (error) {
    console.error("[ME]", error)

    return send(res, 500, {
      success: false,
      error: "Terjadi kesalahan server."
    })
  }
}
