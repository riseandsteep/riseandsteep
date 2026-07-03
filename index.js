-- Rise & Steep — Seed Data
-- Run AFTER schema.sql:
-- wrangler d1 execute rise-and-steep-db --file=scripts/seed.sql

INSERT OR IGNORE INTO rooms (id, label, short, sub, color, color_light, color_dark, color_accent, sort_order) VALUES
  ('energy', 'More Energy',   'Energy', 'Low energy, afternoon crashes, mental fatigue',          '#16A34A', '#F0FDF4', '#14532D', '#22C55E', 1),
  ('sleep',  'Better Sleep',  'Sleep',  'Restless nights, racing thoughts, wired-but-tired',      '#7C3AED', '#F5F3FF', '#4C1D95', '#A78BFA', 2),
  ('gut',    'Gut Health',    'Gut',    'Bloating, sluggish digestion, microbiome support',        '#D97706', '#FFFBEB', '#78350F', '#FBBF24', 3),
  ('immune', 'Immunity',      'Immune', 'Seasonal defense, inflammation, recovery support',        '#DC2626', '#FFF1F2', '#7F1D1D', '#F87171', 4),
  ('stress', 'Beat Stress',   'Stress', 'High cortisol, anxiety, nervous system overload',         '#2563EB', '#EFF6FF', '#1E3A8A', '#60A5FA', 5),
  ('detox',  'Detox & Reset', 'Detox',  'Cleanse, liver support, daily renewal ritual',            '#0D9488', '#F0FDFA', '#134E4A', '#2DD4BF', 6);

-- Seed products (your 12 launch blends)
INSERT OR IGNORE INTO products
  (id, name, slug, room_id, sku, price_cents, weight_oz, tag, blurb, ingredients, caffeine,
   fx_energy, fx_calm, fx_focus, fx_digestion, in_stock, featured, sort_order)
VALUES
  ('r01','Rise & Shine',   'rise-and-shine',   'energy','RAS-001',1450,2,'2oz · Moderate caffeine','Green tea, ginseng, and peppermint for a clean morning ramp-up.','Green Tea,Ginseng Root,Peppermint','moderate',5,1,4,1,1,1,1),
  ('r02','Steady Focus',   'steady-focus',     'energy','RAS-002',1500,2,'2oz · Moderate caffeine','Gotu kola, rosemary, and yerba mate for sustained output.','Gotu Kola,Rosemary,Yerba Mate','moderate',4,1,5,0,1,0,2),
  ('r03','Golden Hour',    'golden-hour',      'sleep', 'RAS-003',1300,2,'2oz · No caffeine','Chamomile, lavender, and valerian for a wind-down ritual.','Chamomile,Lavender,Valerian Root','none',0,5,1,2,1,1,1),
  ('r04','Deep Rest',      'deep-rest',        'sleep', 'RAS-004',1400,2,'2oz · No caffeine','Passionflower and skullcap for nights that need real quiet.','Passionflower,Skullcap','none',0,5,0,1,1,0,2),
  ('r05','Gut Reset',      'gut-reset',        'gut',   'RAS-005',1250,2,'2oz · No caffeine','Fennel, ginger, and peppermint. After a heavy meal, this is the move.','Fennel,Ginger Root,Peppermint','none',1,2,0,5,1,1,1),
  ('r06','Bitter Roots',   'bitter-roots',     'gut',   'RAS-006',1350,2,'2oz · No caffeine','Dandelion and burdock root, bitters reworked for daily steeping.','Dandelion Root,Burdock Root','none',1,1,0,5,1,0,2),
  ('r07','Immune Guard',   'immune-guard',     'immune','RAS-007',1550,2,'2oz · No caffeine','Elderberry, echinacea, and rosehip for the seasons that ask more.','Elderberry,Echinacea,Rosehip','none',2,1,0,1,1,1,1),
  ('r08','Citrus Defense', 'citrus-defense',   'immune','RAS-008',1400,2,'2oz · No caffeine','Hibiscus, orange peel, and astragalus with a bright citrus profile.','Hibiscus,Orange Peel,Astragalus Root','none',2,1,1,1,1,0,2),
  ('r09','Adapt & Anchor', 'adapt-and-anchor', 'stress','RAS-009',1700,2,'2oz · No caffeine','Ashwagandha, holy basil, and rhodiola for stress resilience.','Ashwagandha,Holy Basil,Rhodiola','none',2,4,3,0,1,1,1),
  ('r10','Even Keel',      'even-keel',        'stress','RAS-010',1650,2,'2oz · No caffeine','Reishi and schisandra for a baseline that holds steady all day.','Reishi,Schisandra','none',1,4,2,1,1,0,2),
  ('r11','Clean Slate',    'clean-slate',      'detox', 'RAS-011',1300,2,'2oz · No caffeine','Nettle, milk thistle, and lemon balm for a gentle daily reset.','Nettle Leaf,Milk Thistle,Lemon Balm','none',1,2,0,4,1,1,1),
  ('r12','Green Renewal',  'green-renewal',    'detox', 'RAS-012',1450,2,'2oz · Light caffeine','Matcha, parsley, and dandelion for a brighter, greener cleanse.','Matcha,Parsley,Dandelion Root','light',3,1,2,3,1,0,2);
