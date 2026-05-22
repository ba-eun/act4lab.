import { json, requireAuth } from "../_shared/auth.js";

const DEFAULT_MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024;
const MAX_CHUNK_BYTES = 18 * 1024 * 1024;
const VIDEO_UPLOAD_EXTENSIONS = new Set(["avi", "m4v", "mov", "mp4", "ogv", "webm"]);
const SUPPORTED_VIDEO_TYPES_MESSAGE = "不支持的视频格式，仅支持 MP4、MOV、AVI、M4V、OGV、WEBM。";

function extensionFromName(name = "") {
  return name.includes(".") ? name.split(".").pop().toLowerCase().replace(/[^a-z0-9]/g, "") : "bin";
}

function inferMimeType(extension = "") {
  const map = {
    avi: "video/x-msvideo",
    m4v: "video/x-m4v",
    mov: "video/quicktime",
    mp4: "video/mp4",
    ogv: "video/ogg",
    webm: "video/webm",
  };
  return map[extension] || "application/octet-stream";
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

function normalizeMaxUploadBytes(value) {
  const nextValue = Number(value || DEFAULT_MAX_UPLOAD_BYTES);
  return Number.isFinite(nextValue) && nextValue > 0 ? nextValue : DEFAULT_MAX_UPLOAD_BYTES;
}

function safeFileName(name = "") {
  return String(name || "video").replace(/[\r\n"]/g, "_");
}

function safeUploadKey(uploadId = "", fileName = "") {
  const extension = extensionFromName(uploadId || fileName);
  if (!VIDEO_UPLOAD_EXTENSIONS.has(extension)) return "";
  const key = String(uploadId || `${Date.now()}-${crypto.randomUUID()}.${extension}`)
    .split(/[\\/]/)
    .pop()
    .replace(/[^a-zA-Z0-9._-]/g, "");
  return key.endsWith(`.${extension}`) ? key : `${key || `${Date.now()}-${crypto.randomUUID()}`}.${extension}`;
}

function isAllowedVideo(fileName = "", fileType = "") {
  const extension = extensionFromName(fileName);
  const type = String(fileType || "").toLowerCase();
  return VIDEO_UPLOAD_EXTENSIONS.has(extension) && (!type || type.startsWith("video/") || type === "application/octet-stream");
}

function chunkPartKey(key, index) {
  return `upload:${key}:part:${index}`;
}

export async function onRequestPost({ request, env }) {
  const blocked = await requireAuth(request, env);
  if (blocked) return blocked;

  const maxUploadBytes = normalizeMaxUploadBytes(env.MAX_UPLOAD_BYTES);
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength && contentLength > MAX_CHUNK_BYTES + 1024 * 1024) {
    return json({ error: `单个视频分片过大，请重新选择文件后再试。` }, { status: 413 });
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "视频分片请求无法解析，可能是网络中断，请重试。" }, { status: 400 });
  }

  const file = form.get("file");
  const fileName = safeFileName(form.get("fileName") || file?.name || "");
  const fileType = String(form.get("fileType") || file?.type || inferMimeType(extensionFromName(fileName)));
  const fileSize = Number(form.get("fileSize") || file?.size || 0);
  const chunkIndex = Number(form.get("chunkIndex"));
  const chunkCount = Number(form.get("chunkCount"));
  const chunkSize = Number(form.get("chunkSize") || MAX_CHUNK_BYTES);
  const key = safeUploadKey(form.get("uploadId"), fileName);

  if (!(file instanceof File) || !file.size) {
    return json({ error: "没有收到视频分片，请重新选择视频文件。" }, { status: 400 });
  }
  if (!key || !isAllowedVideo(fileName, fileType)) {
    return json({ error: SUPPORTED_VIDEO_TYPES_MESSAGE }, { status: 415 });
  }
  if (!Number.isInteger(chunkIndex) || !Number.isInteger(chunkCount) || chunkIndex < 0 || chunkCount < 1 || chunkIndex >= chunkCount) {
    return json({ error: "视频分片序号异常，请重新上传。" }, { status: 400 });
  }
  if (!Number.isFinite(chunkSize) || chunkSize <= 0 || chunkSize > MAX_CHUNK_BYTES) {
    return json({ error: "视频分片大小异常，请重新上传。" }, { status: 400 });
  }
  if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > maxUploadBytes) {
    return json({ error: `视频文件过大，当前上传上限为 ${formatUploadSize(maxUploadBytes)}。` }, { status: 413 });
  }
  if (file.size > MAX_CHUNK_BYTES) {
    return json({ error: `单个视频分片过大，请重新选择文件后再试。` }, { status: 413 });
  }
  if (!env.ACT4_CONTENT) {
    return json({ error: "文件存储服务未配置，请联系管理员。" }, { status: 500 });
  }

  const attachment = {
    url: `/uploads/${key}`,
    name: fileName,
    size: fileSize,
    type: fileType || inferMimeType(extensionFromName(key)),
    createdAt: new Date().toISOString(),
  };
  const metadata = {
    contentType: attachment.type,
    originalName: attachment.name,
    size: String(attachment.size),
    createdAt: attachment.createdAt,
    chunked: "true",
    chunks: String(chunkCount),
    chunkSize: String(chunkSize),
    complete: chunkIndex === chunkCount - 1 ? "true" : "false",
  };

  try {
    await env.ACT4_CONTENT.put(chunkPartKey(key, chunkIndex), await file.arrayBuffer());
    await env.ACT4_CONTENT.put(`upload:${key}`, JSON.stringify({ chunked: true, chunks: chunkCount }), { metadata });
  } catch {
    return json({ error: "视频分片存储失败，请稍后重试。" }, { status: 500 });
  }

  if (chunkIndex !== chunkCount - 1) {
    return json({ ok: true, received: chunkIndex + 1, total: chunkCount });
  }

  return json({ ok: true, attachment, attachments: [attachment], ...attachment });
}
