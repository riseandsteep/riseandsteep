import { json, error } from "../cors.js";

function checkAuth(request, env) {
  const auth = request.headers.get("Authorization");
  if (!auth || auth !== `Bearer ${env.ADMIN_SECRET}`) return false;
  return true;
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// GET /api/admin/products
export async function adminListProducts(request, env, origin) {
  if (!checkAuth(request, env)) return error("Unauthorized", 401, origin);

  const url = new URL(request.url);
  const page  = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const limit = Math.min(100, parseInt(url.searchParams.get("limit") || "50"));
  const offset = (page - 1) * limit;

  try {
    const total = await env.DB.prepare(`SELECT COUNT(*) as c FROM products`).first();
    const rows  = await env.DB.prepare(
      `SELECT * FROM products ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).bind(limit, offset).all();

    return json({ products: rows.results, total: total?.c || 0, page, limit }, 200, origin);
  } catch (e) {
    return error(e.message, 500, origin);
  }
}

// POST /api/admin/products
export async function adminCreateProduct(request, env, origin) {
  if (!checkAuth(request, env)) return error("Unauthorized", 401, origin);

  let data;
  try { data = await request.json(); } catch { return error("Invalid JSON", 400, origin); }

  const required = ["name", "room_id", "price_cents"];
  for (const f of required) {
    if (!data[f]) return error(`Missing required field: ${f}`, 400, origin);
  }

  const id   = `ras-${Date.now().toString(36)}`;
  const slug = data.slug || slugify(data.name);

  try {
    await env.DB.prepare(
      `INSERT INTO products
         (id, name, slug, room_id, sku, price_cents, compare_price, weight_oz,
          tag, blurb, description, ingredients, caffeine,
          fx_energy, fx_calm, fx_focus, fx_digestion,
          image_key, images_json, in_stock, featured, sort_order, meta_title, meta_desc)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(
      id, data.name, slug, data.room_id,
      data.sku || null,
      data.price_cents,
      data.compare_price || null,
      data.weight_oz || 2.0,
      data.tag || null,
      data.blurb || null,
      data.description || null,
      data.ingredients || null,
      data.caffeine || "none",
      data.fx_energy || 0,
      data.fx_calm || 0,
      data.fx_focus || 0,
      data.fx_digestion || 0,
      data.image_key || null,
      data.images_json || "[]",
      data.in_stock !== undefined ? data.in_stock : 1,
      data.featured || 0,
      data.sort_order || 0,
      data.meta_title || null,
      data.meta_desc || null,
    ).run();

    return json({ id, slug, success: true }, 201, origin);
  } catch (e) {
    return error(e.message, 500, origin);
  }
}

// PUT /api/admin/products/:id
export async function adminUpdateProduct(id, request, env, origin) {
  if (!checkAuth(request, env)) return error("Unauthorized", 401, origin);

  let data;
  try { data = await request.json(); } catch { return error("Invalid JSON", 400, origin); }

  const fields = ["name","slug","room_id","sku","price_cents","compare_price","weight_oz",
    "tag","blurb","description","ingredients","caffeine",
    "fx_energy","fx_calm","fx_focus","fx_digestion",
    "image_key","images_json","in_stock","featured","sort_order","meta_title","meta_desc"];

  const updates = [];
  const values  = [];

  for (const f of fields) {
    if (data[f] !== undefined) {
      updates.push(`${f} = ?`);
      values.push(data[f]);
    }
  }

  if (updates.length === 0) return error("No fields to update", 400, origin);

  updates.push("updated_at = datetime('now')");
  values.push(id);

  try {
    await env.DB.prepare(
      `UPDATE products SET ${updates.join(", ")} WHERE id = ?`
    ).bind(...values).run();
    return json({ success: true }, 200, origin);
  } catch (e) {
    return error(e.message, 500, origin);
  }
}

// DELETE /api/admin/products/:id  (soft delete — sets in_stock = 0)
export async function adminDeleteProduct(id, request, env, origin) {
  if (!checkAuth(request, env)) return error("Unauthorized", 401, origin);
  try {
    await env.DB.prepare(
      `UPDATE products SET in_stock = 0, updated_at = datetime('now') WHERE id = ?`
    ).bind(id).run();
    return json({ success: true }, 200, origin);
  } catch (e) {
    return error(e.message, 500, origin);
  }
}

// GET /api/admin/orders
export async function adminListOrders(request, env, origin) {
  if (!checkAuth(request, env)) return error("Unauthorized", 401, origin);

  const url    = new URL(request.url);
  const status = url.searchParams.get("status");
  const page   = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const limit  = 50;
  const offset = (page - 1) * limit;

  let where = status ? `WHERE status = ?` : "";
  let params = status ? [status, limit, offset] : [limit, offset];

  try {
    const rows = await env.DB.prepare(
      `SELECT * FROM orders ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).bind(...params).all();
    return json({ orders: rows.results || [], page }, 200, origin);
  } catch (e) {
    return error(e.message, 500, origin);
  }
}

// PUT /api/admin/orders/:id
export async function adminUpdateOrder(id, request, env, origin) {
  if (!checkAuth(request, env)) return error("Unauthorized", 401, origin);

  let data;
  try { data = await request.json(); } catch { return error("Invalid JSON", 400, origin); }

  try {
    await env.DB.prepare(
      `UPDATE orders SET status = ?, notes = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(data.status, data.notes || null, id).run();
    return json({ success: true }, 200, origin);
  } catch (e) {
    return error(e.message, 500, origin);
  }
}

// GET /api/admin/subscribers
export async function adminListSubscribers(request, env, origin) {
  if (!checkAuth(request, env)) return error("Unauthorized", 401, origin);

  try {
    const rows = await env.DB.prepare(
      `SELECT id, email, source, created_at FROM subscribers ORDER BY created_at DESC`
    ).all();
    return json({ subscribers: rows.results || [] }, 200, origin);
  } catch (e) {
    return error(e.message, 500, origin);
  }
}
