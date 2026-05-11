import { json } from "../_shared/auth.js";

export function onRequestGet() {
  return json({ ok: true, service: "act4lab" });
}
