import { json, requireAuth } from "../_shared/auth.js";

export async function onRequestPost({ request, env }) {
  const blocked = await requireAuth(request, env);
  if (blocked) return blocked;

  const form = await request.formData();
  const file = form.get("file") || form.get("image");
  if (!(file instanceof File)) {
    return json({ error: "No file uploaded" }, { status: 400 });
  }

  if (file.size > 24 * 1024 * 1024) {
    return json({ error: "File is too large" }, { status: 413 });
  }

  const extension = file.name.includes(".") ? file.name.split(".").pop().toLowerCase() : "bin";
  const key = `${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const attachment = {
    url: `/uploads/${key}`,
    name: file.name || key,
    size: file.size,
    type: file.type || "application/octet-stream",
  };
  await env.ACT4_CONTENT.put(`upload:${key}`, await file.arrayBuffer(), {
    metadata: {
      contentType: attachment.type,
      originalName: attachment.name,
      size: attachment.size,
    },
  });

  return json({ ...attachment, attachment });
}
