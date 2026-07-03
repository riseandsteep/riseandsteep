import { json, error } from "../cors.js";

// GET /api/rooms
export async function getRooms(env, origin) {
  try {
    const rows = await env.DB.prepare(
      `SELECT r.*, COUNT(p.id) as product_count
       FROM rooms r
       LEFT JOIN products p ON p.room_id = r.id AND p.in_stock = 1
       GROUP BY r.id
       ORDER BY r.sort_order ASC`
    ).all();

    return json(rows.results || [], 200, origin);
  } catch (e) {
    return error(`Database error: ${e.message}`, 500, origin);
  }
}
