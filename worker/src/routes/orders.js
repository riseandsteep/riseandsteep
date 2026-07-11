import { json, error } from "../cors.js";

// POST /api/checkout
// Body: { items: [{ product_id, qty, oz }], email }
export async function createCheckout(request, env, origin) {
  if (!env.STRIPE_SECRET_KEY) {
    return error("Stripe not configured", 500, origin);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return error("Invalid JSON body", 400, origin);
  }

  const { items, email } = body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return error("items array is required", 400, origin);
  }

  // Fetch products from D1 to validate prices (never trust client prices)
  const ids = items.map(i => i.product_id);
  const placeholders = ids.map(() => "?").join(",");
  let products;
  try {
    const rows = await env.DB.prepare(
      `SELECT id, name, price_cents, weight_oz, in_stock FROM products WHERE id IN (${placeholders})`
    ).bind(...ids).all();
    products = rows.results || [];
  } catch (e) {
    return error(`DB error: ${e.message}`, 500, origin);
  }

  // Build Stripe line items with size-aware pricing (computed server-side, never trusted from client)
  const lineItems = [];
  for (const item of items) {
    const product = products.find(p => p.id === item.product_id);
    if (!product) return error(`Product ${item.product_id} not found`, 400, origin);
    if (!product.in_stock) return error(`${product.name} is out of stock`, 400, origin);

    const baseWeight = product.weight_oz || 2;
    const oz = item.oz || baseWeight;
    const unitAmount = Math.round((product.price_cents / baseWeight) * oz);
    const sizeLabel = oz >= 16 ? `${oz / 16}lb` : `${oz}oz`;

    lineItems.push({
      price_data: {
        currency: "usd",
        product_data: { name: `${product.name} (${sizeLabel})` },
        unit_amount: unitAmount,
      },
      quantity: item.qty || 1,
    });
  }

  const successUrl = `${env.FRONTEND_ORIGIN}/?session_id={CHECKOUT_SESSION_ID}#success`;
  const cancelUrl  = `${env.FRONTEND_ORIGIN}/#`;

  // Create Stripe Checkout Session
  const stripeBody = new URLSearchParams({
    mode: "payment",
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: "true",
    "shipping_address_collection[allowed_countries][0]": "US",
    "shipping_address_collection[allowed_countries][1]": "CA",
  });

  if (email) stripeBody.append("customer_email", email);

  lineItems.forEach((item, i) => {
    stripeBody.append(`line_items[${i}][price_data][currency]`, item.price_data.currency);
    stripeBody.append(`line_items[${i}][price_data][product_data][name]`, item.price_data.product_data.name);
    stripeBody.append(`line_items[${i}][price_data][unit_amount]`, item.price_data.unit_amount);
    stripeBody.append(`line_items[${i}][quantity]`, item.quantity);
  });

  let session;
  try {
    const resp = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: stripeBody.toString(),
    });
    session = await resp.json();
    if (session.error) return error(session.error.message, 400, origin);
  } catch (e) {
    return error(`Stripe error: ${e.message}`, 500, origin);
  }

  // Store pending order in D1
  const orderId = `ORD-${Date.now()}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;
  const subtotal = lineItems.reduce((s, i) => s + i.price_data.unit_amount * i.quantity, 0);

  try {
    await env.DB.prepare(
      `INSERT INTO orders (id, stripe_session_id, status, email, items_json, subtotal_cents, total_cents)
       VALUES (?, ?, 'pending', ?, ?, ?, ?)`
    ).bind(
      orderId,
      session.id,
      email || "",
      JSON.stringify(items),
      subtotal,
      subtotal
    ).run();
  } catch (e) {
    // Log but don't fail — Stripe session is created, order can be reconciled via webhook
    console.error("Failed to store order:", e.message);
  }

  return json({ url: session.url, order_id: orderId }, 200, origin);
}

// GET /api/orders/:id  (for order confirmation page)
export async function getOrder(orderId, env, origin) {
  try {
    const row = await env.DB.prepare(
      `SELECT id, status, email, items_json, subtotal_cents, total_cents, created_at
       FROM orders WHERE id = ?`
    ).bind(orderId).first();

    if (!row) return error("Order not found", 404, origin);
    return json(row, 200, origin);
  } catch (e) {
    return error(`DB error: ${e.message}`, 500, origin);
  }
}

// GET /api/orders/by-session/:sessionId  (for order confirmation page, right after Stripe redirect)
export async function getOrderBySession(sessionId, env, origin) {
  try {
    const row = await env.DB.prepare(
      `SELECT id, status, email, items_json, subtotal_cents, total_cents, created_at
       FROM orders WHERE stripe_session_id = ?`
    ).bind(sessionId).first();

    if (!row) return error("Order not found", 404, origin);
    return json(row, 200, origin);
  } catch (e) {
    return error(`DB error: ${e.message}`, 500, origin);
  }
}
