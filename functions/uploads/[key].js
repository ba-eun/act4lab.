function inferMimeType(key = "") {
  const ext = String(key).split(/[?#]/)[0].split(".").pop()?.toLowerCase() || "";
  const map = {
    avif: "image/avif",
    gif: "image/gif",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
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
  };
  return map[ext] || "application/octet-stream";
}

function contentDisposition(type = "", name = "") {
  const normalized = String(type || "").toLowerCase();
  const mode = /^(image|video|audio)\//.test(normalized) || normalized === "application/pdf" ? "inline" : "attachment";
  return `${mode}; filename="${encodeURIComponent(name)}"`;
}

function responseHeaders({ key, type, name, size, contentLength = size, range = null }) {
  const contentType = type || inferMimeType(key);
  const filename = name || key;
  const isStreamableMedia = /^(video|audio)\//.test(String(contentType || "").toLowerCase());
  return {
    "content-type": contentType,
    "content-disposition": contentDisposition(contentType, filename),
    ...(contentLength ? { "content-length": String(contentLength) } : {}),
    ...(range ? { "content-range": `bytes ${range.start}-${range.end}/${size}` } : {}),
    "accept-ranges": "bytes",
    ...(isStreamableMedia ? { vary: "Range", "cdn-cache-control": "no-store" } : {}),
    "x-act4-original-name": filename,
    "x-content-type-options": "nosniff",
    "cache-control": isStreamableMedia ? "no-store" : "public, max-age=31536000, immutable",
  };
}

function parseRangeHeader(rangeHeader, size) {
  const normalizedSize = Number(size);
  if (!Number.isFinite(normalizedSize) || normalizedSize <= 0) return null;
  const match = String(rangeHeader || "").trim().match(/^bytes=(\d*)-(\d*)$/);
  if (!match || (!match[1] && !match[2])) return null;

  let start;
  let end;
  if (!match[1]) {
    const suffixLength = Number(match[2]);
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) return null;
    start = Math.max(normalizedSize - suffixLength, 0);
    end = normalizedSize - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : normalizedSize - 1;
  }

  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start || start >= normalizedSize) {
    return { unsatisfiable: true };
  }

  end = Math.min(end, normalizedSize - 1);
  return { start, end, length: end - start + 1 };
}

function rangeNotSatisfiable(size) {
  return new Response(null, {
    status: 416,
    headers: {
      "content-range": `bytes */${size}`,
      "accept-ranges": "bytes",
    },
  });
}

async function readR2Object(bucket, key, request) {
  if (!bucket) return null;
  const head = await bucket.head(key).catch(() => null);
  if (!head) return null;

  const range = parseRangeHeader(request.headers.get("range"), head.size);
  if (range?.unsatisfiable) return rangeNotSatisfiable(head.size);

  const object = await bucket.get(
    key,
    range ? { range: { offset: range.start, length: range.length } } : undefined,
  ).catch(() => null);
  if (!object) return null;

  const metadata = head.customMetadata || object.customMetadata || {};
  return new Response(object.body, {
    status: range ? 206 : 200,
    headers: responseHeaders({
      key,
      type: head.httpMetadata?.contentType || object.httpMetadata?.contentType || metadata.contentType,
      name: metadata.originalName || key,
      size: head.size,
      contentLength: range?.length || head.size,
      range,
    }),
  });
}

function chunkPartKey(key, index) {
  return `upload:${key}:part:${index}`;
}

function isChunkedUpload(metadata = {}) {
  return metadata.chunked === "true" && Number(metadata.chunks) > 0;
}

function chunkedUploadBody(env, key, range, chunkSize, chunks) {
  const firstChunk = Math.floor(range.start / chunkSize);
  const lastChunk = Math.floor(range.end / chunkSize);
  let chunkIndex = firstChunk;

  return new ReadableStream({
    async pull(controller) {
      if (chunkIndex > lastChunk) {
        controller.close();
        return;
      }
      if (chunkIndex >= chunks) {
        controller.error(new Error("Missing upload chunk"));
        return;
      }
      const part = await env.ACT4_CONTENT?.get(chunkPartKey(key, chunkIndex), { type: "arrayBuffer" }).catch(() => null);
      if (!part) {
        controller.error(new Error("Missing upload chunk"));
        return;
      }
      const partStart = chunkIndex === firstChunk ? range.start % chunkSize : 0;
      const partEnd = chunkIndex === lastChunk ? (range.end % chunkSize) + 1 : part.byteLength;
      controller.enqueue(new Uint8Array(part.slice(partStart, partEnd)));
      chunkIndex += 1;
    },
  });
}

function readChunkedUpload(env, key, metadata, request) {
  if (!isChunkedUpload(metadata)) return null;
  if (metadata.complete && metadata.complete !== "true") return new Response("Not found", { status: 404 });

  const size = Number(metadata.size);
  const chunks = Number(metadata.chunks);
  const chunkSize = Number(metadata.chunkSize) || 18 * 1024 * 1024;
  const range = parseRangeHeader(request.headers.get("range"), size) || { start: 0, end: size - 1, length: size };
  if (range?.unsatisfiable) return rangeNotSatisfiable(size);

  return new Response(chunkedUploadBody(env, key, range, chunkSize, chunks), {
    status: request.headers.get("range") ? 206 : 200,
    headers: responseHeaders({
      key,
      type: metadata.contentType,
      name: metadata.originalName || key,
      size,
      contentLength: range.length,
      range: request.headers.get("range") ? range : null,
    }),
  });
}

export async function onRequestGet({ request, params, env }) {
  const key = params.key;

  const r2Response = await readR2Object(env.ACT4_ASSETS, key, request);
  if (r2Response) return r2Response;

  const result = await env.ACT4_CONTENT?.getWithMetadata(`upload:${key}`, { type: "arrayBuffer" }).catch(() => null);
  if (!result?.value) {
    return new Response("Not found", { status: 404 });
  }
  const chunkedResponse = readChunkedUpload(env, key, result.metadata || {}, request);
  if (chunkedResponse) return chunkedResponse;

  const size = Number(result.metadata?.size || result.value.byteLength);
  const range = parseRangeHeader(request.headers.get("range"), size);
  if (range?.unsatisfiable) return rangeNotSatisfiable(size);

  const body = range ? result.value.slice(range.start, range.end + 1) : result.value;
  return new Response(body, {
    status: range ? 206 : 200,
    headers: responseHeaders({
      key,
      type: result.metadata?.contentType,
      name: result.metadata?.originalName || key,
      size,
      contentLength: range?.length || size,
      range,
    }),
  });
}
