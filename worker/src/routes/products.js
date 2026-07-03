import { json, error } from "../cors.js";

// GET /api/products
// Supports: ?room=energy&page=1&limit=24&featured=1&q=ginseng&in_stock=1
export async function getProducts(request, env, origin) {
  const url = new URL(request.url);
  const room     = url.searchParams.get("room");
  const page     = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const limit    = Math.min(100, parseInt(url.searchParams.get("limit") || "24"));
  const featured = url.searchParams.get("featured");
  const q        = url.searchParams.get("q");
  const inStock  = url.searchParams.get("in_stock");
  const offset   = (page - 1) * limit;

  let where = ["1=1"];
  let params = [];

  if (room)     { where.push("p.room_id = ?");   params.push(room); }
  if (featured) { where.push("p.featured = 1"); }
  if (inStock !== null && inStock !== undefined && inStock !== "") {
    where.push("p.in_stock = ?");
    params.push(parseInt(inStock));
  }
  if (q) {
    where.push("(p.name LIKE ? OR p.blurb LIKE ? OR p.ingredients LIKE ?)");
    const term = `%${q}%`;
    params.push(term, term, term);
  }

  const whereClause = where.join(" AND ");

  try {
    const countResult = await env.DB.prepare(
      `SELECT COUNT(*) as total FROM products p WHERE ${whereClause}`
    ).bind(...params).first();

    const total = countResult?.total || 0;

    const rows = await env.DB.prepare(
      `SELECT p.id, p.name, p.slug, p.room_id, p.sku, p.price_cents,
              p.compare_price, p.weight_oz, p.tag, p.blurb, p.ingredients,
              p.caffeine, p.fx_energy, p.fx_calm, p.fx_focus, p.fx_digestion,
              p.image_key, p.in_stock, p.featured, p.sort_order,
              r.label as room_label, r.color as room_color, r.color_accent
       FROM products p
       LEFT JOIN rooms r ON p.room_id = r.id
       WHERE ${whereClause}
       ORDER BY p.featured DESC, p.sort_order ASC, p.name ASC
       LIMIT ? OFFSET ?`
    ).bind(...params, limit, offset).all();

    return json({
      products: rows.results || [],
      total,
      page,
      pages: Math.ceil(total / limit),
      limit,
    }, 200, origin);

  } catch (e) {
    return error(`Database error: ${e.message}`, 500, origin);
  }
}

// GET /api/products/:slug
export async function getProduct(slug, env, origin) {
  try {
    const row = await env.DB.prepare(
      `SELECT p.*, r.label as room_label, r.color as room_color,
              r.color_light, r.color_dark, r.color_accent
       FROM products p
       LEFT JOIN rooms r ON p.room_id = r.id
       WHERE p.slug = ? AND p.in_stock = 1`
    ).bind(slug).first();

    if (!row) return error("Product not found", 404, origin);
    return json(row, 200, origin);

  } catch (e) {
    return error(`Database error: ${e.message}`, 500, origin);
  }
}
