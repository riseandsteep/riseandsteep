import { json, error } from "../cors.js";

// POST /api/subscribe
// Body: { email, source }
export async function subscribe(request, env, origin) {
  let body;
  try {
    body = await request.json();
  } catch {
    return error("Invalid JSON body", 400, origin);
  }

  const email = (body.email || "").trim().toLowerCase();
  const source = body.source || "popup";

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return error("Please enter a valid email address", 400, origin);
  }

  try {
    await env.DB.prepare(
      `INSERT INTO subscribers (email, source) VALUES (?, ?)
       ON CONFLICT(email) DO NOTHING`
    ).bind(email, source).run();
    return json({ success: true }, 200, origin);
  } catch (e) {
    return error(`DB error: ${e.message}`, 500, origin);
  }
}
