import { json } from "../_shared/auth.js";

export function onRequestPost() {
  return json(
    { ok: true },
    {
      headers: {
        "set-cookie": "act4_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0",
      },
    },
  );
}
