const fs = require('fs');

function normalize(str) {
  return str
    .toLowerCase()
    .replace(/['']/g, '')            // remove apostrophes entirely (cat's -> cats)
    .replace(/[^a-z0-9\s]/g, ' ')     // strip other punctuation/commas
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenSet(str) {
  return new Set(normalize(str).split(' ').filter(Boolean));
}

function jaccard(a, b) {
  const setA = tokenSet(a), setB = tokenSet(b);
  const inter = [...setA].filter(x => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : inter / union;
}

const mrhRaw = JSON.parse(fs.readFileSync('mrh-products.json', 'utf8'));
const rsRaw = JSON.parse(fs.readFileSync('rs-products.json', 'utf8'));
const rsProducts = Array.isArray(rsRaw) ? (rsRaw[0].results || rsRaw) : (rsRaw.results || []);

console.log(`Loaded ${mrhRaw.length} MRH products, ${rsProducts.length} Rise & Steep herb products.\n`);

const mrhByNorm = new Map();
for (const p of mrhRaw) {
  const key = normalize(p.name);
  if (!mrhByNorm.has(key)) mrhByNorm.set(key, p);
}

const matched = [];
const unmatched = [];
const ACCEPT_THRESHOLD = 0.75;   // auto-accept as a match
const SUGGEST_THRESHOLD = 0.35;  // show as a possible candidate for review

for (const rs of rsProducts) {
  const normName = normalize(rs.name);
  let hit = mrhByNorm.get(normName);
  let score = hit ? 1 : 0;

  if (!hit) {
    const stripped = normName.replace(/\borganic\b/g, '').replace(/\s+/g, ' ').trim();
    for (const [key, p] of mrhByNorm) {
      const keyStripped = key.replace(/\borganic\b/g, '').replace(/\s+/g, ' ').trim();
      if (keyStripped === stripped) { hit = p; score = 0.99; break; }
    }
  }

  let bestCandidate = null, bestScore = 0;
  if (!hit) {
    for (const p of mrhRaw) {
      const s = jaccard(rs.name, p.name);
      if (s > bestScore) { bestScore = s; bestCandidate = p; }
    }
    if (bestScore >= ACCEPT_THRESHOLD) { hit = bestCandidate; score = bestScore; }
  }

  if (hit) {
    matched.push({
      id: rs.id, slug: rs.slug, name: rs.name,
      mrh_name: hit.name, mrh_img: hit.img, mrh_url: hit.url,
      confidence: Number(score.toFixed(2))
    });
  } else {
    unmatched.push({
      id: rs.id, slug: rs.slug, name: rs.name,
      best_candidate: bestScore >= SUGGEST_THRESHOLD ? bestCandidate.name : null,
      best_candidate_img: bestScore >= SUGGEST_THRESHOLD ? bestCandidate.img : null,
      best_score: Number(bestScore.toFixed(2))
    });
  }
}

fs.writeFileSync('matched.json', JSON.stringify(matched, null, 2));
fs.writeFileSync('unmatched.json', JSON.stringify(unmatched, null, 2));

console.log(`Matched: ${matched.length}`);
console.log(`Unmatched: ${unmatched.length}`);

const fuzzy = matched.filter(m => m.confidence < 1);
console.log(`\n${fuzzy.length} were fuzzy (not exact) matches:`);
fuzzy.forEach(m => console.log(`  [${m.confidence}] "${m.name}" -> "${m.mrh_name}"`));

const withCandidate = unmatched.filter(u => u.best_candidate);
console.log(`\n${withCandidate.length} unmatched items have a possible candidate (needs your review):`);
withCandidate.forEach(u => console.log(`  [${u.best_score}] "${u.name}" -> "${u.best_candidate}"`));

const noCandidate = unmatched.filter(u => !u.best_candidate);
console.log(`\n${noCandidate.length} unmatched items have NO reasonable candidate (likely not in this MRH category):`);
noCandidate.forEach(u => console.log(`  "${u.name}"`));
