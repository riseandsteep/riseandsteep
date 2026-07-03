<<<<<<< HEAD
# Rise & Steep

Herbal tea e-commerce store.
Stack: GitHub Pages (frontend) + Cloudflare Workers (API) + Cloudflare D1 (database) + Cloudflare R2 (images) + Stripe (payments)

---

## Setup (one-time)

### 1. Install Wrangler
```bash
npm install -g wrangler
wrangler login
```

### 2. Run the database schema
```bash
wrangler d1 execute rise-and-steep-db --file=scripts/schema.sql
```

### 3. Seed the database (rooms + launch products)
```bash
wrangler d1 execute rise-and-steep-db --file=scripts/seed.sql
```

### 4. Add your Stripe secret key
```bash
cd worker
wrangler secret put STRIPE_SECRET_KEY
# paste your key when prompted: sk_live_... or sk_test_...
```

### 5. Deploy the Worker
```bash
cd worker
npm install
npm run deploy
```
Copy the deployed Worker URL (e.g. `https://rise-and-steep-api.yourname.workers.dev`)

### 6. Update the frontend API URL
Open `docs/index.html` and replace:
```
window.RAS_API = "https://rise-and-steep-api.YOUR_SUBDOMAIN.workers.dev";
```
with your actual Worker URL.

### 7. Push to GitHub → auto-deploys to GitHub Pages
```bash
git add .
git commit -m "initial deploy"
git push
```
Your site will be live at `https://yourusername.github.io/riseandsteep`

---

## Import bulk products

Format your herb list as a CSV matching this header:

```
name,slug,room_id,sku,price_cents,weight_oz,tag,blurb,ingredients,caffeine,fx_energy,fx_calm,fx_focus,fx_digestion,featured
```

Then run:
```bash
node scripts/import-products.js your-products.csv
```

Valid `room_id` values: `energy`, `sleep`, `gut`, `immune`, `stress`, `detox`
Valid `caffeine` values: `none`, `light`, `moderate`, `high`
`price_cents` = price in cents (e.g. 1450 = $14.50)

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/rooms | All 6 goal rooms |
| GET | /api/products | All products (supports ?room=energy&page=1&q=ginseng) |
| GET | /api/products/:slug | Single product |
| POST | /api/checkout | Create Stripe Checkout session |
| GET | /api/orders/:id | Order lookup |
| POST | /api/webhook | Stripe webhook (set in Stripe dashboard) |
| GET | /api/admin/products | Admin: list all products |
| POST | /api/admin/products | Admin: create product |
| PUT | /api/admin/products/:id | Admin: update product |
| DELETE | /api/admin/products/:id | Admin: deactivate product |
| GET | /api/admin/orders | Admin: list orders |
| PUT | /api/admin/orders/:id | Admin: update order status |

Admin routes require: `Authorization: Bearer YOUR_ADMIN_SECRET`

Set your admin secret:
```bash
cd worker
wrangler secret put ADMIN_SECRET
```

---

## Environment Variables

| Variable | Set via | Notes |
|----------|---------|-------|
| STRIPE_SECRET_KEY | `wrangler secret put` | From Stripe dashboard |
| STRIPE_WEBHOOK_SECRET | `wrangler secret put` | From Stripe webhook settings |
| ADMIN_SECRET | `wrangler secret put` | Your own password for admin panel |
| FRONTEND_ORIGIN | wrangler.toml [vars] | Update to custom domain when ready |
=======
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
>>>>>>> b3fc49d6502538722ae085d38d5dfc37d7c9827a
