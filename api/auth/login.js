const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const User = require("../../models/User")
const connectMongoDB = require("../../lib/mongodb")

function send(res, status, data) {
  return res.status(status).json(data)
}

function setCookie(res, token) {
  res.setHeader(
    "Set-Cookie",
    `reycloud_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`
  )
}

module.exports = async function(req, res) {
  if (req.method !== "POST") {
    return send(res, 405, {
      success: false,
      error: "Method tidak diizinkan."
    })
  }

  try {
    await connectMongoDB()

    const username = String(
      req.body?.username || ""
    )
      .trim()
      .toLowerCase()

    const password = String(
      req.body?.password || ""
    )

    if (!username || !password) {
      return send(res, 400, {
        success: false,
        error: "Username dan password wajib diisi."
      })
    }

    const user = await User.findOne({
      username
    }).select("+password")

    if (!user) {
      return send(res, 401, {
        success: false,
        error: "Username atau password salah."
      })
    }

    const valid =
      await bcrypt.compare(
        password,
        user.password
      )

    if (!valid) {
      return send(res, 401, {
        success: false,
        error: "Username atau password salah."
      })
    }

    const token = jwt.sign(
      {
        userId: user._id.toString()
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d"
      }
    )

    setCookie(res, token)

    return send(res, 200, {
      success: true,
      message: "Login berhasil."
    })
  } catch (error) {
    console.error("[LOGIN]", error)

    return send(res, 500, {
      success: false,
      error: "Terjadi kesalahan server."
    })
  }
}
