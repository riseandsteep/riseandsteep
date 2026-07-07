import { json, error } from "../cors.js";

// POST /api/blend
// Body: { model, max_tokens, system, messages }  (forwarded to Anthropic)
export async function generateBlend(request, env, origin) {
  if (!env.ANTHROPIC_API_KEY) {
    return error("Anthropic API key not configured", 500, origin);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return error("Invalid JSON body", 400, origin);
  }

  if (!body.messages || !Array.isArray(body.messages)) {
    return error("messages array is required", 400, origin);
  }

  let resp;
  try {
    resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: body.model || "claude-sonnet-4-6",
        max_tokens: body.max_tokens || 1000,
        system: body.system,
        messages: body.messages,
      }),
    });
  } catch (e) {
    return error(`Anthropic request failed: ${e.message}`, 502, origin);
  }

  const data = await resp.json();
  if (!resp.ok) {
    return error(data.error?.message || "Anthropic API error", resp.status, origin);
  }

  return json(data, 200, origin);
}
