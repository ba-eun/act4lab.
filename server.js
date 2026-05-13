import cookieParser from "cookie-parser";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import express from "express";
import multer from "multer";
import defaultContent from "./src/content.js";

const app = express();
const port = Number(process.env.PORT || 3000);
const rootDir = process.cwd();
const dataDir = path.join(rootDir, "data");
const uploadsDir = path.join(rootDir, "uploads");
const contentFile = path.join(dataDir, "content.json");
const adminUser = process.env.ADMIN_USER || "admin";
const adminPassword = process.env.ADMIN_PASSWORD || "Act4lab@2026";
const sessionSecret = process.env.SESSION_SECRET || "change-this-session-secret-before-production";
const sessions = new Map();

async function ensureStorage() {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.mkdir(uploadsDir, { recursive: true });
  try {
    await fs.access(contentFile);
  } catch {
    await fs.writeFile(contentFile, `${JSON.stringify(defaultContent, null, 2)}\n`, "utf8");
  }
}

function sign(value) {
  return crypto.createHmac("sha256", sessionSecret).update(value).digest("hex");
}

function createSession() {
  const id = crypto.randomBytes(24).toString("hex");
  const token = `${id}.${sign(id)}`;
  sessions.set(id, { createdAt: Date.now() });
  return token;
}

function readSession(token = "") {
  const [id, signature] = token.split(".");
  if (!id || !signature || signature !== sign(id)) return null;
  return sessions.has(id) ? id : null;
}

function requireAuth(req, res, next) {
  const id = readSession(req.cookies.act4_session);
  if (!id) return res.status(401).json({ error: "Unauthorized" });
  return next();
}

function readRequestScope(req) {
  return {
    pagePath: String(req.query.pagePath || req.get("x-act4-page-path") || "").trim(),
    moduleKey: String(req.query.module || req.get("x-act4-module") || "").trim(),
    action: String(req.query.action || req.get("x-act4-action") || "").trim(),
    columnId: String(req.query.columnId || req.get("x-act4-column-id") || "").trim(),
  };
}

function makeId(value = "item") {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || `item-${Date.now()}`;
}

function attachmentUrl(value) {
  if (!value) return "";
  if (Array.isArray(value)) return attachmentUrl(value.find((item) => attachmentUrl(item)));
  if (typeof value === "string") return value.trim();
  if (typeof value === "object") return String(value.url || value.src || value.href || "").trim();
  return "";
}

function fileNameFromUrl(url = "") {
  const name = String(url).split(/[?#]/)[0].split("/").filter(Boolean).at(-1) || "attachment";
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
}

function inferMimeType(url = "") {
  const ext = String(url).split(/[?#]/)[0].split(".").pop()?.toLowerCase() || "";
  const map = {
    avif: "image/avif",
    gif: "image/gif",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    svg: "image/svg+xml",
    webp: "image/webp",
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    zip: "application/zip",
  };
  return map[ext] || "";
}

function normalizeAttachment(value) {
  const url = attachmentUrl(value);
  if (!url) return null;
  const metadata = typeof value === "object" && value ? value : {};
  return {
    url,
    name: metadata.name || metadata.originalName || fileNameFromUrl(url),
    size: Number(metadata.size || 0),
    type: metadata.type || metadata.mime || metadata.contentType || inferMimeType(url),
    createdAt: metadata.createdAt || "",
  };
}

function normalizeAttachmentList(...values) {
  const seen = new Set();
  return values
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .map((value) => normalizeAttachment(value))
    .filter(Boolean)
    .filter((attachment) => {
      if (seen.has(attachment.url)) return false;
      seen.add(attachment.url);
      return true;
    });
}

function withAttachmentFields(source, legacyKey) {
  const attachments = normalizeAttachmentList(source.attachments, source[legacyKey]);
  return {
    attachments,
    [legacyKey]: attachments[0] || source[legacyKey] || "",
  };
}

function normalizeBoardItem(item, fallback = {}) {
  const source = typeof item === "string" ? { title: item, intro: item } : item || {};
  const title = source.title || fallback.title || "Untitled";
  return {
    id: source.id || makeId(title),
    title,
    date: source.date || fallback.date || "",
    intro: source.intro || source.text || fallback.intro || "",
    people: source.people || fallback.people || "",
    ...withAttachmentFields({ ...fallback, ...source }, "image"),
    body: source.body || source.text || fallback.body || "",
  };
}

function normalizeWork(item = {}) {
  const title = item.title || "Untitled";
  return {
    id: item.id || makeId(title),
    title,
    date: item.date || "",
    text: item.text || item.intro || "",
    people: item.people || "",
    ...withAttachmentFields(item, "image"),
    body: item.body || item.text || item.intro || "",
  };
}

function normalizePerson(item = {}) {
  if (Array.isArray(item)) {
    return {
      id: makeId(item[0]),
      photo: "",
      attachments: [],
      name: item[0] || "Untitled",
      email: "",
      interests: item[1] || "",
      history: item[1] || "",
      experience: "",
    };
  }
  const name = item.name || item.title || "Untitled";
  return {
    id: item.id || makeId(name),
    ...withAttachmentFields({ ...item, photo: item.photo || item.image || "" }, "photo"),
    name,
    email: item.email || "",
    interests: item.interests || item.interest || item.text || "",
    history: item.history || item.bio || "",
    experience: item.experience || "",
  };
}

function safeContent(input) {
  const boardInput = input.board || {};
  const legacyNews = Array.isArray(input.news) ? input.news : [];
  const legacyProjects = Array.isArray(input.projects) ? input.projects : [];
  const legacyRows = Array.isArray(input.boardRows)
    ? input.boardRows.map(([date, title, text]) => ({ date, title, intro: text, body: text }))
    : [];

  return {
    ...defaultContent,
    ...input,
    site: { ...defaultContent.site, ...(input.site || {}) },
    homeIntro: Array.isArray(input.homeIntro) ? input.homeIntro : defaultContent.homeIntro,
    about: {
      ...defaultContent.about,
      ...(input.about || {}),
      sections: Array.isArray(input.about?.sections) ? input.about.sections : defaultContent.about.sections,
    },
    board: {
      news: (Array.isArray(boardInput.news) ? boardInput.news : legacyNews.length ? legacyNews : legacyRows).map((item) =>
        normalizeBoardItem(item),
      ),
      projects: (Array.isArray(boardInput.projects) ? boardInput.projects : legacyProjects).map((item) =>
        normalizeBoardItem(item),
      ),
      research: (Array.isArray(boardInput.research) ? boardInput.research : defaultContent.board.research).map((item) =>
        normalizeBoardItem(item),
      ),
    },
    news: undefined,
    works: (Array.isArray(input.works) ? input.works : defaultContent.works).map((item) => normalizeWork(item)),
    projects: undefined,
    archive: Array.isArray(input.archive) ? input.archive : defaultContent.archive,
    people: (Array.isArray(input.people) ? input.people : defaultContent.people).map((item) => normalizePerson(item)),
    boardRows: undefined,
  };
}

function uploadKeyFromUrl(value) {
  const url = typeof value === "object" && value ? value.url : value;
  const match = String(url || "").match(/\/uploads\/([^?#]+)/);
  const key = match ? decodeURIComponent(match[1]) : "";
  return key && !/[\\/]/.test(key) ? key : "";
}

function collectUploadKeys(value, keys = new Set()) {
  if (!value) return keys;
  if (typeof value === "string") {
    const key = uploadKeyFromUrl(value);
    if (key) keys.add(key);
    return keys;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectUploadKeys(item, keys));
    return keys;
  }
  if (typeof value === "object") {
    const key = uploadKeyFromUrl(value);
    if (key) keys.add(key);
    Object.values(value).forEach((item) => collectUploadKeys(item, keys));
  }
  return keys;
}

async function deleteUnreferencedUploads(before, after) {
  const beforeKeys = collectUploadKeys(before);
  const afterKeys = collectUploadKeys(after);
  await Promise.all([...beforeKeys].filter((key) => !afterKeys.has(key)).map((key) => fs.rm(path.join(uploadsDir, key), { force: true }).catch(() => null)));
}

async function readContent() {
  const raw = await fs.readFile(contentFile, "utf8");
  return safeContent(JSON.parse(raw));
}

async function writeContent(content) {
  await fs.writeFile(contentFile, `${JSON.stringify(safeContent(content), null, 2)}\n`, "utf8");
}

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (_req, file, callback) => {
      const ext = path.extname(file.originalname).toLowerCase() || ".bin";
      callback(null, `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`);
    },
  }),
});

await ensureStorage();

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use("/api", (_req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
});
app.use("/uploads", express.static(uploadsDir, { maxAge: "1y", immutable: true }));

app.get("/api/session", (req, res) => {
  res.json({ authenticated: Boolean(readSession(req.cookies.act4_session)) });
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "act4lab" });
});

app.post("/api/login", (req, res) => {
  const { username, password } = req.body || {};
  if (username !== adminUser || password !== adminPassword) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  res.cookie("act4_session", createSession(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 8,
  });
  return res.json({ ok: true });
});

app.post("/api/logout", (req, res) => {
  const id = readSession(req.cookies.act4_session);
  if (id) sessions.delete(id);
  res.clearCookie("act4_session");
  res.json({ ok: true });
});

app.get("/api/content", async (req, res) => {
  const scope = readRequestScope(req);
  if (scope.pagePath) res.set("X-Act4-Page-Path", scope.pagePath);
  res.json(await readContent());
});

app.put("/api/content", requireAuth, async (req, res) => {
  const scope = readRequestScope(req);
  if (!scope.pagePath) return res.status(400).json({ error: "Missing pagePath" });
  const previous = await readContent();
  const content = {
    ...safeContent(req.body || {}),
    updatedAt: new Date().toISOString(),
  };
  await writeContent(content);
  await deleteUnreferencedUploads(previous, content);
  res.json({ ok: true, content, scope });
});

app.post("/api/upload", requireAuth, upload.any(), (req, res) => {
  const files = req.files || [];
  if (!files.length) return res.status(400).json({ error: "No file uploaded" });
  const attachments = files.map((file) => ({
    url: `/uploads/${file.filename}`,
    name: file.originalname || file.filename,
    size: file.size,
    type: file.mimetype || "application/octet-stream",
    createdAt: new Date().toISOString(),
  }));
  res.json({ ...attachments[0], attachment: attachments[0], attachments });
});

app.use(express.static(path.join(rootDir, "dist")));

app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(rootDir, "dist", "index.html"));
});

app.listen(port, () => {
  console.log(`ACT IV server listening on http://localhost:${port}`);
  console.log(`Admin user: ${adminUser}`);
});
