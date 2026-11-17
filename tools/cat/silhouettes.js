// Silhouette every frame of a clip (black cat on white) and measure it.
//   node silhouettes.js <video.gray> <W> <H> <out.mask> <out.json>
// out.mask: one byte per pixel, 1 = cat (largest dark blob, holes filled).
// out.json: per frame bottom row, top row, left/right, torso x, back height above the ground.
const fs = require('fs');
const [file, Warg, Harg, outMask, outJson] = process.argv.slice(2);
const W = +Warg, H = +Harg, n = W * H;
const buf = fs.readFileSync(file);
const N = buf.length / n;
const masks = Buffer.alloc(N * n);
const info = [];
const stack = [];
for (let f = 0; f < N; f++) {
  const m = new Uint8Array(n);
  for (let i = 0; i < n; i++) m[i] = buf[f * n + i] < 128 ? 1 : 0;
  const label = new Int32Array(n); let best = 0, bestSize = 0, next = 1;
  for (let i = 0; i < n; i++) {
    if (!m[i] || label[i]) continue;
    let size = 0; stack.push(i); label[i] = next;
    while (stack.length) {
      const p = stack.pop(); size++;
      const x = p % W, y = (p / W) | 0;
      if (x > 0 && m[p - 1] && !label[p - 1]) { label[p - 1] = next; stack.push(p - 1); }
      if (x < W - 1 && m[p + 1] && !label[p + 1]) { label[p + 1] = next; stack.push(p + 1); }
      if (y > 0 && m[p - W] && !label[p - W]) { label[p - W] = next; stack.push(p - W); }
      if (y < H - 1 && m[p + W] && !label[p + W]) { label[p + W] = next; stack.push(p + W); }
    }
    if (size > bestSize) { bestSize = size; best = next; }
    next++;
  }
  for (let i = 0; i < n; i++) m[i] = label[i] === best ? 1 : 0;
  const bg = new Uint8Array(n);
  const seed = i => { if (!m[i] && !bg[i]) { bg[i] = 1; stack.push(i); } };
  for (let x = 0; x < W; x++) { seed(x); seed((H - 1) * W + x); }
  for (let y = 0; y < H; y++) { seed(y * W); seed(y * W + W - 1); }
  while (stack.length) {
    const p = stack.pop(); const x = p % W, y = (p / W) | 0;
    if (x > 0) seed(p - 1); if (x < W - 1) seed(p + 1); if (y > 0) seed(p - W); if (y < H - 1) seed(p + W);
  }
  let l = W, r = -1, t = H, b = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; const v = bg[i] ? 0 : 1; masks[f * n + i] = v;
    if (v) { if (x < l) l = x; if (x > r) r = x; if (y < t) t = y; if (y > b) b = y; }
  }
  // torso: darkness-weighted x of the band 35-55% down the silhouette; back: top edge there
  let sx = 0, w = 0;
  for (let y = Math.round(t + (b - t) * 0.35); y <= Math.round(t + (b - t) * 0.55); y++) for (let x = 0; x < W; x++) if (masks[f * n + y * W + x]) { sx += x; w++; }
  const tx = Math.round(sx / w);
  let back = 0; while (back < H && !masks[f * n + back * W + tx]) back++;
  info.push({ t, b, l, r, torso: +(sx / w).toFixed(1), back: b - back, area: bestSize });
}
fs.writeFileSync(outMask, masks);
fs.writeFileSync(outJson, JSON.stringify(info));
console.log(`${N} frames`);
