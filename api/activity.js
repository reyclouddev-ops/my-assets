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

module.exports = async function (req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Method tidak diizinkan."
    });
  }

  try {
    const client = await getClient();

    const db = client.db(
      process.env.MONGODB_DB || "reycloudshop"
    );

    const activities = await db
      .collection("activities")
      .find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    return res.status(200).json({
      success: true,
      activities: activities.map(item => ({
        id: String(item._id),
        type: item.type || "update",
        title: item.title || "Update",
        description: item.description || "",
        version: item.version || "",
        date: item.date || "",
        time: item.time || "",
        createdAt: item.createdAt || null
      }))
    });
  } catch (error) {
    console.error("[ACTIVITY]", error);

    return res.status(500).json({
      success: false,
      error: "Gagal mengambil activity."
    });
  }
};
