import { createSessionCookie, json } from "../_shared/auth.js";

export async function onRequestPost({ request, env }) {
  const body = await request.json().catch(() => ({}));
  const adminUser = env.ADMIN_USER || "admin";
  const adminPassword = env.ADMIN_PASSWORD || "Act4lab@2026";

  if (body.username !== adminUser || body.password !== adminPassword) {
    return json({ error: "Invalid credentials" }, { status: 401 });
  }

  return json(
    { ok: true },
    {
      headers: {
        "set-cookie": await createSessionCookie(env, adminUser),
      },
    },
  );
}
