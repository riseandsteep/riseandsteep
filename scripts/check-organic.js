const fs = require('fs');

function capitalizeFirst(str) {
  if (!str) return str;
  const match = str.match(/^(\s*)([a-z])/);
  if (match) {
    return str.slice(0, match[1].length) + match[2].toUpperCase() + str.slice(match[1].length + 1);
  }
  return str;
}

function cleanOrganicText(text) {
  if (!text) return text;
  let t = text;
  t = t.replace(/certified\s+organic\s*/gi, '');
  t = t.replace(/organically\s+grown\s*/gi, '');
  t = t.replace(/organically\s+cultivated\s*/gi, 'cultivated ');
  t = t.replace(/organically\s*/gi, '');
  t = t.replace(/\borganic\b\s*/gi, '');
  t = t.replace(/\s{2,}/g, ' ');
  t = t.replace(/\s+([,.;:])/g, '$1');
  t = t.replace(/\n\s+/g, '\n');
  t = t.trim();
  t = t.split('\n').map(line => capitalizeFirst(line)).join('\n');
  return t;
}

const raw = JSON.parse(fs.readFileSync('organic-products.json', 'utf8'));
const rows = raw[0].results || [];

const targets = rows.filter(r =>
  r.description && (r.description.toLowerCase().includes('organically') || r.description.toLowerCase().includes('ingredients'))
).slice(0, 6);

targets.forEach(r => {
  console.log('BEFORE:', r.description);
  console.log('AFTER: ', cleanOrganicText(r.description));
  console.log('---');
});
