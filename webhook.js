import { preflight, error } from "./cors.js";
import { getProducts, getProduct } from "./routes/products.js";
import { getRooms } from "./routes/rooms.js";
import { createCheckout, getOrder } from "./routes/orders.js";
import { handleWebhook } from "./routes/webhook.js";
import {
  adminListProducts, adminCreateProduct,
  adminUpdateProduct, adminDeleteProduct,
  adminListOrders, adminUpdateOrder
} from "./routes/admin.js";

export default {
  async fetch(request, env, ctx) {
    const url    = new URL(request.url);
    const path   = url.pathname;
    const method = request.method;
    const origin = env.FRONTEND_ORIGIN || "*";

    // Preflight
    if (method === "OPTIONS") return preflight(origin);

    // Health check
    if (path === "/api/health") {
      return new Response(JSON.stringify({ status: "ok", ts: Date.now() }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // ── Public routes ──────────────────────────────────────────

    // GET /api/rooms
    if (path === "/api/rooms" && method === "GET") {
      return getRooms(env, origin);
    }

    // GET /api/products
    if (path === "/api/products" && method === "GET") {
      return getProducts(request, env, origin);
    }

    // GET /api/products/:slug
    const productMatch = path.match(/^\/api\/products\/([^/]+)$/);
    if (productMatch && method === "GET") {
      return getProduct(productMatch[1], env, origin);
    }

    // POST /api/checkout
    if (path === "/api/checkout" && method === "POST") {
      return createCheckout(request, env, origin);
    }

    // GET /api/orders/:id
    const orderMatch = path.match(/^\/api\/orders\/([^/]+)$/);
    if (orderMatch && method === "GET") {
      return getOrder(orderMatch[1], env, origin);
    }

    // POST /api/webhook  (Stripe)
    if (path === "/api/webhook" && method === "POST") {
      return handleWebhook(request, env, origin);
    }

    // ── Admin routes ───────────────────────────────────────────

    if (path === "/api/admin/products" && method === "GET")  return adminListProducts(request, env, origin);
    if (path === "/api/admin/products" && method === "POST") return adminCreateProduct(request, env, origin);

    const adminProductMatch = path.match(/^\/api\/admin\/products\/([^/]+)$/);
    if (adminProductMatch && method === "PUT")    return adminUpdateProduct(adminProductMatch[1], request, env, origin);
    if (adminProductMatch && method === "DELETE") return adminDeleteProduct(adminProductMatch[1], request, env, origin);

    if (path === "/api/admin/orders" && method === "GET") return adminListOrders(request, env, origin);

    const adminOrderMatch = path.match(/^\/api\/admin\/orders\/([^/]+)$/);
    if (adminOrderMatch && method === "PUT") return adminUpdateOrder(adminOrderMatch[1], request, env, origin);

    // 404
    return error("Not found", 404, origin);
  }
};
