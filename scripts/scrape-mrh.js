const { chromium } = require('playwright');
const fs = require('fs');

const URL = 'https://mountainroseherbs.com/catalog/herbs-spices/bulk';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  console.log(`Fetching ${URL} ...`);
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });

  // Scroll to the bottom a few times to trigger any lazy-loaded images
  for (let i = 0; i < 5; i++) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(1000);

  const products = await page.evaluate(() => {
    const cards = document.querySelectorAll('article.card');
    return Array.from(cards).map(card => {
      const name = card.getAttribute('data-product-title') || null;
      const id = card.getAttribute('data-product-id') || null;
      const sku = card.getAttribute('data-product-sku') || null;
      const linkEl = card.querySelector('.card-figure__link');
      const url = linkEl ? linkEl.getAttribute('href') : null;
      const imgEl = card.querySelector('.card-img-container img');
      let img = imgEl ? (imgEl.getAttribute('src') || imgEl.getAttribute('data-src')) : null;
      if (img && img.startsWith('//')) img = 'https:' + img;
      return { id, sku, name, url, img };
    });
  });

  const valid = products.filter(p => p.name && p.img);
  const seen = new Set();
  const deduped = [];
  for (const p of valid) {
    if (!seen.has(p.id)) { seen.add(p.id); deduped.push(p); }
  }

  fs.writeFileSync('mrh-products.json', JSON.stringify(deduped, null, 2));
  console.log(`Total cards found: ${products.length}`);
  console.log(`Valid (name+img): ${valid.length}`);
  console.log(`After dedup by product id: ${deduped.length}`);
  console.log(`Saved to mrh-products.json`);

  await browser.close();
})();
