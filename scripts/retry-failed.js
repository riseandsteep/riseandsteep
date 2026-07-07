const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const R2_BUCKET = 'rise-and-steep-images';
const PUBLIC_BASE = 'https://pub-ba761ecf66654cecb93be2a0a3efc668.r2.dev';
const TMP_DIR = path.join(__dirname, 'tmp-images');

const RETRY_SLUGS = ['eleuthero-root-organic', 'spearmint-leaf-organic'];

const matched = JSON.parse(fs.readFileSync('matched.json', 'utf8'));
const toRetry = matched.filter(p => RETRY_SLUGS.includes(p.slug));

function extFromUrl(url) {
  const m = url.match(/\.(jpg|jpeg|png|webp)(\?|$)/i);
  return m ? m[1].toLowerCase() : 'jpg';
}
function sqlEscape(str) { return str.replace(/'/g, "''"); }

(async () => {
  const newSqlLines = [];

  for (const p of toRetry) {
    const ext = extFromUrl(p.mrh_img);
    const localFile = path.join(TMP_DIR, `${p.slug}.${ext}`);
    const r2Key = `herbs/${p.slug}.${ext}`;
    const publicUrl = `${PUBLIC_BASE}/${r2Key}`;

    process.stdout.write(`Retrying ${p.slug} ... `);
    try {
      const resp = await fetch(p.mrh_img);
      if (!resp.ok) throw new Error(`download failed: ${resp.status}`);
      const buf = Buffer.from(await resp.arrayBuffer());
      fs.writeFileSync(localFile, buf);

      execSync(
        `wrangler r2 object put "${R2_BUCKET}/${r2Key}" --file="${localFile}" --remote`,
        { stdio: 'pipe' }
      );

      newSqlLines.push(`UPDATE products SET image_key = '${sqlEscape(publicUrl)}' WHERE id = '${sqlEscape(p.id)}';`);
      console.log('done');
    } catch (e) {
      console.log(`FAILED again: ${e.message}`);
    }
  }

  if (newSqlLines.length) {
    fs.appendFileSync('update-images.sql', '\n' + newSqlLines.join('\n'));
    console.log(`\nAppended ${newSqlLines.length} statements to update-images.sql`);
  }
})();
