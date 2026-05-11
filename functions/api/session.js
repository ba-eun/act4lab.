import { isAuthenticated, json } from "../_shared/auth.js";

export async function onRequestGet({ request, env }) {
  return json({ authenticated: await isAuthenticated(request, env) });
}
