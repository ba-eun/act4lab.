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

function safeContent(input) {
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
    news: Array.isArray(input.news) ? input.news : defaultContent.news,
    works: Array.isArray(input.works) ? input.works : defaultContent.works,
    projects: Array.isArray(input.projects) ? input.projects : defaultContent.projects,
    archive: Array.isArray(input.archive) ? input.archive : defaultContent.archive,
    people: Array.isArray(input.people) ? input.people : defaultContent.people,
    boardRows: Array.isArray(input.boardRows) ? input.boardRows : defaultContent.boardRows,
  };
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
  limits: {
    fileSize: 12 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    if (!file.mimetype.startsWith("image/")) {
      callback(new Error("Only image uploads are allowed"));
      return;
    }
    callback(null, true);
  },
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

app.get("/api/content", async (_req, res) => {
  res.json(await readContent());
});

app.put("/api/content", requireAuth, async (req, res) => {
  const content = {
    ...safeContent(req.body || {}),
    updatedAt: new Date().toISOString(),
  };
  await writeContent(content);
  res.json({ ok: true, content });
});

app.post("/api/upload", requireAuth, upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No image uploaded" });
  res.json({ url: `/uploads/${req.file.filename}` });
});

app.use(express.static(path.join(rootDir, "dist")));

app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(rootDir, "dist", "index.html"));
});

app.listen(port, () => {
  console.log(`ACT IV server listening on http://localhost:${port}`);
  console.log(`Admin user: ${adminUser}`);
});
