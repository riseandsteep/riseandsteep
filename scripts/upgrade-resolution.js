const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const R2_BUCKET = 'rise-and-steep-images';
const TMP_DIR = path.join(__dirname, 'tmp-images-hires');

if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR);

const matched = JSON.parse(fs.readFileSync('matched.json', 'utf8'));

function extFromUrl(url) {
  const m = url.match(/\.(jpg|jpeg|png|webp)(\?|$)/i);
  return m ? m[1].toLowerCase() : 'jpg';
}

function toHiRes(url) {
  return url.replace(/\d+\.\d+(\.jpg|\.jpeg|\.png|\.webp)/i, '1280.1280$1');
}

(async () => {
  let ok = 0, failed = 0, skipped = 0;

  for (let i = 0; i < matched.length; i++) {
    const p = matched[i];
    const hiResUrl = toHiRes(p.mrh_img);
    const ext = extFromUrl(p.mrh_img);
    const localFile = path.join(TMP_DIR, `${p.slug}.${ext}`);
    const r2Key = `herbs/${p.slug}.${ext}`;

    process.stdout.write(`[${i + 1}/${matched.length}] ${p.slug} ... `);

    try {
      const resp = await fetch(hiResUrl);
      if (!resp.ok) {
        console.log(`no hi-res available (${resp.status}), skipping`);
        skipped++;
        continue;
      }
      const buf = Buffer.from(await resp.arrayBuffer());
      if (buf.length < 20000) {
        console.log(`hi-res too small (${buf.length}b), likely not real, skipping`);
        skipped++;
        continue;
      }
      fs.writeFileSync(localFile, buf);

      execSync(
        `wrangler r2 object put "${R2_BUCKET}/${r2Key}" --file="${localFile}" --remote`,
        { stdio: 'pipe' }
      );

      ok++;
      console.log(`done (${buf.length}b)`);
    } catch (e) {
      failed++;
      console.log(`FAILED: ${e.message}`);
    }
  }

  console.log(`\nDone. ${ok} upgraded, ${skipped} skipped (no hi-res found), ${failed} failed.`);
})();
