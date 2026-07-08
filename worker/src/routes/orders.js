import { json, error } from "../cors.js";

const FREE_SHIPPING_THRESHOLD_CENTS = 4500; // $45

// Weight-based shipping tiers, in cents. maxOz is the upper bound (inclusive) of each tier.
const US_TIERS = [
  { maxOz: 4,        cents: 595 },
  { maxOz: 8,        cents: 795 },
  { maxOz: 16,       cents: 995 },
  { maxOz: 32,       cents: 1295 },
  { maxOz: 48,       cents: 1595 },
  { maxOz: Infinity, cents: 1995 },
];

const CA_TIERS = [
  { maxOz: 8,        cents: 2495 },
  { maxOz: 16,       cents: 3295 },
  { maxOz: 32,       cents: 4495 },
  { maxOz: 48,       cents: 5495 },
  { maxOz: Infinity, cents: 6495 },
];

function rateForWeight(tiers, totalOz) {
  for (const tier of tiers) {
    if (totalOz <= tier.maxOz) return tier.cents;
  }
  return tiers[tiers.length - 1].cents;
}

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

  const lineItems = [];
  let totalOz = 0;
  for (const item of items) {
    const product = products.find(p => p.id === item.product_id);
    if (!product) return error(`Product ${item.product_id} not found`, 400, origin);
    if (!product.in_stock) return error(`${product.name} is out of stock`, 400, origin);

    const baseWeight = product.weight_oz || 2;
    const oz = item.oz || baseWeight;
    const qty = item.qty || 1;
    const unitAmount = Math.round((product.price_cents / baseWeight) * oz);
    const sizeLabel = oz >= 16 ? `${oz / 16}lb` : `${oz}oz`;

    totalOz += oz * qty;

    lineItems.push({
      price_data: {
        currency: "usd",
        product_data: { name: `${product.name} (${sizeLabel})` },
        unit_amount: unitAmount,
      },
      quantity: qty,
    });
  }

  const subtotal = lineItems.reduce((s, i) => s + i.price_data.unit_amount * i.quantity, 0);

  const usFreeQualifies = subtotal >= FREE_SHIPPING_THRESHOLD_CENTS;
  const usCents = usFreeQualifies ? 0 : rateForWeight(US_TIERS, totalOz);
  const usLabel = usFreeQualifies ? "Free US Shipping" : "US Standard Shipping";
  const caCents = rateForWeight(CA_TIERS, totalOz);

  const successUrl = `${env.FRONTEND_ORIGIN}/?session_id={CHECKOUT_SESSION_ID}#success`;
  const cancelUrl  = `${env.FRONTEND_ORIGIN}/#`;

  const stripeBody = new URLSearchParams({
    mode: "payment",
    success_url: successUrl,
    cancel_url: cancelUrl,
    "shipping_address_collection[allowed_countries][0]": "US",
    "shipping_address_collection[allowed_countries][1]": "CA",

    "shipping_options[0][shipping_rate_data][type]": "fixed_amount",
    "shipping_options[0][shipping_rate_data][fixed_amount][amount]": String(usCents),
    "shipping_options[0][shipping_rate_data][fixed_amount][currency]": "usd",
    "shipping_options[0][shipping_rate_data][display_name]": usLabel,
    "shipping_options[0][shipping_rate_data][delivery_estimate][minimum][unit]": "business_day",
    "shipping_options[0][shipping_rate_data][delivery_estimate][minimum][value]": "3",
    "shipping_options[0][shipping_rate_data][delivery_estimate][maximum][unit]": "business_day",
    "shipping_options[0][shipping_rate_data][delivery_estimate][maximum][value]": "7",

    "shipping_options[1][shipping_rate_data][type]": "fixed_amount",
    "shipping_options[1][shipping_rate_data][fixed_amount][amount]": String(caCents),
    "shipping_options[1][shipping_rate_data][fixed_amount][currency]": "usd",
    "shipping_options[1][shipping_rate_data][display_name]": "Canada Standard Shipping",
    "shipping_options[1][shipping_rate_data][delivery_estimate][minimum][unit]": "business_day",
    "shipping_options[1][shipping_rate_data][delivery_estimate][minimum][value]": "7",
    "shipping_options[1][shipping_rate_data][delivery_estimate][maximum][unit]": "business_day",
    "shipping_options[1][shipping_rate_data][delivery_estimate][maximum][value]": "14",
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

  const orderId = `ORD-${Date.now()}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;

  try {
    await env.DB.prepare(
      `INSERT INTO orders (id, stripe_session_id, status, email, items_json, subtotal_cents, shipping_cents, total_cents)
       VALUES (?, ?, 'pending', ?, ?, ?, ?, ?)`
    ).bind(
      orderId,
      session.id,
      email || "",
      JSON.stringify(items),
      subtotal,
      usCents,
      subtotal + usCents
    ).run();
  } catch (e) {
    console.error("Failed to store order:", e.message);
  }

  return json({ url: session.url, order_id: orderId }, 200, origin);
}

// GET /api/orders/:id  (for order confirmation page)
export async function getOrder(orderId, env, origin) {
  try {
    const row = await env.DB.prepare(
      `SELECT id, status, email, items_json, subtotal_cents, shipping_cents, total_cents, created_at
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
      `SELECT id, status, email, items_json, subtotal_cents, shipping_cents, total_cents, created_at
       FROM orders WHERE stripe_session_id = ?`
    ).bind(sessionId).first();

    if (!row) return error("Order not found", 404, origin);
    return json(row, 200, origin);
  } catch (e) {
    return error(`DB error: ${e.message}`, 500, origin);
  }
}
