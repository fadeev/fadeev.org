// Clean finished 1x frames: wipe specks (pieces under `min` px apart from the cat), repack the
// sheet, and for bridge clips list the segments where the cat still comes apart, so the
// runtime skips them.
//   node clean.js <dir> <imagesDir> <names...>
const fs = require('fs');
const { execFileSync } = require('child_process');
const [dir, imagesDir, ...names] = process.argv.slice(2);
const W = 256, H = 160, n = W * H, COLS = 16, MIN = 12;
const clipsFile = `${dir}/cat-clips.json`, data = JSON.parse(fs.readFileSync(clipsFile));
for (const name of names) {
  const b = Buffer.from(fs.readFileSync(`${dir}/${name}.1x.gray`)), N = b.length / n, broken = new Set();
  let wiped = 0;
  for (let f = 0; f < N; f++) {
    const label = new Int32Array(n), pieces = []; let next = 1;
    for (let i = 0; i < n; i++) {
      if (b[f * n + i] >= 128 || label[i]) continue;
      const st = [i], px = []; label[i] = next;
      while (st.length) { const p = st.pop(); px.push(p); const x = p % W, y = (p / W) | 0;
        for (let v = -1; v <= 1; v++) for (let u = -1; u <= 1; u++) { const xx = x + u, yy = y + v; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const q = yy * W + xx; if (b[f * n + q] < 128 && !label[q]) { label[q] = next; st.push(q); } } }
      pieces.push(px); next++;
    }
    pieces.sort((a, c) => c.length - a.length);
    for (const px of pieces.slice(1)) {
      if (px.length < MIN) { for (const p of px) { // the speck and its soft edge
        const x = p % W, y = (p / W) | 0; for (let v = -1; v <= 1; v++) for (let u = -1; u <= 1; u++) { const xx = x + u, yy = y + v; if (xx >= 0 && yy >= 0 && xx < W && yy < H && label[yy * W + xx] !== 1) b[f * n + yy * W + xx] = 255; } } wiped++; }
      else broken.add(f);
    }
  }
  fs.writeFileSync(`${dir}/${name}.1x.gray`, b);
  const rows = Math.ceil(N / COLS), SW = COLS * W, SH = rows * H, rgba = Buffer.alloc(SW * SH * 4);
  for (let f = 0; f < N; f++) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
    rgba[(((Math.floor(f / COLS) * H) + y) * SW + (f % COLS) * W + x) * 4 + 3] = Math.max(0, Math.min(255, Math.round((255 - b[f * n + y * W + x] - 4) * 255 / 247)));
  fs.writeFileSync(`${dir}/${name}.rgba`, rgba);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${SW}x${SH}`, '-i', `${dir}/${name}.rgba`, '-pix_fmt', 'ya8', '-frames:v', '1', `${imagesDir}/cat-${name}.png`]);
  const clip = data.clips[name];
  if (clip && clip.every) clip.skip = [...new Set([...broken].map(f => Math.floor(f / clip.length)))].sort((a, c) => a - c);
  console.log(name.padEnd(9), 'specks wiped', wiped, '| frames still in pieces', broken.size, clip && clip.skip ? '| bridges skipped ' + JSON.stringify(clip.skip) : '');
}
fs.writeFileSync(clipsFile, JSON.stringify(data));
