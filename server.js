import cookieParser from "cookie-parser";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import express from "express";
import multer from "multer";
import defaultContent from "./src/content.js";
import { cloneFieldSchemas, moduleFieldNativeKey } from "./src/fieldSchemas.js";

const app = express();
const port = Number(process.env.PORT || 3000);
const rootDir = process.cwd();
const dataDir = path.join(rootDir, "data");
const uploadsDir = path.join(rootDir, "uploads");
const contentFile = path.join(dataDir, "content.json");
const defaultAdminUser = "act4lab";
const defaultAdminPassword = "ActIVLab.";
const defaultSessionSecret = "change-this-session-secret-before-production";
const isProduction = process.env.NODE_ENV === "production";
const allowDefaultAdmin = !isProduction || process.env.ALLOW_DEFAULT_ADMIN === "true";
const adminUser = process.env.ADMIN_USER || (allowDefaultAdmin ? defaultAdminUser : "");
const adminPassword = process.env.ADMIN_PASSWORD || (allowDefaultAdmin ? defaultAdminPassword : "");
const sessionSecret = process.env.SESSION_SECRET || (!isProduction ? defaultSessionSecret : "");
const DEFAULT_MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024;
const MAX_UPLOAD_FILE_COUNT = 12;
const CHUNKED_UPLOAD_CHUNK_BYTES = 18 * 1024 * 1024;
const maxUploadBytes = Number(process.env.MAX_UPLOAD_BYTES || DEFAULT_MAX_UPLOAD_BYTES);
const PEOPLE_CATEGORY_DEFAULT = "members";
const PEOPLE_CATEGORY_IDS = new Set(["director", "faculty", "members", "former"]);
const DEFAULT_MEDIA_CANVAS_RATIO = 1.6;
const DEFAULT_MEDIA_ITEM_WIDTH = 0.32;
const DEFAULT_MEDIA_ITEM_HEIGHT = 0.42;
const DEFAULT_LAYOUT_CANVAS_RATIO = 1.6;
const STACK_LAYOUT_MODE = "stack";
const DEFAULT_STACK_FIELD_WIDTH = 0.28;
const DEFAULT_STACK_FIELD_HEIGHT = 0.18;
const DEFAULT_STACK_TEXT_WIDTH = DEFAULT_STACK_FIELD_WIDTH;
const DEFAULT_STACK_TEXT_HEIGHT = 0.04;
const DEFAULT_STACK_ATTACHMENT_WIDTH = 0.78;
const DEFAULT_STACK_ATTACHMENT_HEIGHT = 0.5;
const STACK_TEXT_ITEM_TYPE = "text";
const MIN_STACK_ITEM_RATIO = 0.02;
const DETAIL_CANVAS_CONTENT_FIELD_IDS = new Set(["body"]);
const DETAIL_FIXED_INTRO_FIELD_IDS = new Set(["text", "intro", "introduction"]);

function isFixedIntroFieldId(fieldId) {
  return DETAIL_FIXED_INTRO_FIELD_IDS.has(String(fieldId || "").trim());
}

function legacyIntroFieldIdFromTextId(rawId, validFieldIds = null) {
  const match = String(rawId || "").trim().match(/^legacy-(text|intro|introduction)(?:-\d+)?$/);
  if (!match) return "";
  if (!validFieldIds) return match[1];
  if (validFieldIds.has(match[1])) return match[1];
  return ["intro", "text", "introduction"].find((fieldId) => validFieldIds.has(fieldId)) || "";
}

function legacyIntroductionTextFromLayout(contentLayout) {
  if (!Array.isArray(contentLayout?.items)) return "";
  const legacyItem = contentLayout.items.find((item) => (
    item?.type === STACK_TEXT_ITEM_TYPE
    && legacyIntroFieldIdFromTextId(item.id)
    && stackTextValue(item).trim()
  ));
  return legacyItem ? stackTextValue(legacyItem) : "";
}

function legacyContentFieldIdFromTextId(rawId, validFieldIds = null) {
  const match = String(rawId || "").trim().match(/^legacy-(body)(?:-\d+)?$/);
  const fieldId = match?.[1] || "";
  if (!fieldId || !DETAIL_CANVAS_CONTENT_FIELD_IDS.has(fieldId)) return "";
  if (validFieldIds && !validFieldIds.has(fieldId)) return "";
  return fieldId;
}
const sessions = new Map();
const ALLOWED_UPLOAD_EXTENSIONS = new Set([
  "avif",
  "gif",
  "jpg",
  "jpeg",
  "png",
  "webp",
  "avi",
  "m4v",
  "mov",
  "mp4",
  "ogv",
  "webm",
  "mp3",
  "ogg",
  "wav",
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "csv",
  "zip",
  "rar",
  "7z",
]);
const VIDEO_UPLOAD_EXTENSIONS = new Set(["avi", "m4v", "mov", "mp4", "ogv", "webm"]);
const SUPPORTED_UPLOAD_TYPES_MESSAGE = "不支持的文件格式，仅支持 MP4、MOV、AVI、M4V、OGV、WEBM 等视频，以及 JPG、PNG、PDF、DOCX、ZIP 等常见附件。";

function normalizePeopleCategory(value) {
  const normalized = String(value || "").trim().toLowerCase().replace(/[\s_]+/g, "-");
  if (normalized === "former-members" || normalized === "past" || normalized === "alumni") return "former";
  return PEOPLE_CATEGORY_IDS.has(normalized) ? normalized : PEOPLE_CATEGORY_DEFAULT;
}

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

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value)));
}

function normalizeStoredCrop(value) {
  if (!value || typeof value !== "object") return null;
  const x = Number(value.x);
  const y = Number(value.y);
  const zoom = Number(value.zoom);
  if (![x, y, zoom].every(Number.isFinite)) return null;
  return {
    x: clamp(x, 0, 1),
    y: clamp(y, 0, 1),
    zoom: clamp(zoom, 1, 2.5),
  };
}

function normalizeFieldLabels(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .map(([key, label]) => [String(key || "").trim(), String(label || "").trim()])
      .filter(([key, label]) => key && label),
  );
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

function normalizePosterAttachment(value) {
  const source = value?.file || value;
  const url = attachmentUrl(source);
  if (!url) return null;
  const metadata = typeof source === "object" && source ? source : {};
  const type = metadata.type || metadata.mime || metadata.contentType || inferMimeType(url);
  if (!(type?.startsWith("image/") || /\.(avif|gif|jpe?g|png|svg|webp)$/i.test(url))) return null;
  const crop = normalizeStoredCrop(value?.crop || metadata.crop);
  return {
    url,
    name: metadata.name || metadata.originalName || fileNameFromUrl(url),
    size: Number(metadata.size || 0),
    type,
    createdAt: metadata.createdAt || "",
    ...(crop ? { crop } : {}),
  };
}

function normalizeVideoPoster(value = {}) {
  if (!value || typeof value !== "object") return null;
  return [
    value.poster,
    value.posterUrl,
    value.thumbnail,
    value.thumbnailUrl,
    value.thumb,
    value.preview,
    value.previewImage,
    value.coverImage,
    value.coverUrl,
    value.cover,
  ].map((candidate) => normalizePosterAttachment(candidate)).find(Boolean) || null;
}

function inferMimeTypeFromExtension(ext = "") {
  return inferMimeType(`file.${ext}`) || "application/octet-stream";
}

function formatUploadSize(bytes) {
  const units = ["B", "KB", "MB", "GB"];
  let size = Number(bytes);
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size >= 10 || unitIndex === 0 ? Math.round(size) : size.toFixed(1)} ${units[unitIndex]}`;
}

function extensionFromName(name = "") {
  return name.includes(".") ? name.split(".").pop().toLowerCase().replace(/[^a-z0-9]/g, "") : "";
}

function isAllowedUpload(file = {}) {
  const extension = extensionFromName(file.originalname || file.filename || "");
  const type = String(file.mimetype || "").toLowerCase();
  if (extension === "svg" || type === "image/svg+xml") return false;
  return ALLOWED_UPLOAD_EXTENSIONS.has(extension);
}

function isAllowedVideoUpload(file = {}) {
  const extension = extensionFromName(file.originalname || file.filename || file.name || "");
  const type = String(file.mimetype || file.type || "").toLowerCase();
  return VIDEO_UPLOAD_EXTENSIONS.has(extension) && (!type || type.startsWith("video/") || type === "application/octet-stream");
}

function safeUploadKey(uploadId = "", fileName = "") {
  const extension = extensionFromName(uploadId || fileName);
  if (!VIDEO_UPLOAD_EXTENSIONS.has(extension)) return "";
  const key = String(uploadId || `${Date.now()}-${crypto.randomBytes(8).toString("hex")}.${extension}`)
    .split(/[\\/]/)
    .pop()
    .replace(/[^a-zA-Z0-9._-]/g, "");
  return key.endsWith(`.${extension}`) ? key : `${key || `${Date.now()}-${crypto.randomBytes(8).toString("hex")}`}.${extension}`;
}

function uploadTargetPath(key) {
  const target = path.resolve(uploadsDir, key);
  const root = path.resolve(uploadsDir);
  return target.startsWith(`${root}${path.sep}`) ? target : "";
}

function normalizeAttachment(value) {
  const url = attachmentUrl(value);
  if (!url) return null;
  const metadata = typeof value === "object" && value ? value : {};
  const crop = normalizeStoredCrop(metadata.crop);
  const poster = normalizeVideoPoster(metadata);
  return {
    url,
    name: metadata.name || metadata.originalName || fileNameFromUrl(url),
    size: Number(metadata.size || 0),
    type: metadata.type || metadata.mime || metadata.contentType || inferMimeType(url),
    createdAt: metadata.createdAt || "",
    ...(crop ? { crop } : {}),
    ...(poster ? { poster } : {}),
  };
}

function normalizeCover(value, attachments = []) {
  const direct = normalizeAttachment(value?.file || value);
  const sourceAttachmentId = String(value?.sourceAttachmentId || "").trim();
  const fallback = normalizeAttachmentList(attachments).find((attachment) => attachment.type.startsWith("image/")) || null;
  const file = direct || fallback;
  if (!file) return null;
  const crop = normalizeStoredCrop(value?.crop || direct?.crop);
  return {
    file: crop ? { ...file, crop } : file,
    ...(crop ? { crop } : {}),
    ...(sourceAttachmentId ? { sourceAttachmentId } : {}),
  };
}

function normalizeCustomFields(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).map(([key, fieldValue]) => [String(key || "").trim(), typeof fieldValue === "string" ? fieldValue : String(fieldValue ?? "")]).filter(([key]) => key),
  );
}

function defaultStackLayoutItem(type, id, row = 0) {
  return type === "attachment"
    ? {
        id,
        type,
        row,
        x: 0,
        y: row * DEFAULT_STACK_ATTACHMENT_HEIGHT,
        w: DEFAULT_STACK_ATTACHMENT_WIDTH,
        h: DEFAULT_STACK_ATTACHMENT_HEIGHT,
        z: row + 1,
      }
    : {
        id,
        type: type === STACK_TEXT_ITEM_TYPE ? STACK_TEXT_ITEM_TYPE : "field",
        row,
        x: 0,
        y: row * (type === STACK_TEXT_ITEM_TYPE ? DEFAULT_STACK_TEXT_HEIGHT : DEFAULT_STACK_FIELD_HEIGHT),
        w: type === STACK_TEXT_ITEM_TYPE ? DEFAULT_STACK_TEXT_WIDTH : DEFAULT_STACK_FIELD_WIDTH,
        h: type === STACK_TEXT_ITEM_TYPE ? DEFAULT_STACK_TEXT_HEIGHT : DEFAULT_STACK_FIELD_HEIGHT,
        z: row + 1,
      };
}

function uniqueTextItemId(rawId, seenTextIds) {
  const baseId = String(rawId || "").trim();
  if (!seenTextIds.has(baseId)) {
    seenTextIds.add(baseId);
    return baseId;
  }
  let suffix = 2;
  let candidate = `${baseId}-${suffix}`;
  while (seenTextIds.has(candidate)) {
    suffix += 1;
    candidate = `${baseId}-${suffix}`;
  }
  seenTextIds.add(candidate);
  return candidate;
}

function isDuplicateTextLayoutItem(rawId, text, seenTextSignatures) {
  const id = String(rawId || "").trim();
  const normalizedText = String(text ?? "").replace(/\s+/g, " ").trim();
  if (!id || !normalizedText) return false;
  const signature = `${id}\n${normalizedText}`;
  if (seenTextSignatures.has(signature)) return true;
  seenTextSignatures.add(signature);
  return false;
}

function stackTextValue(item = {}) {
  return normalizeEditableText(item.text ?? item.value ?? "");
}

function normalizeEditableText(value = "") {
  return String(value ?? "").replace(/\r\n?/g, "\n");
}

function stackItemRow(item, fallback = 0) {
  const row = Number(item?.row);
  return Number.isFinite(row) ? Math.max(0, Math.round(row)) : fallback;
}

function stackItemMinRatio(type) {
  return type === STACK_TEXT_ITEM_TYPE || type === "attachment" ? MIN_STACK_ITEM_RATIO : 0.06;
}

function stackItemWidth(item, type) {
  const fallback = type === "attachment"
    ? DEFAULT_STACK_ATTACHMENT_WIDTH
    : type === STACK_TEXT_ITEM_TYPE
      ? DEFAULT_STACK_TEXT_WIDTH
      : DEFAULT_STACK_FIELD_WIDTH;
  const minWidth = stackItemMinRatio(type);
  return clamp(Number.isFinite(Number(item?.w)) ? Number(item.w) : fallback, minWidth, 1);
}

function stackItemHeight(item) {
  const fallback = item?.type === "attachment"
    ? DEFAULT_STACK_ATTACHMENT_HEIGHT
    : item?.type === STACK_TEXT_ITEM_TYPE
      ? DEFAULT_STACK_TEXT_HEIGHT
      : DEFAULT_STACK_FIELD_HEIGHT;
  const minHeight = stackItemMinRatio(item?.type);
  return clamp(Number.isFinite(Number(item?.h)) ? Number(item.h) : fallback, minHeight, 3);
}

function stackItemX(item) {
  const width = stackItemWidth(item, item?.type);
  return clamp(Number.isFinite(Number(item?.x)) ? Number(item.x) : 0, 0, Math.max(0, 1 - width));
}

function stackItemY(item, fallback = 0) {
  return clamp(Number.isFinite(Number(item?.y)) ? Number(item.y) : fallback, 0, 48);
}

function stackItemZ(item, fallback = 1) {
  const z = Math.round(Number(item?.z));
  return Number.isFinite(z) ? Math.max(1, z) : fallback;
}

function freeAttachmentBottom(items = []) {
  return items.reduce((bottom, item) => Math.max(bottom, stackItemY(item) + stackItemHeight(item)), 0);
}

function freeLayoutBottom(items = []) {
  return items.reduce((bottom, item) => Math.max(bottom, stackItemY(item) + stackItemHeight(item)), 0);
}

function stackItemFontSize(item) {
  const value = Number(item?.fontSize);
  return Number.isFinite(value) ? clamp(value, 10, 72) : null;
}

function stackItemHasManualSize(item) {
  return item?.manualSize === true;
}

function compactStackRows(items = []) {
  const groups = [];
  items.forEach((item, index) => {
    const row = stackItemRow(item, index);
    if (!groups[row]) groups[row] = [];
    groups[row].push(item);
  });
  return groups
    .filter(Boolean)
    .flatMap((rowItems, rowIndex) => rowItems.map((item) => ({ ...item, row: rowIndex })));
}

function normalizeStackContentLayout(value, fieldIds = [], attachments = []) {
  const validFieldIds = new Set(fieldIds);
  const attachmentItems = normalizeAttachmentList(attachments);
  const validAttachmentUrls = new Set(attachmentItems.map((attachment) => attachment.url));
  const inputItems = Array.isArray(value?.items) ? value.items : [];
  const legacyIntroTexts = new Set(
    inputItems
      .filter((item) => item?.type === STACK_TEXT_ITEM_TYPE && legacyIntroFieldIdFromTextId(item.id, validFieldIds))
      .map((item) => stackTextValue(item).replace(/\s+/g, " ").trim())
      .filter(Boolean),
  );
  const seenTextIds = new Set();
  const seenTextSignatures = new Set();
  const seenLegacyContentFields = new Set();
  const seenLegacyContentTexts = new Set();
  let attachmentIndex = 0;
  let fieldIndex = 0;
  const normalizedItems = inputItems
    .map((item, index) => {
      const type = item?.type === "attachment" || item?.type === "media"
        ? "attachment"
        : item?.type === STACK_TEXT_ITEM_TYPE
          ? STACK_TEXT_ITEM_TYPE
          : "field";
      const id = String(item?.id || item?.fieldId || item?.url || "").trim();
      if (!id) return null;
      if (type === "field" && !validFieldIds.has(id)) return null;
      if (type === "attachment" && !validAttachmentUrls.has(id)) return null;
      if (type === STACK_TEXT_ITEM_TYPE) {
        const text = stackTextValue(item);
        if (legacyIntroFieldIdFromTextId(id, validFieldIds)) return null;
        if (isDuplicateTextLayoutItem(id, text, seenTextSignatures)) return null;
        const legacyFieldId = legacyContentFieldIdFromTextId(id, validFieldIds);
        if (legacyFieldId) {
          const legacyText = text.replace(/\s+/g, " ").trim();
          if (legacyFieldId === "body" && legacyIntroTexts.has(legacyText)) return null;
          if (legacyText) {
            if (seenLegacyContentTexts.has(legacyText)) return null;
            seenLegacyContentTexts.add(legacyText);
          }
          if (seenLegacyContentFields.has(legacyFieldId)) return null;
          seenLegacyContentFields.add(legacyFieldId);
        }
        const textId = uniqueTextItemId(id, seenTextIds);
        const fallbackY = fieldIndex * DEFAULT_STACK_TEXT_HEIGHT;
        const fallbackZ = fieldIndex + 1;
        fieldIndex += 1;
        const fontSize = stackItemFontSize(item);
        return {
          id: textId,
          type,
          text,
          row: stackItemRow(item, index),
          x: stackItemX(item),
          y: stackItemY(item, fallbackY),
          w: stackItemWidth(item, type),
          h: stackItemHeight({ ...item, type }),
          z: stackItemZ(item, fallbackZ),
          ...(fontSize ? { fontSize } : {}),
          ...(stackItemHasManualSize(item) ? { manualSize: true } : {}),
        };
      }
      if (type === "field") {
        const fallbackY = fieldIndex * DEFAULT_STACK_FIELD_HEIGHT;
        const fallbackZ = fieldIndex + 1;
        fieldIndex += 1;
        const fontSize = stackItemFontSize(item);
        return {
          id,
          type,
          row: stackItemRow(item, index),
          x: stackItemX(item),
          y: stackItemY(item, fallbackY),
          w: stackItemWidth(item, type),
          h: stackItemHeight({ ...item, type }),
          z: stackItemZ(item, fallbackZ),
          ...(fontSize ? { fontSize } : {}),
        };
      }
      const fallbackY = attachmentIndex * DEFAULT_STACK_ATTACHMENT_HEIGHT;
      const fallbackZ = attachmentIndex + 1;
      attachmentIndex += 1;
      return {
        id,
        type,
        row: stackItemRow(item, index),
        x: stackItemX(item),
        y: stackItemY(item, fallbackY),
        w: stackItemWidth(item, type),
        h: stackItemHeight(item),
        z: stackItemZ(item, fallbackZ),
      };
    })
    .filter(Boolean);
  const compactedItems = compactStackRows(normalizedItems);
  return {
    mode: STACK_LAYOUT_MODE,
    items: compactedItems,
  };
}

function normalizeContentLayout(value, fieldIds = [], attachments = []) {
  if (value?.mode === STACK_LAYOUT_MODE) {
    return normalizeStackContentLayout(value, fieldIds, attachments);
  }
  const validFieldIds = new Set(fieldIds);
  const validAttachmentUrls = new Set(normalizeAttachmentList(attachments).map((attachment) => attachment.url));
  const inputItems = Array.isArray(value?.items) ? value.items : [];
  const items = inputItems
    .map((item, index) => {
      const type = item?.type === "media" ? "media" : "field";
      const id = String(item?.id || item?.fieldId || item?.url || "").trim();
      if (!id) return null;
      if (type === "field" && !validFieldIds.has(id)) return null;
      if (type === "media" && !validAttachmentUrls.has(id)) return null;
      const width = Number(item?.w);
      const height = Number(item?.h);
      const minWidth = type === "media" ? 0.12 : 0.2;
      const minHeight = type === "media" ? 0.12 : 0.14;
      const normalized = {
        id,
        type,
        x: clamp(Number.isFinite(Number(item?.x)) ? Number(item.x) : 0, 0, 1),
        y: clamp(Number.isFinite(Number(item?.y)) ? Number(item.y) : 0, 0, 1),
        w: clamp(Number.isFinite(width) ? width : type === "media" ? DEFAULT_MEDIA_ITEM_WIDTH : 0.42, minWidth, 1),
        h: clamp(Number.isFinite(height) ? height : type === "media" ? DEFAULT_MEDIA_ITEM_HEIGHT : 0.18, minHeight, 1),
        z: Math.max(1, Math.round(Number(item?.z) || index + 1)),
      };
      return {
        ...normalized,
        x: clamp(normalized.x, 0, 1 - normalized.w),
        y: clamp(normalized.y, 0, 1 - normalized.h),
      };
    })
    .filter(Boolean);
  if (!items.length) return null;
  const ratio = Number(value?.canvasRatio);
  return {
    canvasRatio: Number.isFinite(ratio) && ratio > 0 ? clamp(ratio, 0.6, 3) : DEFAULT_LAYOUT_CANVAS_RATIO,
    items,
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

function hasExplicitAttachments(source = {}) {
  return Object.prototype.hasOwnProperty.call(source, "attachments");
}

function stackLayoutAttachmentIds(layout) {
  if (layout?.mode !== STACK_LAYOUT_MODE || !Array.isArray(layout.items)) return null;
  return new Set(
    layout.items
      .filter((item) => item?.type === "attachment" || item?.type === "media")
      .map((item) => String(item.id || item.url || "").trim())
      .filter(Boolean),
  );
}

function pruneAttachmentsToStackLayout(source = {}, legacyKey = "image") {
  const attachmentIds = stackLayoutAttachmentIds(source.contentLayout);
  if (!attachmentIds) return source;
  const sourceAttachments = hasExplicitAttachments(source)
    ? normalizeAttachmentList(source.attachments)
    : normalizeAttachmentList(source.attachments, source[legacyKey]);
  const attachments = sourceAttachments.filter((attachment) => attachmentIds.has(attachment.url));
  return {
    ...source,
    attachments,
    [legacyKey]: attachments[0] || "",
  };
}

function defaultMediaLayoutItem(index, url, total = 1) {
  const columns = Math.max(1, Math.min(3, total));
  const row = Math.floor(index / columns);
  const column = index % columns;
  const gapX = columns === 1 ? 0 : 0.04;
  const width = columns === 1 ? 0.54 : DEFAULT_MEDIA_ITEM_WIDTH;
  const height = DEFAULT_MEDIA_ITEM_HEIGHT;
  const usedWidth = columns * width + Math.max(0, columns - 1) * gapX;
  const startX = (1 - usedWidth) / 2;
  const x = clamp(startX + column * (width + gapX), 0, 1 - width);
  const y = clamp(0.08 + row * 0.18, 0, 1 - height);
  return { url, x, y, w: width, h: height, z: index + 1 };
}

function isVisualAttachment(attachment) {
  return attachment?.type?.startsWith("image/") || attachment?.type?.startsWith("video/");
}

function normalizeMediaLayout(value, attachments = []) {
  const visuals = normalizeAttachmentList(attachments).filter(isVisualAttachment);
  if (!visuals.length) return null;
  const urlSet = new Set(visuals.map((attachment) => attachment.url));
  const inputItems = Array.isArray(value?.items) ? value.items : [];
  const normalizedItems = inputItems
    .map((item, index) => {
      const url = attachmentUrl(item?.url || item);
      if (!url || !urlSet.has(url)) return null;
      const width = Number(item?.w);
      const height = Number(item?.h);
      return {
        url,
        x: clamp(Number.isFinite(Number(item?.x)) ? Number(item.x) : 0, 0, 1),
        y: clamp(Number.isFinite(Number(item?.y)) ? Number(item.y) : 0, 0, 1),
        w: clamp(Number.isFinite(width) ? width : DEFAULT_MEDIA_ITEM_WIDTH, 0.12, 1),
        h: clamp(Number.isFinite(height) ? height : DEFAULT_MEDIA_ITEM_HEIGHT, 0.12, 1),
        z: Math.max(1, Math.round(Number(item?.z) || index + 1)),
      };
    })
    .filter(Boolean)
    .map((item) => ({
      ...item,
      x: clamp(item.x, 0, 1 - item.w),
      y: clamp(item.y, 0, 1 - item.h),
    }));
  const seen = new Set(normalizedItems.map((item) => item.url));
  const missing = visuals
    .filter((attachment) => !seen.has(attachment.url))
    .map((attachment, index) => defaultMediaLayoutItem(normalizedItems.length + index, attachment.url, visuals.length));
  const items = [...normalizedItems, ...missing];
  if (!items.length) return null;
  const ratio = Number(value?.canvasRatio);
  return {
    canvasRatio: Number.isFinite(ratio) && ratio > 0 ? clamp(ratio, 0.6, 3) : DEFAULT_MEDIA_CANVAS_RATIO,
    items,
  };
}

function withAttachmentFields(source, legacyKey) {
  const attachments = hasExplicitAttachments(source)
    ? normalizeAttachmentList(source.attachments)
    : normalizeAttachmentList(source.attachments, source[legacyKey]);
  return {
    attachments,
    [legacyKey]: attachments[0] || "",
  };
}

function normalizeBoardItem(item, fallback = {}, moduleKey = "news", fieldIds = [], options = {}) {
  const rawSource = typeof item === "string" ? { title: item, intro: item } : item || {};
  const source = options.pruneStackAttachments ? pruneAttachmentsToStackLayout(rawSource, "image") : rawSource;
  const title = source.title || fallback.title || "Untitled";
  const attachmentFields = withAttachmentFields({ ...fallback, ...source }, "image");
  const storedMediaLayout = Object.hasOwn(source, "mediaLayout") ? source.mediaLayout : fallback.mediaLayout;
  const mediaLayout = storedMediaLayout ? normalizeMediaLayout(storedMediaLayout, attachmentFields.attachments) : null;
  const contentLayout = normalizeContentLayout(source.contentLayout || fallback.contentLayout, fieldIds, attachmentFields.attachments);
  const recoveredIntro = legacyIntroductionTextFromLayout(source.contentLayout || fallback.contentLayout);
  return {
    id: source.id || makeId(title),
    title,
    date: source.date || fallback.date || "",
    createdAt: source.createdAt || fallback.createdAt || "",
    intro: source.intro || source.text || fallback.intro || recoveredIntro || "",
    people: source.people || fallback.people || "",
    ...attachmentFields,
    cover: normalizeCover(source.cover || fallback.cover, attachmentFields.attachments),
    customFields: normalizeCustomFields(source.customFields || fallback.customFields),
    body: source.body || source.text || fallback.body || "",
    ...(source.editorLayout || fallback.editorLayout ? { editorLayout: source.editorLayout || fallback.editorLayout } : {}),
    ...(mediaLayout ? { mediaLayout } : {}),
    ...(contentLayout ? { contentLayout } : {}),
  };
}

function normalizeWork(item = {}, fieldIds = [], options = {}) {
  const source = options.pruneStackAttachments ? pruneAttachmentsToStackLayout(item, "image") : item;
  const title = source.title || "Untitled";
  const attachmentFields = withAttachmentFields(source, "image");
  const mediaLayout = source.mediaLayout ? normalizeMediaLayout(source.mediaLayout, attachmentFields.attachments) : null;
  const contentLayout = normalizeContentLayout(source.contentLayout, fieldIds, attachmentFields.attachments);
  const recoveredIntro = legacyIntroductionTextFromLayout(source.contentLayout);
  return {
    id: source.id || makeId(title),
    title,
    date: source.date || "",
    createdAt: source.createdAt || "",
    text: source.text || source.intro || recoveredIntro || "",
    people: source.people || "",
    ...attachmentFields,
    cover: normalizeCover(source.cover, attachmentFields.attachments),
    customFields: normalizeCustomFields(source.customFields),
    body: source.body || source.text || source.intro || "",
    ...(source.editorLayout ? { editorLayout: source.editorLayout } : {}),
    ...(mediaLayout ? { mediaLayout } : {}),
    ...(contentLayout ? { contentLayout } : {}),
  };
}

function normalizePerson(item = {}, fieldIds = []) {
  if (Array.isArray(item)) {
    return {
      id: makeId(item[0]),
      photo: "",
      attachments: [],
      name: item[0] || "Untitled",
      category: PEOPLE_CATEGORY_DEFAULT,
      title: "",
      email: "",
      interests: item[1] || "",
      history: item[1] || "",
      experience: "",
      academicAbility: "",
      customFields: {},
    };
  }
  const name = item.name || item.title || "Untitled";
  const attachmentFields = withAttachmentFields({ ...item, photo: item.photo || item.image || "" }, "photo");
  const mediaLayout = item.mediaLayout ? normalizeMediaLayout(item.mediaLayout, attachmentFields.attachments) : null;
  const contentLayout = normalizeContentLayout(item.contentLayout, fieldIds, attachmentFields.attachments);
  return {
    id: item.id || makeId(name),
    ...attachmentFields,
    name,
    category: normalizePeopleCategory(item.category),
    title: item.title || item.role || "",
    createdAt: item.createdAt || "",
    email: item.email || "",
    interests: item.interests || item.interest || item.text || "",
    history: item.history || item.bio || "",
    experience: item.experience || "",
    academicAbility: item.academicAbility || "",
    cover: normalizeCover(item.cover, attachmentFields.attachments),
    customFields: normalizeCustomFields(item.customFields),
    ...(item.editorLayout ? { editorLayout: item.editorLayout } : {}),
    ...(mediaLayout ? { mediaLayout } : {}),
    ...(contentLayout ? { contentLayout } : {}),
  };
}

function safeContent(input, options = {}) {
  const boardInput = input.board || {};
  const legacyNews = Array.isArray(input.news) ? input.news : [];
  const legacyProjects = Array.isArray(input.projects) ? input.projects : [];
  const legacyRows = Array.isArray(input.boardRows)
    ? input.boardRows.map(([date, title, text]) => ({ date, title, intro: text, body: text }))
    : [];

  const fieldSchemas = cloneFieldSchemas(input.fieldSchemas);
  const fieldIds = Object.fromEntries(Object.entries(fieldSchemas).map(([moduleKey, fields]) => [moduleKey, fields.map((field) => field.id)]));
  return {
    ...defaultContent,
    ...input,
    site: { ...defaultContent.site, ...(input.site || {}) },
    fieldLabels: normalizeFieldLabels(input.fieldLabels),
    fieldSchemas,
    homeIntro: Array.isArray(input.homeIntro) ? input.homeIntro : defaultContent.homeIntro,
    about: {
      ...defaultContent.about,
      ...(input.about || {}),
      sections: Array.isArray(input.about?.sections) ? input.about.sections : defaultContent.about.sections,
    },
    manualSort: input.manualSort && typeof input.manualSort === "object" ? input.manualSort : {},
    board: {
      news: (Array.isArray(boardInput.news) ? boardInput.news : legacyNews.length ? legacyNews : legacyRows).map((item) =>
        normalizeBoardItem(item, {}, "news", fieldIds.news, options),
      ),
      projects: (Array.isArray(boardInput.projects) ? boardInput.projects : legacyProjects).map((item) =>
        normalizeBoardItem(item, {}, "project", fieldIds.project, options),
      ),
      research: (Array.isArray(boardInput.research) ? boardInput.research : defaultContent.board.research).map((item) =>
        normalizeBoardItem(item, {}, "publications", fieldIds.publications, options),
      ),
    },
    news: undefined,
    works: (Array.isArray(input.works) ? input.works : defaultContent.works).map((item) => normalizeWork(item, fieldIds.works, options)),
    projects: undefined,
    archive: Array.isArray(input.archive) ? input.archive : defaultContent.archive,
    people: (Array.isArray(input.people) ? input.people : defaultContent.people).map((item) => normalizePerson(item, fieldIds.people)),
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
  limits: {
    fileSize: Number.isFinite(maxUploadBytes) && maxUploadBytes > 0 ? maxUploadBytes : DEFAULT_MAX_UPLOAD_BYTES,
    files: MAX_UPLOAD_FILE_COUNT,
  },
  fileFilter: (_req, file, callback) => {
    if (isAllowedUpload(file)) callback(null, true);
    else callback(new Error("Unsupported file type"));
  },
});

const chunkUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: CHUNKED_UPLOAD_CHUNK_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    if (isAllowedVideoUpload(file)) callback(null, true);
    else callback(new Error("Unsupported video type"));
  },
});

function handleUpload(req, res, next) {
  upload.any()(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ error: `文件过大，当前上传上限为 ${formatUploadSize(maxUploadBytes)}。` });
      }
      if (error.code === "LIMIT_FILE_COUNT") {
        return res.status(413).json({ error: `一次最多上传 ${MAX_UPLOAD_FILE_COUNT} 个文件。` });
      }
      return res.status(400).json({ error: "上传请求格式不正确，请重新选择文件后再试。" });
    }
    if (error.message === "Unsupported file type") {
      return res.status(415).json({ error: SUPPORTED_UPLOAD_TYPES_MESSAGE });
    }
    return res.status(400).json({ error: "上传失败，请重新选择文件后再试。" });
  });
}

function handleChunkUpload(req, res, next) {
  chunkUpload.single("file")(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ error: "单个视频分片过大，请重新选择文件后再试。" });
      }
      return res.status(400).json({ error: "视频分片请求格式不正确，请重新选择文件后再试。" });
    }
    if (error.message === "Unsupported video type") {
      return res.status(415).json({ error: "不支持的视频格式，仅支持 MP4、MOV、AVI、M4V、OGV、WEBM。" });
    }
    return res.status(400).json({ error: "视频分片上传失败，请重新选择文件后再试。" });
  });
}

function isSpaRoute(routePath = "/") {
  const normalized = `/${String(routePath).split(/[?#]/)[0].replace(/^\/+/, "").replace(/\/+$/, "")}`.replace(/\/$/, "") || "/";
  const exactRoutes = new Set([
    "/",
    "/about-lab",
    "/people",
    "/works",
    "/board",
    "/board/news",
    "/board/project",
    "/board/publications",
    "/contact",
    "/admin",
    "/admin/about-lab",
    "/admin/people",
    "/admin/works",
    "/admin/board",
    "/admin/board/news",
    "/admin/board/project",
    "/admin/board/publications",
    "/admin/contact",
  ]);
  const detailPrefixes = [
    "/people/",
    "/works/",
    "/board/news/",
    "/board/project/",
    "/board/publications/",
    "/admin/people/",
    "/admin/works/",
    "/admin/board/news/",
    "/admin/board/project/",
    "/admin/board/publications/",
  ];
  return exactRoutes.has(normalized) || detailPrefixes.some((prefix) => normalized.startsWith(prefix) && normalized.length > prefix.length);
}

await ensureStorage();

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(express.json({ limit: "1mb" }));
app.use((error, _req, res, next) => {
  if (error instanceof SyntaxError && "body" in error) {
    return res.status(400).json({ error: "Invalid JSON" });
  }
  return next(error);
});
app.use(cookieParser());
app.use("/api", (_req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
});
app.use("/uploads", express.static(uploadsDir, {
  maxAge: "1y",
  immutable: true,
  setHeaders: (res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
  },
}));

app.get("/api/session", (req, res) => {
  res.json({ authenticated: Boolean(readSession(req.cookies.act4_session)) });
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "act4lab" });
});

app.post("/api/login", (req, res) => {
  const { username, password } = req.body || {};
  if (!adminUser || !adminPassword || !sessionSecret) {
    return res.status(503).json({ error: "Admin credentials are not configured" });
  }
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
    ...safeContent(req.body || {}, { pruneStackAttachments: true }),
    updatedAt: new Date().toISOString(),
  };
  await writeContent(content);
  await deleteUnreferencedUploads(previous, content);
  res.json({ ok: true, content, scope });
});

app.post("/api/upload", requireAuth, handleUpload, (req, res) => {
  const files = req.files || [];
  if (!files.length) return res.status(400).json({ error: "No file uploaded" });
  const attachments = files.map((file) => ({
    url: `/uploads/${file.filename}`,
    name: file.originalname || file.filename,
    size: file.size,
    type: file.mimetype || inferMimeTypeFromExtension(path.extname(file.originalname || file.filename).slice(1).toLowerCase()),
    createdAt: new Date().toISOString(),
  }));
  res.json({ ...attachments[0], attachment: attachments[0], attachments });
});

app.post("/api/upload-chunk", requireAuth, handleChunkUpload, async (req, res) => {
  const file = req.file;
  const fileName = String(req.body?.fileName || file?.originalname || "video").replace(/[\r\n"]/g, "_");
  const fileType = String(req.body?.fileType || file?.mimetype || inferMimeTypeFromExtension(path.extname(fileName).slice(1).toLowerCase()));
  const fileSize = Number(req.body?.fileSize || file?.size || 0);
  const chunkIndex = Number(req.body?.chunkIndex);
  const chunkCount = Number(req.body?.chunkCount);
  const key = safeUploadKey(req.body?.uploadId, fileName);
  const target = key ? uploadTargetPath(key) : "";
  const tempTarget = target ? `${target}.uploading` : "";

  if (!file) return res.status(400).json({ error: "没有收到视频分片，请重新选择视频文件。" });
  if (!key || !target || !isAllowedVideoUpload({ originalname: fileName, mimetype: fileType })) {
    return res.status(415).json({ error: "不支持的视频格式，仅支持 MP4、MOV、AVI、M4V、OGV、WEBM。" });
  }
  if (!Number.isInteger(chunkIndex) || !Number.isInteger(chunkCount) || chunkIndex < 0 || chunkCount < 1 || chunkIndex >= chunkCount) {
    return res.status(400).json({ error: "视频分片序号异常，请重新上传。" });
  }
  if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > maxUploadBytes) {
    return res.status(413).json({ error: `视频文件过大，当前上传上限为 ${formatUploadSize(maxUploadBytes)}。` });
  }

  try {
    if (chunkIndex === 0) await fs.writeFile(tempTarget, file.buffer);
    else await fs.appendFile(tempTarget, file.buffer);

    const attachment = {
      url: `/uploads/${key}`,
      name: fileName,
      size: fileSize,
      type: fileType || inferMimeTypeFromExtension(path.extname(fileName).slice(1).toLowerCase()),
      createdAt: new Date().toISOString(),
    };
    if (chunkIndex !== chunkCount - 1) {
      return res.json({ ok: true, received: chunkIndex + 1, total: chunkCount });
    }

    await fs.rename(tempTarget, target);
    return res.json({ ok: true, ...attachment, attachment, attachments: [attachment] });
  } catch {
    return res.status(500).json({ error: "视频分片存储失败，请稍后重试。" });
  }
});

app.use(express.static(path.join(rootDir, "dist")));

app.get(/.*/, (req, res) => {
  if (!isSpaRoute(req.path)) res.status(404);
  res.sendFile(path.join(rootDir, "dist", "index.html"));
});

app.listen(port, () => {
  console.log(`ACT IV server listening on http://localhost:${port}`);
  console.log(`Admin user: ${adminUser || "not configured"}`);
});
