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

    if (!/^[a-z0-9_]{3,32}$/.test(username)) {
      return send(res, 400, {
        success: false,
        error: "Username hanya boleh menggunakan huruf kecil, angka, dan underscore."
      })
    }

    if (password.length < 6) {
      return send(res, 400, {
        success: false,
        error: "Password minimal 6 karakter."
      })
    }

    const existingUser = await User.findOne({
      username
    })

    if (existingUser) {
      return send(res, 409, {
        success: false,
        error: "Username sudah digunakan."
      })
    }

    const hashedPassword = await bcrypt.hash(
      password,
      12
    )

    const user = await User.create({
      username,
      password: hashedPassword,
      role: "user"
    })

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

    return send(res, 201, {
      success: true,
      message: "Registrasi berhasil.",
      token,
      user: {
        username: user.username,
        role: user.role
      }
    })
  } catch (error) {
    console.error("[REGISTER]", error)

    if (error.code === 11000) {
      return send(res, 409, {
        success: false,
        error: "Username sudah digunakan."
      })
    }

    return send(res, 500, {
      success: false,
      error: "Terjadi kesalahan server."
    })
  }
}
