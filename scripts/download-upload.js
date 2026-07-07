const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const R2_BUCKET = 'rise-and-steep-images';
const PUBLIC_BASE = 'https://pub-ba761ecf66654cecb93be2a0a3efc668.r2.dev';
const TMP_DIR = path.join(__dirname, 'tmp-images');

if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR);

const matched = JSON.parse(fs.readFileSync('matched.json', 'utf8'));

function extFromUrl(url) {
  const m = url.match(/\.(jpg|jpeg|png|webp)(\?|$)/i);
  return m ? m[1].toLowerCase() : 'jpg';
}

function sqlEscape(str) {
  return str.replace(/'/g, "''");
}

(async () => {
  const sqlLines = [];
  let ok = 0, failed = 0;

  for (let i = 0; i < matched.length; i++) {
    const p = matched[i];
    const ext = extFromUrl(p.mrh_img);
    const localFile = path.join(TMP_DIR, `${p.slug}.${ext}`);
    const r2Key = `herbs/${p.slug}.${ext}`;
    const publicUrl = `${PUBLIC_BASE}/${r2Key}`;

    process.stdout.write(`[${i + 1}/${matched.length}] ${p.slug} ... `);

    try {
      // Download
      const resp = await fetch(p.mrh_img);
      if (!resp.ok) throw new Error(`download failed: ${resp.status}`);
      const buf = Buffer.from(await resp.arrayBuffer());
      fs.writeFileSync(localFile, buf);

      // Upload to R2
      execSync(
        `wrangler r2 object put "${R2_BUCKET}/${r2Key}" --file="${localFile}" --remote`,
        { stdio: 'pipe' }
      );

      sqlLines.push(
        `UPDATE products SET image_key = '${sqlEscape(publicUrl)}' WHERE id = '${sqlEscape(p.id)}';`
      );
      ok++;
      console.log('done');
    } catch (e) {
      failed++;
      console.log(`FAILED: ${e.message}`);
    }
  }

  fs.writeFileSync('update-images.sql', sqlLines.join('\n'));
  console.log(`\nDone. ${ok} succeeded, ${failed} failed.`);
  console.log(`SQL written to update-images.sql (${sqlLines.length} statements).`);
})();
