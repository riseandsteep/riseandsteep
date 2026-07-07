const fs = require('fs');

const matched = JSON.parse(fs.readFileSync('matched.json', 'utf8'));
const sample = matched[0];

console.log('Original URL:', sample.mrh_img);

// BigCommerce CDN URLs often look like:
// .../Name__12345.170000000.1280.1280__67890.170000001.220.290.jpg
// The "220.290" at the end is a secondary resize. Try stripping it to get the 1280x1280 original.
const stripped = sample.mrh_img.replace(/__\d+\.\d+\.\d+\.\d+(?=\.jpg|\.png|\.webp|\?|$)/i, '');
console.log('Stripped candidate URL:', stripped);

(async () => {
  for (const [label, url] of [['original', sample.mrh_img], ['stripped', stripped]]) {
    try {
      const resp = await fetch(url);
      const buf = Buffer.from(await resp.arrayBuffer());
      console.log(`${label}: status=${resp.status}, size=${buf.length} bytes, content-type=${resp.headers.get('content-type')}`);
    } catch (e) {
      console.log(`${label}: FAILED - ${e.message}`);
    }
  }
})();
