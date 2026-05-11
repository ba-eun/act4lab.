import { json, requireAuth } from "../_shared/auth.js";

export async function onRequestPost({ request, env }) {
  const blocked = await requireAuth(request, env);
  if (blocked) return blocked;

  const form = await request.formData();
  const file = form.get("image");
  if (!(file instanceof File) || !file.type.startsWith("image/")) {
    return json({ error: "No image uploaded" }, { status: 400 });
  }

  if (file.size > 12 * 1024 * 1024) {
    return json({ error: "Image is too large" }, { status: 413 });
  }

  const extension = file.name.includes(".") ? file.name.split(".").pop().toLowerCase() : "bin";
  const key = `${Date.now()}-${crypto.randomUUID()}.${extension}`;
  await env.ACT4_CONTENT.put(`upload:${key}`, await file.arrayBuffer(), {
    metadata: {
      contentType: file.type,
      originalName: file.name,
    },
  });

  return json({ url: `/uploads/${key}` });
}
