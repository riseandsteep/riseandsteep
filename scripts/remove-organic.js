const fs = require('fs');

function sqlEscape(str) {
  return str.replace(/'/g, "''");
}

function capitalizeFirst(str) {
  if (!str) return str;
  const trimmed = str;
  const match = trimmed.match(/^(\s*)([a-z])/);
  if (match) {
    return trimmed.slice(0, match[1].length) + match[2].toUpperCase() + trimmed.slice(match[1].length + 1);
  }
  return trimmed;
}

function cleanOrganicText(text) {
  if (!text) return text;
  let t = text;

  // Compound phrases first (order matters)
  t = t.replace(/certified\s+organic\s*/gi, '');
  t = t.replace(/organically\s+grown\s*/gi, '');
  t = t.replace(/organically\s+cultivated\s*/gi, 'cultivated ');
  t = t.replace(/organically\s*/gi, '');

  // Standalone "organic" as an adjective (with trailing space)
  t = t.replace(/\borganic\b\s*/gi, '');

  // Collapse leftover double spaces / space-before-punctuation artifacts
  t = t.replace(/\s{2,}/g, ' ');
  t = t.replace(/\s+([,.;:])/g, '$1');
  t = t.replace(/\n\s+/g, '\n');
  t = t.trim();

  // Capitalize the first letter of each line (in case removal left a lowercase word at the start)
  t = t.split('\n').map(line => capitalizeFirst(line)).join('\n');

  return t;
}

function cleanName(name) {
  if (!name) return name;
  return name.replace(/\s*Organic\s*$/i, '').trim();
}

const raw = JSON.parse(fs.readFileSync('organic-products.json', 'utf8'));
const rows = raw[0].results || [];

console.log(`Processing ${rows.length} products...`);

const sqlLines = [];
let changedCount = 0;

for (const row of rows) {
  const newName = cleanName(row.name);
  const newBlurb = cleanOrganicText(row.blurb);
  const newDescription = cleanOrganicText(row.description);
  const newIngredients = cleanOrganicText(row.ingredients);

  const changed = newName !== row.name || newBlurb !== row.blurb ||
                  newDescription !== row.description || newIngredients !== row.ingredients;

  if (changed) {
    changedCount++;
    sqlLines.push(
      `UPDATE products SET name = '${sqlEscape(newName)}', blurb = ${row.blurb !== null ? `'${sqlEscape(newBlurb)}'` : 'NULL'}, description = ${row.description !== null ? `'${sqlEscape(newDescription)}'` : 'NULL'}, ingredients = ${row.ingredients !== null ? `'${sqlEscape(newIngredients)}'` : 'NULL'} WHERE id = '${sqlEscape(row.id)}';`
    );
  }
}

fs.writeFileSync('remove-organic.sql', sqlLines.join('\n'));
console.log(`${changedCount} products changed. SQL written to remove-organic.sql`);

// Print a sample of before/after for spot-checking
console.log('\n--- Sample before/after (first 8) ---');
rows.slice(0, 8).forEach(row => {
  const newName = cleanName(row.name);
  if (newName !== row.name) {
    console.log(`NAME: "${row.name}" -> "${newName}"`);
  }
});

const blurbSamples = rows.filter(r => r.blurb && r.blurb.toLowerCase().includes('organic')).slice(0, 5);
blurbSamples.forEach(row => {
  console.log(`\nBLURB before: ${row.blurb}`);
  console.log(`BLURB after:  ${cleanOrganicText(row.blurb)}`);
});
