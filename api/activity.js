const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "activity.json");

const TYPES = [
  "update",
  "maintenance",
  "request",
  "fix"
];

function ensureStorage() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, {
      recursive: true
    });
  }

  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(
      DATA_FILE,
      "[]",
      "utf8"
    );
  }
}

function readActivities() {
  ensureStorage();

  try {
    const data = fs.readFileSync(
      DATA_FILE,
      "utf8"
    );

    const parsed = JSON.parse(data);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}

function writeActivities(data) {
  ensureStorage();

  fs.writeFileSync(
    DATA_FILE,
    JSON.stringify(
      data,
      null,
      2
    ),
    "utf8"
  );
}

function createId() {
  return (
    Date.now().toString(36) +
    Math.random()
      .toString(36)
      .slice(2, 8)
  );
}

function clean(value, max = 500) {
  return String(value || "")
    .trim()
    .slice(0, max);
}

function normalizeType(value) {
  const type = String(
    value || ""
  )
    .trim()
    .toLowerCase();

  return TYPES.includes(type)
    ? type
    : null;
}

function json(res, status, data) {
  res.statusCode = status;
  res.setHeader(
    "Content-Type",
    "application/json; charset=utf-8"
  );

  res.end(
    JSON.stringify(data)
  );
}

function readBody(req) {
  return new Promise(
    (resolve, reject) => {
      let body = "";

      req.on(
        "data",
        chunk => {
          body += chunk;

          if (
            body.length >
            1024 * 1024
          ) {
            reject(
              new Error(
                "Request terlalu besar."
              )
            );

            req.destroy();
          }
        }
      );

      req.on(
        "end",
        () => {
          try {
            resolve(
              body
                ? JSON.parse(body)
                : {}
            );
          } catch {
            reject(
              new Error(
                "JSON tidak valid."
              )
            );
          }
        }
      );

      req.on(
        "error",
        reject
      );
    }
  );
}

module.exports = async function (
  req,
  res
) {
  try {
    if (
      req.method ===
      "GET"
    ) {
      const activities =
        readActivities()
          .sort(
            (a, b) =>
              new Date(b.createdAt) -
              new Date(a.createdAt)
          );

      return json(
        res,
        200,
        {
          success: true,
          activities
        }
      );
    }

    if (
      req.method ===
      "POST"
    ) {
      const body =
        await readBody(req);

      const type =
        normalizeType(
          body.type
        );

      const title =
        clean(
          body.title,
          120
        );

      const description =
        clean(
          body.description,
          1000
        );

      const version =
        clean(
          body.version,
          50
        );

      if (!type) {
        return json(
          res,
          400,
          {
            success: false,
            error:
              "Kategori activity tidak valid."
          }
        );
      }

      if (!title) {
        return json(
          res,
          400,
          {
            success: false,
            error:
              "Judul activity wajib diisi."
          }
        );
      }

      if (!description) {
        return json(
          res,
          400,
          {
            success: false,
            error:
              "Deskripsi activity wajib diisi."
          }
        );
      }

      const now =
        new Date();

      const activity = {
        id: createId(),
        type,
        title,
        description,
        version:
          version || null,
        createdAt:
          now.toISOString()
      };

      const activities =
        readActivities();

      activities.unshift(
        activity
      );

      writeActivities(
        activities
      );

      return json(
        res,
        201,
        {
          success: true,
          message:
            "Activity berhasil dibuat.",
          activity
        }
      );
    }

    if (
      req.method ===
      "DELETE"
    ) {
      const body =
        await readBody(req);

      const id =
        clean(
          body.id,
          100
        );

      if (!id) {
        return json(
          res,
          400,
          {
            success: false,
            error:
              "ID activity wajib diisi."
          }
        );
      }

      const activities =
        readActivities();

      const filtered =
        activities.filter(
          item =>
            item.id !== id
        );

      if (
        filtered.length ===
        activities.length
      ) {
        return json(
          res,
          404,
          {
            success: false,
            error:
              "Activity tidak ditemukan."
          }
        );
      }

      writeActivities(
        filtered
      );

      return json(
        res,
        200,
        {
          success: true,
          message:
            "Activity berhasil dihapus."
        }
      );
    }

    res.setHeader(
      "Allow",
      "GET, POST, DELETE"
    );

    return json(
      res,
      405,
      {
        success: false,
        error:
          "Method tidak diizinkan."
      }
    );
  } catch (error) {
    console.error(
      "[ACTIVITY API]",
      error
    );

    return json(
      res,
      500,
      {
        success: false,
        error:
          error.message ||
          "Internal server error."
      }
    );
  }
};
