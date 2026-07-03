-- Rise & Steep — D1 Schema
-- Run: wrangler d1 execute rise-and-steep-db --file=scripts/schema.sql

CREATE TABLE IF NOT EXISTS rooms (
  id           TEXT PRIMARY KEY,
  label        TEXT NOT NULL,
  short        TEXT NOT NULL,
  sub          TEXT NOT NULL,
  color        TEXT NOT NULL,
  color_light  TEXT NOT NULL,
  color_dark   TEXT NOT NULL,
  color_accent TEXT NOT NULL,
  sort_order   INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS products (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  slug           TEXT NOT NULL UNIQUE,
  room_id        TEXT NOT NULL REFERENCES rooms(id),
  sku            TEXT UNIQUE,
  price_cents    INTEGER NOT NULL,
  compare_price  INTEGER,
  weight_oz      REAL NOT NULL DEFAULT 2.0,
  tag            TEXT,
  blurb          TEXT,
  description    TEXT,
  ingredients    TEXT,
  caffeine       TEXT CHECK(caffeine IN ('none','light','moderate','high')) DEFAULT 'none',
  fx_energy      INTEGER CHECK(fx_energy BETWEEN 0 AND 5) DEFAULT 0,
  fx_calm        INTEGER CHECK(fx_calm BETWEEN 0 AND 5) DEFAULT 0,
  fx_focus       INTEGER CHECK(fx_focus BETWEEN 0 AND 5) DEFAULT 0,
  fx_digestion   INTEGER CHECK(fx_digestion BETWEEN 0 AND 5) DEFAULT 0,
  image_key      TEXT,
  images_json    TEXT DEFAULT '[]',
  in_stock       INTEGER NOT NULL DEFAULT 1,
  featured       INTEGER NOT NULL DEFAULT 0,
  sort_order     INTEGER DEFAULT 0,
  meta_title     TEXT,
  meta_desc      TEXT,
  created_at     TEXT DEFAULT (datetime('now')),
  updated_at     TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_products_room     ON products(room_id);
CREATE INDEX IF NOT EXISTS idx_products_slug     ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(featured);
CREATE INDEX IF NOT EXISTS idx_products_stock    ON products(in_stock);

CREATE TABLE IF NOT EXISTS orders (
  id                TEXT PRIMARY KEY,
  stripe_session_id TEXT UNIQUE NOT NULL,
  stripe_payment_id TEXT,
  status            TEXT CHECK(status IN ('pending','paid','fulfilled','refunded','cancelled'))
                    NOT NULL DEFAULT 'pending',
  email             TEXT NOT NULL,
  name              TEXT,
  shipping_json     TEXT,
  items_json        TEXT NOT NULL,
  subtotal_cents    INTEGER NOT NULL,
  shipping_cents    INTEGER NOT NULL DEFAULT 0,
  tax_cents         INTEGER NOT NULL DEFAULT 0,
  total_cents       INTEGER NOT NULL,
  notes             TEXT,
  fulfilled_at      TEXT,
  created_at        TEXT DEFAULT (datetime('now')),
  updated_at        TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_orders_email  ON orders(email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_stripe ON orders(stripe_session_id);

CREATE TABLE IF NOT EXISTS email_subscribers (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  email      TEXT NOT NULL UNIQUE,
  source     TEXT DEFAULT 'website',
  room_id    TEXT,
  status     TEXT CHECK(status IN ('active','unsubscribed')) DEFAULT 'active',
  created_at TEXT DEFAULT (datetime('now'))
);
