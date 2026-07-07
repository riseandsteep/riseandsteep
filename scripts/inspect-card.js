const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://mountainroseherbs.com/catalog/herbs-spices/bulk', { waitUntil: 'networkidle', timeout: 60000 });

  const html = await page.evaluate(() => {
    const cards = document.querySelectorAll('.card');
    // grab the 10th card, skipping any that might be ads/filters at the top
    const card = cards[10] || cards[0];
    return card ? card.outerHTML : 'NO CARD FOUND';
  });

  console.log(html);

  const count = await page.evaluate(() => document.querySelectorAll('.card').length);
  console.log('\n\nTotal .card elements on page:', count);

  await browser.close();
})();
