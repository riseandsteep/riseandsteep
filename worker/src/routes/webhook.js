import { json, error } from "../cors.js";

// POST /api/webhook  — Stripe webhook handler
export async function handleWebhook(request, env, origin) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return error("Missing stripe-signature", 400, origin);

  const body = await request.text();

  // Verify Stripe signature
  let event;
  try {
    event = await verifyStripeSignature(body, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    return error(`Webhook signature invalid: ${e.message}`, 400, origin);
  }

  // Handle events
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    try {
      await env.DB.prepare(
        `UPDATE orders
         SET status = 'paid',
             stripe_payment_id = ?,
             email = COALESCE(NULLIF(email,''), ?),
             updated_at = datetime('now')
         WHERE stripe_session_id = ?`
      ).bind(
        session.payment_intent || "",
        session.customer_email || "",
        session.id
      ).run();
    } catch (e) {
      console.error("Failed to update order on webhook:", e.message);
    }
  }

  if (event.type === "payment_intent.payment_failed") {
    const intent = event.data.object;
    try {
      await env.DB.prepare(
        `UPDATE orders SET status = 'cancelled', updated_at = datetime('now')
         WHERE stripe_payment_id = ?`
      ).bind(intent.id).run();
    } catch (e) {
      console.error("Failed to cancel order:", e.message);
    }
  }

  return json({ received: true }, 200, origin);
}

// Stripe signature verification using Web Crypto API (available in Workers)
async function verifyStripeSignature(payload, header, secret) {
  const parts = Object.fromEntries(header.split(",").map(p => p.split("=")));
  const timestamp = parts["t"];
  const sig = parts["v1"];

  if (!timestamp || !sig) throw new Error("Malformed signature header");

  const signedPayload = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
  const expected = Array.from(new Uint8Array(mac)).map(b => b.toString(16).padStart(2,"0")).join("");

  if (expected !== sig) throw new Error("Signature mismatch");

  // Reject events older than 5 minutes
  const age = Math.floor(Date.now() / 1000) - parseInt(timestamp);
  if (age > 300) throw new Error("Webhook timestamp too old");

  return JSON.parse(payload);
}
