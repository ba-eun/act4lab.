export async function onRequestGet({ params, env }) {
  const key = params.key;
  const result = await env.ACT4_CONTENT.getWithMetadata(`upload:${key}`, { type: "arrayBuffer" });
  if (!result.value) {
    return new Response("Not found", { status: 404 });
  }
  return new Response(result.value, {
    headers: {
      "content-type": result.metadata?.contentType || "application/octet-stream",
      "content-disposition": `inline; filename="${encodeURIComponent(result.metadata?.originalName || key)}"`,
      "content-length": String(result.metadata?.size || result.value.byteLength),
      "x-act4-original-name": result.metadata?.originalName || key,
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
