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

  res.setHeader(
    "Set-Cookie",
    "reycloud_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"
  )

  return send(res, 200, {
    success: true,
    message: "Logout berhasil."
  })
}
