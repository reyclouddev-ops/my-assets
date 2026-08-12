const { MongoClient } = require("mongodb");

let clientPromise;

function getClient() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI belum dikonfigurasi.");
  }

  if (!clientPromise) {
    const client = new MongoClient(process.env.MONGODB_URI);
    clientPromise = client.connect();
  }

  return clientPromise;
}

function clean(value, max = 500) {
  return String(value || "")
    .trim()
    .slice(0, max);
}

module.exports = async function (req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method tidak diizinkan."
    });
  }

  try {
    const adminUser = req.headers["x-admin-user"] || "";
    const adminPass = req.headers["x-admin-pass"] || "";

    if (
      adminUser !== process.env.ADMIN_USERNAME ||
      adminPass !== process.env.ADMIN_PASSWORD
    ) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized."
      });
    }

    const {
      type,
      title,
      description,
      version,
      date,
      time
    } = req.body || {};

    if (!title) {
      return res.status(400).json({
        success: false,
        error: "Judul activity wajib diisi."
      });
    }

    const client = await getClient();

    const db = client.db(
      process.env.MONGODB_DB || "reycloudshop"
    );

    const activity = {
      type: clean(type || "update", 30),
      title: clean(title, 150),
      description: clean(description, 1000),
      version: clean(version, 50),
      date: clean(date, 50),
      time: clean(time, 50),
      createdAt: new Date()
    };

    const result = await db
      .collection("activities")
      .insertOne(activity);

    return res.status(201).json({
      success: true,
      message: "Activity berhasil ditambahkan.",
      id: String(result.insertedId)
    });
  } catch (error) {
    console.error("[ADMIN ACTIVITY]", error);

    return res.status(500).json({
      success: false,
      error: "Gagal menambahkan activity."
    });
  }
};
