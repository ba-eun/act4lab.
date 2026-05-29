import { handleUploadRequest } from "../uploads/[key].js";

function decodePlaybackKey(value = "") {
  try {
    const normalized = String(value).replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    try {
      return decodeURIComponent(String(value));
    } catch {
      return String(value);
    }
  }
}

function uploadContext(context) {
  return {
    ...context,
    params: {
      ...context.params,
      key: decodePlaybackKey(context.params?.key),
    },
  };
}

export async function onRequestGet(context) {
  return handleUploadRequest(uploadContext(context));
}

export async function onRequestHead(context) {
  return handleUploadRequest(uploadContext(context), { headOnly: true });
}
