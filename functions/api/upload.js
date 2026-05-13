import { json, requireAuth } from "../_shared/auth.js";

function extensionFromName(name = "") {
  return name.includes(".") ? name.split(".").pop().toLowerCase().replace(/[^a-z0-9]/g, "") : "bin";
}

function safeFileName(name = "") {
  return String(name || "attachment").replace(/[\r\n"]/g, "_");
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
        contentDisposition: `inline; filename="${encodeURIComponent(attachment.name)}"`,
      },
      customMetadata: metadata,
    });
    return;
  }

  await env.ACT4_CONTENT.put(`upload:${key}`, body, { metadata });
}

export async function onRequestPost({ request, env }) {
  const blocked = await requireAuth(request, env);
  if (blocked) return blocked;

  const form = await request.formData();
  const files = [...form.getAll("file"), ...form.getAll("image")].filter((file) => file instanceof File);
  if (!files.length) {
    return json({ error: "No file uploaded" }, { status: 400 });
  }

  const attachments = [];
  for (const file of files) {
    const extension = extensionFromName(file.name);
    const key = `${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const attachment = {
      url: `/uploads/${key}`,
      name: safeFileName(file.name || key),
      size: file.size,
      type: file.type || "application/octet-stream",
      createdAt: new Date().toISOString(),
    };
    await storeFile(env, key, file, attachment);
    attachments.push(attachment);
  }

  return json({ attachments, attachment: attachments[0], ...attachments[0] });
}
