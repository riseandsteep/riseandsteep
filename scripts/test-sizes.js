const fs = require('fs');

const matched = JSON.parse(fs.readFileSync('matched.json', 'utf8'));
const sample = matched[0];

console.log('Original URL:', sample.mrh_img, '\n');

const sizesToTry = ['1280.1280', '960.960', '640.640', '500.659', '452.594', '1000.1000'];

(async () => {
  for (const size of sizesToTry) {
    const candidate = sample.mrh_img.replace(/\d+\.\d+(\.jpg|\.jpeg|\.png|\.webp)/i, `${size}$1`);
    try {
      const resp = await fetch(candidate);
      const buf = Buffer.from(await resp.arrayBuffer());
      console.log(`${size}: status=${resp.status}, size=${buf.length} bytes -> ${candidate}`);
    } catch (e) {
      console.log(`${size}: FAILED - ${e.message}`);
    }
  }
})();
