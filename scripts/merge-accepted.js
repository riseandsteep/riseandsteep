const fs = require('fs');

const ACCEPT_NAMES = [
  "Catnip Leaf Organic",
  "Hops Flower Organic",
  "Juniper Berry Organic",
  "Red Clover Blossom Organic",
  "Yarrow Flower Organic",
  "Chlorella Powder",
  "Sarsaparilla Root",
  "Ginseng Root American",
  "Pau dArco Bark",
  "Cardamom Pod Organic",
  "Cayenne Pepper Organic",
  "Black Walnut Leaf",
  "Rehmannia Root",
  "Senna Leaf",
  "Sumac Berry",
  "Schisandra Berry",
  "Clove Bud Organic",
];

const matched = JSON.parse(fs.readFileSync('matched.json', 'utf8'));
const unmatched = JSON.parse(fs.readFileSync('unmatched.json', 'utf8'));

const stillUnmatched = [];
let movedCount = 0;

for (const u of unmatched) {
  if (ACCEPT_NAMES.includes(u.name) && u.best_candidate) {
    matched.push({
      id: u.id, slug: u.slug, name: u.name,
      mrh_name: u.best_candidate, mrh_img: u.best_candidate_img,
      mrh_url: null, confidence: u.best_score, manually_reviewed: true
    });
    movedCount++;
  } else {
    stillUnmatched.push(u);
  }
}

fs.writeFileSync('matched.json', JSON.stringify(matched, null, 2));
fs.writeFileSync('unmatched.json', JSON.stringify(stillUnmatched, null, 2));

console.log(`Moved ${movedCount} manually-reviewed matches into matched.json`);
console.log(`Final matched count: ${matched.length}`);
console.log(`Remaining unmatched count: ${stillUnmatched.length}`);
