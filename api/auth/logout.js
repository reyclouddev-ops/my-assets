module.exports = async function(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method tidak diizinkan."
    })
  }

  res.setHeader(
    "Set-Cookie",
    "reycloud_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"
  )

  return res.status(200).json({
    success: true,
    message: "Logout berhasil."
  })
}
