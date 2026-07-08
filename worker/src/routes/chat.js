import { json, error } from "../cors.js";

const SYSTEM_PROMPT = `You are the friendly customer support assistant for Rise & Steep, an herbal tea and bulk herb company.

Company facts:
- We sell herbal tea blends and hundreds of individual herbs, teas, and mushrooms, sold by the ounce (1oz, 2oz, 4oz, 1lb).
- We ship to the US and Canada only.
- US shipping: $5.95-$19.95 depending on weight, FREE on orders $45+. Delivery 3-7 business days.
- Canada shipping: $24.95-$64.95 depending on weight. Delivery 7-14 business days, customs/duties are the customer's responsibility.
- Returns: we can't accept returns of opened food products for hygiene reasons. Damaged/incorrect/defective orders can be replaced or refunded if reported within 14 days.
- Contact: support@riseandsteep.com
- We have an "AI Blend Builder" on the site where customers describe symptoms and get a custom herb blend suggestion.
- Do not make medical claims. If someone asks whether an herb treats/cures/prevents a disease, or asks about interactions with a specific medication, tell them to consult a healthcare provider — do not give medical advice yourself.
- Do not use the word "organic" anywhere in your responses.
- Keep answers short, warm, and conversational — a few sentences, not an essay.

If a customer asks about the status of their own order, ask them for their order ID (looks like ORD-XXXXXXXXXX-XXXXX) AND the email address they used at checkout — you need both to look it up. Once you have both, use the lookup_order tool. Never guess or make up order information. If the tool finds no match, let them know and suggest they double check the order ID and email, or email support@riseandsteep.com if they're still stuck.

If you don't know the answer to something, say so honestly and point them to support@riseandsteep.com rather than guessing.`;

const TOOLS = [
  {
    name: "lookup_order",
    description: "Look up the status of a customer's order. Requires both the order ID and the email used at checkout — both must match for privacy.",
    input_schema: {
      type: "object",
      properties: {
        order_id: { type: "string", description: "The order ID, e.g. ORD-1234567890-ABCDE" },
        email: { type: "string", description: "The email address used at checkout" },
      },
      required: ["order_id", "email"],
    },
  },
];

async function lookupOrder(env, order_id, email) {
  try {
    const row = await env.DB.prepare(
      `SELECT id, status, items_json, total_cents, notes, created_at
       FROM orders WHERE id = ? AND LOWER(email) = LOWER(?)`
    ).bind(order_id, email).first();

    if (!row) return "No order found matching that order ID and email combination. Ask the customer to double-check both, or suggest they email support@riseandsteep.com.";

    return JSON.stringify({
      order_id: row.id,
      status: row.status,
      total: `$${(row.total_cents / 100).toFixed(2)}`,
      tracking_or_notes: row.notes || "none yet",
      placed_on: row.created_at,
    });
  } catch (e) {
    return `Error looking up order: ${e.message}`;
  }
}

// POST /api/chat
// Body: { messages: [{ role, content }] }
export async function chatSupport(request, env, origin) {
  if (!env.ANTHROPIC_API_KEY) {
    return error("Chat not configured", 500, origin);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return error("Invalid JSON body", 400, origin);
  }

  const { messages } = body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return error("messages array is required", 400, origin);
  }

  let conversation = [...messages];
  let finalText = null;
  const MAX_TURNS = 4;

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    let resp, data;
    try {
      resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 600,
          system: SYSTEM_PROMPT,
          tools: TOOLS,
          messages: conversation,
        }),
      });
      data = await resp.json();
    } catch (e) {
      return error(`AI request failed: ${e.message}`, 502, origin);
    }

    if (!resp.ok) {
      return error(data.error?.message || "AI error", resp.status, origin);
    }

    const toolUse = (data.content || []).find(b => b.type === "tool_use");

    if (toolUse && toolUse.name === "lookup_order") {
      const { order_id, email } = toolUse.input || {};
      const resultText = await lookupOrder(env, order_id, email);

      conversation.push({ role: "assistant", content: data.content });
      conversation.push({
        role: "user",
        content: [{ type: "tool_result", tool_use_id: toolUse.id, content: resultText }],
      });
      continue;
    }

    const textBlock = (data.content || []).find(b => b.type === "text");
    finalText = textBlock ? textBlock.text : "Sorry, could you rephrase that?";
    break;
  }

  if (finalText === null) {
    finalText = "Sorry, I'm having trouble with that request. Please email support@riseandsteep.com and we'll help directly.";
  }

  return json({ reply: finalText }, 200, origin);
}
