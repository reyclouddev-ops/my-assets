const fs = require("fs");
const path = require("path");
const os = require("os");
const axios = require("axios");
const AdmZip = require("adm-zip");

const VERCEL_API = "https://api.vercel.com";

const VERCEL_TOKEN = String(
  process.env.API_TOKEN || ""
).trim();

const VERCEL_DOMAIN = String(
  process.env.API_DOMAIN || ""
)
  .replace(/^https?:\/\//, "")
  .replace(/\/+$/, "");

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MAX_REQUEST_SIZE = 25 * 1024 * 1024;

module.exports.config = {
  api: {
    bodyParser: false
  }
};

function headers() {
  return {
    Authorization: `Bearer ${VERCEL_TOKEN}`,
    Accept: "application/json",
    "Content-Type": "application/json"
  };
}

function send(res, data) {
  if (res.writableEnded) return;

  res.write(`${JSON.stringify(data)}\n`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function cleanProjectName(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\.(zip|html?)$/i, "")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function validProjectName(name) {
  return /^[a-z0-9][a-z0-9-]{1,62}$/.test(name);
}

function extension(name) {
  return path.extname(name || "").toLowerCase();
}

function formatBytes(bytes) {
  const value = Number(bytes || 0);

  if (!value) {
    return "0 B";
  }

  const units = [
    "B",
    "KB",
    "MB",
    "GB"
  ];

  let size = value;
  let index = 0;

  while (
    size >= 1024 &&
    index < units.length - 1
  ) {
    size /= 1024;
    index++;
  }

  return `${size.toFixed(2)} ${units[index]}`;
}

function collectFiles(directory, base = directory) {
  const result = [];

  if (!fs.existsSync(directory)) {
    return result;
  }

  const entries = fs.readdirSync(
    directory,
    {
      withFileTypes: true
    }
  );

  for (const entry of entries) {
    const full = path.join(
      directory,
      entry.name
    );

    if (entry.isDirectory()) {
      result.push(
        ...collectFiles(
          full,
          base
        )
      );
    } else {
      result.push({
        filePath: full,
        fileName: path
          .relative(base, full)
          .replace(/\\/g, "/")
      });
    }
  }

  return result;
}

function findFile(directory, filename) {
  const target = String(
    filename || ""
  ).toLowerCase();

  return collectFiles(directory).find(
    file =>
      file.fileName.toLowerCase() === target
  );
}

function readJson(directory, filename) {
  const file = findFile(
    directory,
    filename
  );

  if (!file) {
    return null;
  }

  try {
    return JSON.parse(
      fs.readFileSync(
        file.filePath,
        "utf8"
      )
    );
  } catch {
    return null;
  }
}

function detectFramework(directory) {
  const pkg = readJson(
    directory,
    "package.json"
  );

  const vercel = readJson(
    directory,
    "vercel.json"
  );

  const dependencies = {
    ...(pkg?.dependencies || {}),
    ...(pkg?.devDependencies || {})
  };

  const names = Object.keys(
    dependencies
  ).map(name =>
    name.toLowerCase()
  );

  if (names.includes("next")) {
    return {
      name: "Next.js",
      preset: "nextjs"
    };
  }

  if (names.includes("nuxt")) {
    return {
      name: "Nuxt",
      preset: "nuxtjs"
    };
  }

  if (names.includes("astro")) {
    return {
      name: "Astro",
      preset: "astro"
    };
  }

  if (
    names.includes("@sveltejs/kit")
  ) {
    return {
      name: "SvelteKit",
      preset: "sveltekit"
    };
  }

  if (names.includes("vite")) {
    return {
      name: "Vite",
      preset: "vite"
    };
  }

  if (names.includes("react")) {
    return {
      name: "React",
      preset: "create-react-app"
    };
  }

  if (names.includes("vue")) {
    return {
      name: "Vue",
      preset: "vue"
    };
  }

  if (vercel) {
    return {
      name: "Vercel Config",
      preset: "vercel.json"
    };
  }

  if (
    findFile(
      directory,
      "index.html"
    )
  ) {
    return {
      name: "Static HTML",
      preset: "static"
    };
  }

  return {
    name: "Static / Auto",
    preset: "auto"
  };
}

function normalizeProjectRoot(directory) {
  const entries = fs.readdirSync(
    directory,
    {
      withFileTypes: true
    }
  );

  if (
    entries.length !== 1 ||
    !entries[0].isDirectory()
  ) {
    return directory;
  }

  const child = path.join(
    directory,
    entries[0].name
  );

  const childEntries = fs.readdirSync(
    child,
    {
      withFileTypes: true
    }
  );

  const hasProjectFile =
    childEntries.some(
      entry =>
        entry.name === "package.json" ||
        entry.name === "vercel.json" ||
        entry.name === "index.html"
    );

  return hasProjectFile
    ? child
    : directory;
}

function parseMultipart(req) {
  return new Promise(
    (resolve, reject) => {
      const contentType =
        req.headers["content-type"] || "";

      const match =
        contentType.match(
          /boundary=(?:"([^"]+)"|([^;]+))/
        );

      if (!match) {
        reject(
          new Error(
            "Multipart boundary tidak ditemukan."
          )
        );
        return;
      }

      const boundary =
        match[1] || match[2];

      const chunks = [];
      let received = 0;
      let finished = false;

      const fail = error => {
        if (finished) return;
        finished = true;
        reject(error);
      };

      req.on(
        "data",
        chunk => {
          received += chunk.length;

          if (
            received >
            MAX_REQUEST_SIZE
          ) {
            fail(
              new Error(
                "Ukuran request terlalu besar."
              )
            );

            req.destroy();
            return;
          }

          chunks.push(chunk);
        }
      );

      req.on(
        "end",
        () => {
          if (finished) return;

          try {
            const buffer =
              Buffer.concat(chunks);

            const marker =
              Buffer.from(
                `--${boundary}`
              );

            const parts = [];
            let start = 0;

            while (true) {
              const index =
                buffer.indexOf(
                  marker,
                  start
                );

              if (index === -1) {
                break;
              }

              if (start !== 0) {
                parts.push(
                  buffer.slice(
                    start,
                    index
                  )
                );
              }

              start =
                index +
                marker.length;
            }

            const fields = {};
            let file = null;

            for (
              const rawPart of parts
            ) {
              let part = rawPart;

              if (
                part[0] === 13 &&
                part[1] === 10
              ) {
                part =
                  part.slice(2);
              }

              if (
                part.length >= 2 &&
                part[
                  part.length - 2
                ] === 45 &&
                part[
                  part.length - 1
                ] === 45
              ) {
                part =
                  part.slice(
                    0,
                    -2
                  );
              }

              const separator =
                Buffer.from(
                  "\r\n\r\n"
                );

              const headerEnd =
                part.indexOf(
                  separator
                );

              if (
                headerEnd === -1
              ) {
                continue;
              }

              const header =
                part
                  .slice(
                    0,
                    headerEnd
                  )
                  .toString();

              let content =
                part.slice(
                  headerEnd +
                    separator.length
                );

              if (
                content.length >= 2 &&
                content[
                  content.length - 2
                ] === 13 &&
                content[
                  content.length - 1
                ] === 10
              ) {
                content =
                  content.slice(
                    0,
                    -2
                  );
              }

              const nameMatch =
                header.match(
                  /name="([^"]+)"/
                );

              if (!nameMatch) {
                continue;
              }

              const fieldName =
                nameMatch[1];

              const filenameMatch =
                header.match(
                  /filename="([^"]*)"/
                );

              if (filenameMatch) {
                file = {
                  filename:
                    path.basename(
                      filenameMatch[1]
                    ),
                  buffer: content
                };
              } else {
                fields[fieldName] =
                  content.toString();
              }
            }

            finished = true;

            resolve({
              fields,
              file
            });
          } catch (error) {
            fail(error);
          }
        }
      );

      req.on(
        "error",
        fail
      );
    }
  );
}

async function getVercelUser() {
  const response =
    await axios.get(
      `${VERCEL_API}/v2/user`,
      {
        headers: headers(),
        timeout: 30000
      }
    );

  return response.data;
}

async function createProject(
  projectName
) {
  try {
    const response =
      await axios.post(
        `${VERCEL_API}/v9/projects`,
        {
          name: projectName
        },
        {
          headers: headers(),
          timeout: 30000
        }
      );

    return response.data;
  } catch (error) {
    if (
      error.response?.status === 409
    ) {
      const response =
        await axios.get(
          `${VERCEL_API}/v9/projects/${encodeURIComponent(projectName)}`,
          {
            headers: headers(),
            timeout: 30000
          }
        );

      return response.data;
    }

    throw error;
  }
}

async function deployFiles(
  projectName,
  directory
) {
  const files =
    collectFiles(directory);

  if (!files.length) {
    throw new Error(
      "Tidak ada file untuk dideploy."
    );
  }

  const payload = [];

  for (const file of files) {
    const buffer =
      fs.readFileSync(
        file.filePath
      );

    payload.push({
      file: file.fileName,
      data:
        buffer.toString("base64"),
      encoding: "base64"
    });
  }

  const response =
    await axios.post(
      `${VERCEL_API}/v13/deployments`,
      {
        name: projectName,
        project: projectName,
        files: payload
      },
      {
        headers: headers(),
        timeout: 120000,
        maxContentLength:
          50 * 1024 * 1024,
        maxBodyLength:
          50 * 1024 * 1024
      }
    );

  return response.data;
}

async function getDeployment(
  deploymentId
) {
  const response =
    await axios.get(
      `${VERCEL_API}/v13/deployments/${encodeURIComponent(deploymentId)}`,
      {
        headers: headers(),
        timeout: 30000
      }
    );

  return response.data;
}

async function waitDeployment(
  deploymentId,
  update
) {
  let lastState = "";

  for (
    let attempt = 0;
    attempt < 90;
    attempt++
  ) {
    const deployment =
      await getDeployment(
        deploymentId
      );

    const state =
      deployment.readyState ||
      "UNKNOWN";

    if (
      state !== lastState
    ) {
      lastState = state;

      const percent =
        Math.min(
          88,
          70 +
            Math.floor(
              attempt * 0.25
            )
        );

      await update(
        state,
        percent
      );
    }

    if (
      state === "READY"
    ) {
      return deployment;
    }

    if (
      state === "ERROR" ||
      state === "CANCELED"
    ) {
      throw new Error(
        `Deployment ${state.toLowerCase()}.`
      );
    }

    await sleep(2000);
  }

  throw new Error(
    "Deployment terlalu lama diproses."
  );
}

async function addCustomDomain(
  projectName,
  domain
) {
  try {
    const response =
      await axios.post(
        `${VERCEL_API}/v10/projects/${encodeURIComponent(projectName)}/domains`,
        {
          name: domain
        },
        {
          headers: headers(),
          timeout: 30000
        }
      );

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    const data =
      error.response?.data;

    const message =
      JSON.stringify(
        data || ""
      ).toLowerCase();

    if (
      error.response?.status === 400 ||
      error.response?.status === 409
    ) {
      if (
        message.includes("already") ||
        message.includes("exists") ||
        message.includes("assigned")
      ) {
        return {
          success: true,
          alreadyExists: true,
          data
        };
      }
    }

    return {
      success: false,
      error:
        data?.error?.message ||
        error.message
    };
  }
}

async function checkDomain(
  domain
) {
  try {
    const response =
      await axios.get(
        `${VERCEL_API}/v4/domains/${encodeURIComponent(domain)}/config`,
        {
          headers: headers(),
          timeout: 30000
        }
      );

    return response.data;
  } catch {
    return null;
  }
}

async function waitCustomDomain(
  domain,
  update
) {
  for (
    let attempt = 0;
    attempt < 30;
    attempt++
  ) {
    const result =
      await checkDomain(
        domain
      );

    if (
      result?.misconfigured === false
    ) {
      await update(
        100,
        "Custom domain aktif."
      );

      return true;
    }

    const progress =
      90 +
      Math.min(
        9,
        Math.floor(attempt / 3)
      );

    await update(
      progress,
      "Menunggu konfigurasi custom domain..."
    );

    await sleep(2000);
  }

  return false;
}

function prepareProject(
  file,
  workDir
) {
  const ext =
    extension(
      file.filename
    );

  const sourcePath =
    path.join(
      workDir,
      file.filename
    );

  fs.writeFileSync(
    sourcePath,
    file.buffer
  );

  if (ext === ".zip") {
    const siteDir =
      path.join(
        workDir,
        "site"
      );

    fs.mkdirSync(
      siteDir,
      {
        recursive: true
      }
    );

    const zip =
      new AdmZip(
        sourcePath
      );

    zip.extractAllTo(
      siteDir,
      true
    );

    return normalizeProjectRoot(
      siteDir
    );
  }

  if (
    ext === ".html" ||
    ext === ".htm"
  ) {
    const siteDir =
      path.join(
        workDir,
        "site"
      );

    fs.mkdirSync(
      siteDir,
      {
        recursive: true
      }
    );

    fs.copyFileSync(
      sourcePath,
      path.join(
        siteDir,
        "index.html"
      )
    );

    return siteDir;
  }

  throw new Error(
    "Format tidak didukung."
  );
}

function errorMessage(error) {
  return (
    error.response?.data?.error
      ?.message ||
    error.response?.data?.message ||
    error.message ||
    "Deployment gagal."
  );
}

module.exports = async function (
  req,
  res
) {
  if (
    req.method !== "POST"
  ) {
    return res.status(405).json({
      success: false,
      error: "Method tidak diizinkan."
    });
  }

  if (!VERCEL_TOKEN) {
    return res.status(500).json({
      success: false,
      error:
        "API_TOKEN belum dikonfigurasi di Vercel."
    });
  }

  res.setHeader(
    "Content-Type",
    "application/x-ndjson; charset=utf-8"
  );

  res.setHeader(
    "Cache-Control",
    "no-cache, no-transform"
  );

  res.setHeader(
    "Connection",
    "keep-alive"
  );

  res.flushHeaders?.();

  let workDir = null;

  const progress = async (
    percent,
    stage,
    message,
    extra = {}
  ) => {
    send(res, {
      success: true,
      type: "progress",
      progress: percent,
      stage,
      message,
      ...extra
    });
  };

  try {
    await progress(
      0,
      "prepare",
      "Menyiapkan deployment..."
    );

    const body =
      await parseMultipart(req);

    const projectName =
      cleanProjectName(
        body.fields.projectName
      );

    if (
      !validProjectName(
        projectName
      )
    ) {
      throw new Error(
        "Hostname tidak valid. Gunakan huruf kecil, angka, dan tanda -."
      );
    }

    if (!body.file) {
      throw new Error(
        "File project belum dikirim."
      );
    }

    const fileName =
      body.file.filename ||
      "project.zip";

    const ext =
      extension(fileName);

    if (
      ![
        ".zip",
        ".html",
        ".htm"
      ].includes(ext)
    ) {
      throw new Error(
        "Format file harus ZIP, HTML, atau HTM."
      );
    }

    if (
      body.file.buffer.length >
      MAX_FILE_SIZE
    ) {
      throw new Error(
        `Ukuran file maksimal ${formatBytes(MAX_FILE_SIZE)}.`
      );
    }

    workDir =
      fs.mkdtempSync(
        path.join(
          os.tmpdir(),
          "reycloud-deploy-"
        )
      );

    await progress(
      8,
      "upload",
      "File berhasil diterima.",
      {
        fileName,
        fileSize:
          body.file.buffer.length,
        fileSizeText:
          formatBytes(
            body.file.buffer.length
          )
      }
    );

    const siteDir =
      prepareProject(
        body.file,
        workDir
      );

    await progress(
      22,
      "extract",
      ext === ".zip"
        ? "ZIP berhasil diekstrak."
        : "HTML berhasil diproses."
    );

    const framework =
      detectFramework(
        siteDir
      );

    const siteFiles =
      collectFiles(
        siteDir
      );

    if (!siteFiles.length) {
      throw new Error(
        "Project tidak mempunyai file."
      );
    }

    await progress(
      35,
      "detect",
      "Framework berhasil dideteksi.",
      {
        framework:
          framework.name,
        preset:
          framework.preset,
        files:
          siteFiles.length
      }
    );

    await progress(
      42,
      "account",
      "Memeriksa koneksi Vercel..."
    );

    const user =
      await getVercelUser();

    await progress(
      48,
      "project",
      "Membuat project Vercel...",
      {
        projectName
      }
    );

    await createProject(
      projectName
    );

    await progress(
      55,
      "upload",
      "Mengupload project ke Vercel...",
      {
        projectName
      }
    );

    const deployment =
      await deployFiles(
        projectName,
        siteDir
      );

    await progress(
      68,
      "building",
      "Project diterima Vercel. Memulai build...",
      {
        deploymentId:
          deployment.id
      }
    );

    const ready =
      await waitDeployment(
        deployment.id,
        async (
          state,
          percent
        ) => {
          await progress(
            percent,
            "building",
            `Vercel status: ${state}`,
            {
              deploymentId:
                deployment.id,
              vercelState:
                state
            }
          );
        }
      );

    const vercelUrl =
      ready.url
        ? `https://${ready.url}`
        : `https://${projectName}.vercel.app`;

    await progress(
      90,
      "domain",
      "Deployment berhasil. Menyiapkan custom domain...",
      {
        vercelUrl
      }
    );

    let customDomain = null;
    let domainReady = false;

    if (VERCEL_DOMAIN) {
      customDomain =
        `${projectName}.${VERCEL_DOMAIN}`;

      const domainResult =
        await addCustomDomain(
          projectName,
          customDomain
        );

      if (
        domainResult.success
      ) {
        domainReady =
          await waitCustomDomain(
            customDomain,
            async (
              percent,
              message
            ) => {
              await progress(
                percent,
                "domain",
                message,
                {
                  customDomain:
                    `https://${customDomain}`
                }
              );
            }
          );
      }
    }

    const account =
      user?.user?.username ||
      user?.user?.email ||
      "-";

    const customDomainUrl =
      customDomain
        ? `https://${customDomain}`
        : null;

    await progress(
      100,
      "complete",
      "Deployment selesai!",
      {
        projectName,
        fileName,
        framework:
          framework.name,
        preset:
          framework.preset,
        files:
          siteFiles.length,
        deploymentId:
          deployment.id,
        vercelUrl,
        customDomain:
          customDomainUrl,
        domainReady,
        account
      }
    );

    send(res, {
      success: true,
      type: "complete",
      progress: 100,
      stage: "complete",
      message:
        "Deployment selesai!",
      projectName,
      fileName,
      framework:
        framework.name,
      preset:
        framework.preset,
      files:
        siteFiles.length,
      deploymentId:
        deployment.id,
      vercelUrl,
      customDomain:
        customDomainUrl,
      domainReady,
      account
    });

    res.end();
  } catch (error) {
    console.error(
      "[REYCLOUD DEPLOY]",
      error.response?.data ||
        error.message ||
        error
    );

    send(res, {
      success: false,
      type: "error",
      progress: 0,
      stage: "error",
      message:
        errorMessage(error)
    });

    res.end();
  } finally {
    if (
      workDir &&
      fs.existsSync(workDir)
    ) {
      try {
        fs.rmSync(
          workDir,
          {
            recursive: true,
            force: true
          }
        );
      } catch {}
    }
  }
};
