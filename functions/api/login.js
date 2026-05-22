import { createSessionCookie, json, resolveSessionSecret } from "../_shared/auth.js";

export async function onRequestPost({ request, env }) {
  const body = await request.json().catch(() => ({}));
  const allowDefaultAdmin = env.ALLOW_DEFAULT_ADMIN === "true" || env.CF_PAGES !== "1";
  const adminUser = env.ADMIN_USER || (allowDefaultAdmin ? "act4lab" : "");
  const adminPassword = env.ADMIN_PASSWORD || (allowDefaultAdmin ? "ActIVLab." : "");

  if (!adminUser || !adminPassword || !resolveSessionSecret(env)) {
    return json({ error: "Admin credentials are not configured" }, { status: 503 });
  }

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
