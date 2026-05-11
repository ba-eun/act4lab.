export async function onRequestGet({ params, env }) {
  const key = params.key;
  const result = await env.ACT4_CONTENT.getWithMetadata(`upload:${key}`, { type: "arrayBuffer" });
  if (!result.value) {
    return new Response("Not found", { status: 404 });
  }
  return new Response(result.value, {
    headers: {
      "content-type": result.metadata?.contentType || "application/octet-stream",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
