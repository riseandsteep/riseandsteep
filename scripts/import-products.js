#!/usr/bin/env node
// Rise & Steep — Bulk CSV Product Importer
// Usage: node scripts/import-products.js products.csv
// Requires: wrangler configured and authenticated

import { readFileSync } from "fs";
import { execSync } from "child_process";

const VALID_ROOMS    = ["energy", "sleep", "gut", "immune", "stress", "detox"];
const VALID_CAFFEINE = ["none", "light", "moderate", "high"];
const REQUIRED_COLS  = ["name", "room_id", "price_cents"];

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function parseCSV(content) {
  const lines = content.trim().split("\n");
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map((line, i) => {
    const values = line.match(/(".*?"|[^,]+)(?=,|$)/g) || [];
    const row = {};
    headers.forEach((h, j) => {
      row[h] = (values[j] || "").trim().replace(/^"|"$/g, "");
    });
    row._lineNum = i + 2;
    return row;
  });
}

function validateRow(row) {
  const errors = [];
  for (const col of REQUIRED_COLS) {
    if (!row[col]) errors.push(`Missing required column: ${col}`);
  }
  if (row.room_id && !VALID_ROOMS.includes(row.room_id)) {
    errors.push(`Invalid room_id "${row.room_id}". Must be one of: ${VALID_ROOMS.join(", ")}`);
  }
  if (row.caffeine && !VALID_CAFFEINE.includes(row.caffeine)) {
    errors.push(`Invalid caffeine "${row.caffeine}". Must be: ${VALID_CAFFEINE.join(", ")}`);
  }
  if (row.price_cents && isNaN(parseInt(row.price_cents))) {
    errors.push(`price_cents must be a number (in cents, e.g. 1450 for $14.50)`);
  }
  return errors;
}

function buildSQL(rows) {
  const statements = [];
  for (const row of rows) {
    const id   = `ras-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,5)}`;
    const slug = row.slug || slugify(row.name);

    const val = (v, fallback = "NULL") =>
      v ? `'${String(v).replace(/'/g, "''")}'` : fallback;

    statements.push(
      `INSERT OR IGNORE INTO products
         (id, name, slug, room_id, sku, price_cents, compare_price, weight_oz,
          tag, blurb, description, ingredients, caffeine,
          fx_energy, fx_calm, fx_focus, fx_digestion,
          in_stock, featured, sort_order)
       VALUES (
         ${val(id)}, ${val(row.name)}, ${val(slug)}, ${val(row.room_id)},
         ${val(row.sku)}, ${parseInt(row.price_cents)},
         ${row.compare_price ? parseInt(row.compare_price) : "NULL"},
         ${row.weight_oz ? parseFloat(row.weight_oz) : 2.0},
         ${val(row.tag)}, ${val(row.blurb)}, ${val(row.description)},
         ${val(row.ingredients)},
         ${val(row.caffeine || "none")},
         ${parseInt(row.fx_energy || 0)}, ${parseInt(row.fx_calm || 0)},
         ${parseInt(row.fx_focus || 0)}, ${parseInt(row.fx_digestion || 0)},
         ${parseInt(row.in_stock ?? 1)}, ${parseInt(row.featured || 0)},
         ${parseInt(row.sort_order || 0)}
       );`
    );
  }
  return statements;
}

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error("Usage: node scripts/import-products.js products.csv");
    process.exit(1);
  }

  const content = readFileSync(csvPath, "utf8");
  const rows    = parseCSV(content);

  console.log(`\nParsed ${rows.length} rows from ${csvPath}\n`);

  // Validate
  let hasErrors = false;
  for (const row of rows) {
    const errors = validateRow(row);
    if (errors.length > 0) {
      console.error(`Row ${row._lineNum} (${row.name || "unnamed"}): ${errors.join("; ")}`);
      hasErrors = true;
    }
  }
  if (hasErrors) {
    console.error("\nFix the errors above and re-run.");
    process.exit(1);
  }

  console.log("Validation passed. Importing in batches of 50...\n");

  // Batch insert
  const statements = buildSQL(rows);
  const batchSize  = 50;
  let imported = 0;

  for (let i = 0; i < statements.length; i += batchSize) {
    const batch = statements.slice(i, i + batchSize);
    const sql   = batch.join("\n");
    const tmpFile = `/tmp/ras-import-${Date.now()}.sql`;

    require("fs").writeFileSync(tmpFile, sql);

    try {
      execSync(`wrangler d1 execute rise-and-steep-db --file=${tmpFile}`, { stdio: "pipe" });
      imported += batch.length;
      console.log(`Imported ${imported}/${rows.length} products...`);
    } catch (e) {
      console.error(`Batch failed at row ${i + 1}:`, e.stderr?.toString());
    }
  }

  console.log(`\nDone. ${imported} products imported into D1.\n`);
}

main().catch(console.error);
