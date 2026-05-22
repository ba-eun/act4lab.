import { json, requireAuth } from "../_shared/auth.js";

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

const DEFAULT_MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024;
const MAX_UPLOAD_FILE_COUNT = 12;
const KV_SAFE_UPLOAD_BYTES = 24 * 1024 * 1024;
const KV_CHUNK_BYTES = 16 * 1024 * 1024;
const SUPPORTED_UPLOAD_TYPES_MESSAGE = "不支持的文件格式，仅支持 MP4、MOV、AVI、M4V、OGV、WEBM 等视频，以及 JPG、PNG、PDF、DOCX、ZIP 等常见附件。";

function extensionFromName(name = "") {
  return name.includes(".") ? name.split(".").pop().toLowerCase().replace(/[^a-z0-9]/g, "") : "bin";
}

function inferMimeType(extension = "") {
  const map = {
    avif: "image/avif",
    gif: "image/gif",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    svg: "image/svg+xml",
    webp: "image/webp",
    avi: "video/x-msvideo",
    m4v: "video/x-m4v",
    mov: "video/quicktime",
    mp4: "video/mp4",
    ogv: "video/ogg",
    webm: "video/webm",
    mp3: "audio/mpeg",
    ogg: "audio/ogg",
    wav: "audio/wav",
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    zip: "application/zip",
    rar: "application/vnd.rar",
    "7z": "application/x-7z-compressed",
  };
  return map[extension] || "application/octet-stream";
}

function normalizeMaxUploadBytes(value) {
  const nextValue = Number(value || DEFAULT_MAX_UPLOAD_BYTES);
  return Number.isFinite(nextValue) && nextValue > 0 ? nextValue : DEFAULT_MAX_UPLOAD_BYTES;
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

function safeFileName(name = "") {
  return String(name || "attachment").replace(/[\r\n"]/g, "_");
}

function isAllowedUpload(file) {
  const extension = extensionFromName(file.name);
  const type = String(file.type || "").toLowerCase();
  if (extension === "svg" || type === "image/svg+xml") return false;
  return ALLOWED_UPLOAD_EXTENSIONS.has(extension);
}

function uploadDisposition(attachment) {
  const type = String(attachment.type || "").toLowerCase();
  const mode = /^(image|video|audio)\//.test(type) || type === "application/pdf" ? "inline" : "attachment";
  return `${mode}; filename="${encodeURIComponent(attachment.name)}"`;
}

function uploadPartKey(key, index) {
  return `upload:${key}:part:${index}`;
}

async function storeFile(env, key, file, attachment) {
  const body = await file.arrayBuffer();
  const metadata = {
    contentType: attachment.type,
    originalName: attachment.name,
    size: String(attachment.size),
    createdAt: attachment.createdAt,
  };

  if (env.ACT4_ASSETS) {
    await env.ACT4_ASSETS.put(key, body, {
      httpMetadata: {
        contentType: attachment.type,
        contentDisposition: uploadDisposition(attachment),
      },
      customMetadata: metadata,
    });
    return;
  }

  if (!env.ACT4_CONTENT) throw new Error("CONTENT_STORAGE_MISSING");
  if (body.byteLength <= KV_SAFE_UPLOAD_BYTES) {
    await env.ACT4_CONTENT.put(`upload:${key}`, body, { metadata });
    return;
  }

  const chunks = Math.ceil(body.byteLength / KV_CHUNK_BYTES);
  await Promise.all(
    Array.from({ length: chunks }, (_, index) => {
      const start = index * KV_CHUNK_BYTES;
      return env.ACT4_CONTENT.put(uploadPartKey(key, index), body.slice(start, start + KV_CHUNK_BYTES));
    }),
  );
  await env.ACT4_CONTENT.put(`upload:${key}`, JSON.stringify({ chunked: true, chunks }), {
    metadata: {
      ...metadata,
      chunked: "true",
      chunks: String(chunks),
      chunkSize: String(KV_CHUNK_BYTES),
    },
  });
}

export async function onRequestPost({ request, env }) {
  const blocked = await requireAuth(request, env);
  if (blocked) return blocked;

  const maxUploadBytes = normalizeMaxUploadBytes(env.MAX_UPLOAD_BYTES);
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength && contentLength > maxUploadBytes + 1024 * 1024) {
    return json({ error: `文件过大，当前上传上限为 ${formatUploadSize(maxUploadBytes)}。` }, { status: 413 });
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "上传请求无法解析，可能是文件过大或网络连接中断，请重新选择文件后再试。" }, { status: 400 });
  }
  const files = [...form.getAll("file"), ...form.getAll("image")].filter((file) => file instanceof File);
  if (!files.length) {
    return json({ error: "没有收到可上传的文件，请重新选择文件。" }, { status: 400 });
  }
  if (files.length > MAX_UPLOAD_FILE_COUNT) {
    return json({ error: `一次最多上传 ${MAX_UPLOAD_FILE_COUNT} 个文件。` }, { status: 413 });
  }
  const attachments = [];
  for (const file of files) {
    if (!isAllowedUpload(file)) {
      return json({ error: SUPPORTED_UPLOAD_TYPES_MESSAGE }, { status: 415 });
    }
    if (Number.isFinite(maxUploadBytes) && maxUploadBytes > 0 && file.size > maxUploadBytes) {
      return json({ error: `文件过大，当前上传上限为 ${formatUploadSize(maxUploadBytes)}。` }, { status: 413 });
    }
    const extension = extensionFromName(file.name);
    const key = `${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const attachment = {
      url: `/uploads/${key}`,
      name: safeFileName(file.name || key),
      size: file.size,
      type: file.type || inferMimeType(extension),
      createdAt: new Date().toISOString(),
    };
    try {
      await storeFile(env, key, file, attachment);
    } catch (error) {
      return json({ error: "文件存储失败，请稍后重试。" }, { status: 500 });
    }
    attachments.push(attachment);
  }

  return json({ attachments, attachment: attachments[0], ...attachments[0] });
}
