const TELEGRAM_API = "https://api.telegram.org"

function clean(value, max = 3000) {
  return String(value || "")
    .trim()
    .slice(0, max)
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"]

  if (forwarded) {
    return String(forwarded)
      .split(",")[0]
      .trim()
  }

  return req.socket?.remoteAddress || "Unknown"
}

function generateReportId() {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

  let result = "RPT-"

  for (let i = 0; i < 8; i++) {
    result +=
      chars[
        Math.floor(
          Math.random() * chars.length
        )
      ]
  }

  return result
}

async function sendTelegram(
  token,
  chatId,
  message
) {
  const response =
    await fetch(
      `${TELEGRAM_API}/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json"
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "HTML",
          disable_web_page_preview: true
        })
      }
    )

  const data =
    await response.json()

  if (!response.ok || !data.ok) {
    throw new Error(
      data?.description ||
      "Telegram API error."
    )
  }

  return data
}

export default async function handler(
  req,
  res
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method Not Allowed."
    })
  }

  const token =
    String(
      process.env.TOKEN_BOT || ""
    ).trim()

  const ownerId =
    String(
      process.env.ID_OWN || ""
    ).trim()

  if (!token) {
    console.error(
      "[REPORT] TOKEN_BOT belum dikonfigurasi."
    )

    return res.status(500).json({
      success: false,
      message:
        "Server report belum dikonfigurasi."
    })
  }

  if (!ownerId) {
    console.error(
      "[REPORT] ID_OWN belum dikonfigurasi."
    )

    return res.status(500).json({
      success: false,
      message:
        "Tujuan report belum dikonfigurasi."
    })
  }

  const body =
    req.body || {}

  const title =
    clean(body.title, 100)

  const category =
    clean(body.category, 50)

  const priority =
    clean(body.priority, 30)

  const description =
    clean(body.description, 3000)

  if (!title) {
    return res.status(400).json({
      success: false,
      message:
        "Judul report wajib diisi."
    })
  }

  if (!category) {
    return res.status(400).json({
      success: false,
      message:
        "Kategori report wajib dipilih."
    })
  }

  if (!description) {
    return res.status(400).json({
      success: false,
      message:
        "Deskripsi report wajib diisi."
    })
  }

  if (description.length < 10) {
    return res.status(400).json({
      success: false,
      message:
        "Deskripsi report terlalu singkat."
    })
  }

  const reportId =
    generateReportId()

  const createdAt =
    new Date().toLocaleString(
      "id-ID",
      {
        timeZone:
          "Asia/Jakarta",
        dateStyle:
          "full",
        timeStyle:
          "medium"
      }
    )

  const ip =
    getClientIp(req)

  const message =
`🐛 <b>REYCLOUDSHOP — NEW REPORT</b>

━━━━━━━━━━━━━━━━━━

🆔 <b>Report ID</b>
<code>${escapeHtml(reportId)}</code>

📌 <b>Category</b>
${escapeHtml(category)}

⚡ <b>Priority</b>
${escapeHtml(priority)}

📝 <b>Title</b>
${escapeHtml(title)}

📄 <b>Description</b>
${escapeHtml(description)}

━━━━━━━━━━━━━━━━━━

🕐 <b>Created</b>
${escapeHtml(createdAt)}

🌐 <b>IP</b>
<code>${escapeHtml(ip)}</code>

━━━━━━━━━━━━━━━━━━

🚀 <b>ReyCloudShop Issue Center</b>`

  try {
    await sendTelegram(
      token,
      ownerId,
      message
    )

    return res.status(200).json({
      success: true,
      reportId,
      message:
        "Report berhasil dikirim."
    })
  } catch (error) {
    console.error(
      "[REPORT TELEGRAM]",
      error
    )

    return res.status(500).json({
      success: false,
      message:
        "Report gagal dikirim. Silakan coba lagi."
    })
  }
}
