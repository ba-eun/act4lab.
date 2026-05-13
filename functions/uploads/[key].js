function responseHeaders({ key, type, name, size }) {
  return {
    "content-type": type || "application/octet-stream",
    "content-disposition": `inline; filename="${encodeURIComponent(name || key)}"`,
    ...(size ? { "content-length": String(size) } : {}),
    "x-act4-original-name": name || key,
    "cache-control": "public, max-age=31536000, immutable",
  };
}

export async function onRequestGet({ params, env }) {
  const key = params.key;

  const object = await env.ACT4_ASSETS?.get(key).catch(() => null);
  if (object) {
    const metadata = object.customMetadata || {};
    return new Response(object.body, {
      headers: responseHeaders({
        key,
        type: object.httpMetadata?.contentType || metadata.contentType,
        name: metadata.originalName || key,
        size: metadata.size || object.size,
      }),
    });
  }

  const result = await env.ACT4_CONTENT?.getWithMetadata(`upload:${key}`, { type: "arrayBuffer" }).catch(() => null);
  if (!result?.value) {
    return new Response("Not found", { status: 404 });
  }
  return new Response(result.value, {
    headers: responseHeaders({
      key,
      type: result.metadata?.contentType,
      name: result.metadata?.originalName || key,
      size: result.metadata?.size || result.value.byteLength,
    }),
  });
}
