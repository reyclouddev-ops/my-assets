const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const User = require("../../models/User")
const connectMongoDB = require("../../lib/mongodb")

function send(res, status, data) {
  return res.status(status).json(data)
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

    if (!process.env.JWT_SECRET) {
      return send(res, 500, {
        success: false,
        error: "JWT_SECRET belum dikonfigurasi."
      })
    }

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

    const adminUsername = String(
      process.env.ADMIN_USERNAME || ""
    )
      .trim()
      .toLowerCase()

    const adminPassword = String(
      process.env.ADMIN_PASSWORD || ""
    )

    if (
      adminUsername &&
      adminPassword &&
      username === adminUsername &&
      password === adminPassword
    ) {
      const token = jwt.sign(
        {
          username: adminUsername,
          role: "admin"
        },
        process.env.JWT_SECRET,
        {
          expiresIn: "7d"
        }
      )

      return send(res, 200, {
        success: true,
        message: "Login admin berhasil.",
        token,
        user: {
          username: adminUsername,
          role: "admin"
        }
      })
    }

    const user = await User.findOne({
      username
    })

    if (!user) {
      return send(res, 401, {
        success: false,
        error: "Username atau password salah."
      })
    }

    const passwordValid =
      await bcrypt.compare(
        password,
        user.password
      )

    if (!passwordValid) {
      return send(res, 401, {
        success: false,
        error: "Username atau password salah."
      })
    }

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        username: user.username,
        role: user.role
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d"
      }
    )

    return send(res, 200, {
      success: true,
      message: "Login berhasil.",
      token,
      user: {
        username: user.username,
        role: user.role
      }
    })
  } catch (error) {
    console.error(
      "[LOGIN]",
      error
    )

    return send(res, 500, {
      success: false,
      error: "Terjadi kesalahan server."
    })
  }
}
