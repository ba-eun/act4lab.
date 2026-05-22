const encoder = new TextEncoder();

function base64UrlEncode(input) {
  const bytes = typeof input === "string" ? encoder.encode(input) : new Uint8Array(input);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64UrlDecode(input) {
  const normalized = input.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      pragma: "no-cache",
      expires: "0",
      ...(init.headers || {}),
    },
  });
}

export function parseCookies(request) {
  const header = request.headers.get("cookie") || "";
  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [key, ...value] = part.split("=");
        return [key, value.join("=")];
      }),
  );
}

async function sign(value, secret) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return base64UrlEncode(signature);
}

export function resolveSessionSecret(env) {
  const fallback = env.ALLOW_DEFAULT_ADMIN === "true" || env.CF_PAGES !== "1"
    ? "change-this-session-secret-before-production"
    : "";
  return env.SESSION_SECRET || fallback;
}

export async function createSessionCookie(env, username) {
  const secret = resolveSessionSecret(env);
  if (!secret) throw new Error("SESSION_SECRET is not configured");
  const payload = base64UrlEncode(
    JSON.stringify({
      u: username,
      exp: Date.now() + 1000 * 60 * 60 * 8,
    }),
  );
  const signature = await sign(payload, secret);
  return `act4_session=${payload}.${signature}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=28800`;
}

export async function isAuthenticated(request, env) {
  const token = parseCookies(request).act4_session || "";
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  const secret = resolveSessionSecret(env);
  if (!secret) return false;
  const expected = await sign(payload, secret);
  if (!timingSafeEqual(signature, expected)) return false;
  try {
    const decoded = new TextDecoder().decode(base64UrlDecode(payload));
    const session = JSON.parse(decoded);
    return Number(session.exp) > Date.now();
  } catch {
    return false;
  }
}

export async function requireAuth(request, env) {
  if (await isAuthenticated(request, env)) return null;
  return json({ error: "Unauthorized" }, { status: 401 });
}
