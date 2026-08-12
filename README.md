# ReyCloudShop

ReyCloudShop adalah dashboard web modern untuk mengelola berbagai fitur project secara terpusat dengan tampilan futuristic, responsive, dan mobile-friendly.

## ✨ Features

- 🔐 Register & Login
- 👤 User Dashboard
- 🛡️ Admin Dashboard
- 🚀 Deploy Project
- 🔎 Scrape Tools
- 🐛 Report Issue
- 🛠️ Tools
- 📊 Activity / Update
- ⚙️ Settings
- 🕐 Realtime Clock
- 📅 Realtime Date & Day
- 🔧 Maintenance Mode
- 📢 Activity Update
- 📦 Upload ZIP / HTML / HTM
- ☁️ Vercel Deployment
- 🌐 Custom Domain
- 🗄️ MongoDB
- 🔑 Environment Variables

## 📁 Project Structure

```text
reycloudshop/
├── api/
│   ├── auth/
│   │   ├── login.js
│   │   └── register.js
│   ├── deploy.js
│   ├── report.js
│   └── activity.js
│
├── dashboard/
│   ├── index.html
│   │
│   ├── admin/
│   │   └── index.html
│   │
│   ├── deploy/
│   │   └── index.html
│   │
│   ├── scrape/
│   │   └── index.html
│   │
│   ├── report/
│   │   └── index.html
│   │
│   ├── tools/
│   │   └── index.html
│   │
│   ├── activity/
│   │   └── index.html
│   │
│   └── settings/
│       └── index.html
│
├── image/
│   └── banner.png
│
├── index.html
├── package.json
├── vercel.json
├── .env
└── README.md
```

## 🔐 Authentication

ReyCloudShop memiliki sistem register dan login menggunakan MongoDB.

Alur register:

```text
Register
   ↓
MongoDB
   ↓
Dashboard
```

Alur login:

```text
Login
   ↓
MongoDB
   ↓
Dashboard
```

Role yang digunakan:

```text
User
Admin
```

Admin ditentukan melalui environment variable.

## 👤 User Dashboard

Setelah berhasil register atau login, user langsung diarahkan ke dashboard.

Dashboard menampilkan:

```text
Hallo, Username

Role
User / Admin

22:30:12

Rabu, 12 Agustus 2026
```

Jam, hari, dan tanggal diperbarui secara realtime.

Menu utama:

```text
🚀 Deploy
🔎 Scrape
🐛 Report Issue
🛠️ Tools
📊 Activity
⚙️ Settings
```

## 🛡️ Admin Dashboard

Admin memiliki dashboard khusus:

```text
/dashboard/admin/
```

Admin digunakan untuk mengelola informasi dashboard.

Fitur admin:

- 📢 Membuat Activity
- 🔧 Membuat Maintenance
- 📥 Melihat Request
- 📝 Mengelola Update
- 📊 Mengelola informasi dashboard

Admin menggunakan username dan password dari environment variable.

## 📊 Activity

Activity digunakan sebagai pusat informasi update untuk user.

Contoh:

```text
SYSTEM UPDATE

Dashboard v1.2.0

UI dashboard diperbarui.

12 August 2026
22:30
```

Activity dapat digunakan untuk:

- Update UI
- Update fitur
- Update versi
- Maintenance
- Informasi penting
- Request yang sudah diproses

User dapat melihatnya melalui:

```text
/dashboard/activity/
```

## 🔧 Maintenance

Admin dapat membuat informasi maintenance dengan waktu mulai dan selesai.

Contoh:

```text
🔧 MAINTENANCE

ReyCloudShop akan melakukan maintenance.

Start
23:00

End
01:00
```

Informasi maintenance ditampilkan melalui Activity sehingga user dapat melihat informasi terbaru tanpa perlu upload ulang halaman secara manual.

## 🚀 Deploy

Fitur Deploy digunakan untuk mengupload project ke Vercel.

Format yang didukung:

```text
.zip
.html
.htm
```

Maksimal ukuran:

```text
20 MB
```

Alur deployment:

```text
Upload File
     ↓
Project Name
     ↓
Detect Framework
     ↓
Create Vercel Project
     ↓
Upload Files
     ↓
Build
     ↓
Deployment
     ↓
Custom Domain
     ↓
Success
```

Endpoint:

```text
/api/deploy
```

## 🌐 Vercel

Deployment menggunakan Vercel API.

Environment variable:

```env
API_TOKEN=
API_DOMAIN=
```

`API_TOKEN` digunakan untuk autentikasi Vercel.

`API_DOMAIN` digunakan untuk custom domain.

Contoh:

```env
API_DOMAIN=example.com
```

Project dapat menggunakan domain:

```text
project-name.example.com
```

## 🐛 Report Issue

User dapat mengirim report melalui:

```text
/dashboard/report/
```

Kategori report:

```text
🐛 Bug
💡 Suggestion
🚀 Feature Request
🎨 UI / UX
⚠️ Other
```

Setelah report berhasil dikirim, user mendapatkan informasi:

```text
✅ Report berhasil dikirim.

Join channel WhatsApp untuk mendapatkan
informasi lebih lanjut mengenai report kamu.
```

Channel WhatsApp:

```text
https://whatsapp.com/channel/0029Vb8AU5sEQIakiPGkOA2k
```

Report kemudian dikirim ke bot Telegram agar dapat diterima oleh admin.

## 📢 Telegram Report

Environment variable:

```env
TOKEN_BOT=
ID_OWN=
```

`TOKEN_BOT` digunakan untuk token bot Telegram.

`ID_OWN` digunakan sebagai ID administrator penerima report.

Token dan ID tidak boleh ditulis secara langsung pada frontend.

## 🗄️ MongoDB

MongoDB digunakan untuk menyimpan data aplikasi.

Data yang dapat disimpan:

```text
Users
Reports
Activities
Maintenance
Requests
```

Environment variable:

```env
MONGODB_URI=
MONGODB_DB=
```

Contoh:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
MONGODB_DB=reycloudshop
```

Jangan commit file `.env` ke repository publik.

## 📦 Package

Dependencies utama:

```json
{
  "name": "reycloudshop",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "axios": "^1.11.0",
    "adm-zip": "^0.5.16",
    "mongodb": "^6.18.0"
  }
}
```

## ⚙️ Environment Variables

Buat file:

```text
.env
```

Kemudian isi konfigurasi:

```env
MONGODB_URI=
MONGODB_DB=reycloudshop

TOKEN_BOT=
ID_OWN=

API_TOKEN=
API_DOMAIN=

ADMIN_USERNAME=
ADMIN_PASSWORD=
```

Admin menggunakan username, bukan email.

Contoh:

```env
ADMIN_USERNAME=reycloud
ADMIN_PASSWORD=your-secure-password
```

Gunakan password yang kuat pada deployment sebenarnya.

## 🔒 Security

Secret tidak boleh dimasukkan ke frontend.

Jangan melakukan:

```js
const TOKEN_BOT = "123456:ABC...";
```

atau:

```js
const API_TOKEN = "vercel-token";
```

Gunakan environment variable di server:

```js
process.env.TOKEN_BOT
```

dan:

```js
process.env.API_TOKEN
```

Jangan upload `.env` ke GitHub.

Tambahkan `.env` ke `.gitignore`:

```text
.env
.env.local
.env.production
node_modules/
```

## 🎨 UI

Konsep UI ReyCloudShop:

- Dark futuristic
- Glassmorphism
- Neon accent
- Responsive
- Mobile-first
- Smooth animation
- 3D carousel
- Touch swipe
- Realtime clock
- Modern cards

Dashboard menggunakan carousel untuk berpindah antar fitur.

## 📱 Mobile Support

UI dirancang agar nyaman digunakan pada:

```text
Android
iOS
Tablet
Desktop
```

Carousel mendukung:

```text
← Previous
→ Next
Swipe Left
Swipe Right
```

## 🛠️ Installation

Clone repository:

```bash
git clone https://github.com/reyclouddev-ops/my-assets.git
cd my-assets
```

Install dependency:

```bash
npm install
```

Buat environment:

```bash
cp .env.example .env
```

Isi konfigurasi:

```env
MONGODB_URI=
MONGODB_DB=reycloudshop

TOKEN_BOT=
ID_OWN=

API_TOKEN=
API_DOMAIN=

ADMIN_USERNAME=
ADMIN_PASSWORD=
```

## 🚀 Deployment

Project dapat dideploy ke Vercel.

Pastikan seluruh environment variable sudah ditambahkan ke Vercel sebelum deployment.

Deploy:

```bash
vercel
```

Production:

```bash
vercel --prod
```

## 🔄 User Workflow

```text
Register
   ↓
MongoDB
   ↓
Dashboard
   ↓
Choose Feature
   ├── Deploy
   ├── Scrape
   ├── Report
   ├── Tools
   ├── Activity
   └── Settings
```

## 🔄 Admin Workflow

```text
Login
   ↓
Admin Role
   ↓
Admin Dashboard
   ├── Activity Update
   ├── Maintenance
   └── Request
```

## 📌 Version

```text
ReyCloudShop v1.0.0
```

## 👑 ReyCloudShop

```text
REYCLOUDSHOP

Deploy.
Build.
Manage.

Powered by ReyCloudShop
```

## 📜 License

Project ini merupakan project ReyCloudShop.

Penggunaan, modifikasi, dan redistribusi mengikuti ketentuan yang ditetapkan oleh pemilik project.
