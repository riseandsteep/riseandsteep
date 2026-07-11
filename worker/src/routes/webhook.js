import { json, error } from "../cors.js";

// POST /api/webhook — Stripe webhook handler
export async function handleWebhook(request, env, origin) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return error("Missing stripe-signature", 400, origin);

  const body = await request.text();

  let event;
  try {
    event = await verifyStripeSignature(body, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    return error(`Webhook signature invalid: ${e.message}`, 400, origin);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    const email = session.customer_details?.email || session.customer_email || "";
    const shippingDetails = session.collected_information?.shipping_details || session.shipping_details || null;
    const name  = session.customer_details?.name || shippingDetails?.name || "";
    const address = shippingDetails?.address || session.customer_details?.address || null;

    try {
      await env.DB.prepare(
        `UPDATE orders
         SET status = 'paid',
             stripe_payment_id = ?,
             email = COALESCE(NULLIF(email,''), ?),
             name = ?,
             shipping_json = ?,
             updated_at = datetime('now')
         WHERE stripe_session_id = ?`
      ).bind(
        session.payment_intent || "",
        email,
        name,
        address ? JSON.stringify(address) : null,
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

  const age = Math.floor(Date.now() / 1000) - parseInt(timestamp);
  if (age > 300) throw new Error("Webhook timestamp too old");

  return JSON.parse(payload);
}
