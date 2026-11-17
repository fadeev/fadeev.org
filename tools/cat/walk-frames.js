// Turn a loop of video frames (black cat on white) into clean silhouette frames.
//   node walk-frames.js <video.gray> <W> <H> <first> <count> <out.gray>
// Writes <count> frames of 576x384 (3x a 192x128 sheet cell), 0 = cat, 255 = clear,
// every frame scaled alike, with the lowest paw on row 363 (row 121 in the cell).
const fs = require('fs');
const [file, Warg, Harg, firstArg, countArg, outFile] = process.argv.slice(2);
const W = +Warg, H = +Harg, first = +firstArg, count = +countArg, n = W * H;
const buf = fs.readFileSync(file);
const OW = 576, OH = 384, BASE = 363;

// 1. mask: dark = cat; keep the largest dark blob; fill every hole not reachable from the border
function mask(f) {
  const m = new Uint8Array(n);
  for (let i = 0; i < n; i++) m[i] = buf[f * n + i] < 128 ? 1 : 0;
  // largest connected component
  const label = new Int32Array(n); let best = 0, bestSize = 0, next = 1;
  const stack = [];
  for (let i = 0; i < n; i++) {
    if (!m[i] || label[i]) continue;
    let size = 0; stack.push(i); label[i] = next;
    while (stack.length) {
      const p = stack.pop(); size++;
      const x = p % W, y = (p / W) | 0;
      for (const q of [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, y > 0 ? p - W : -1, y < H - 1 ? p + W : -1])
        if (q >= 0 && m[q] && !label[q]) { label[q] = next; stack.push(q); }
    }
    if (size > bestSize) { bestSize = size; best = next; }
    next++;
  }
  for (let i = 0; i < n; i++) m[i] = label[i] === best ? 1 : 0;
  // holes: flood the background from the border; anything not reached is cat
  const bg = new Uint8Array(n);
  for (let x = 0; x < W; x++) for (const y of [0, H - 1]) if (!m[y * W + x]) { bg[y * W + x] = 1; stack.push(y * W + x); }
  for (let y = 0; y < H; y++) for (const x of [0, W - 1]) if (!m[y * W + x] && !bg[y * W + x]) { bg[y * W + x] = 1; stack.push(y * W + x); }
  while (stack.length) {
    const p = stack.pop(); const x = p % W, y = (p / W) | 0;
    for (const q of [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, y > 0 ? p - W : -1, y < H - 1 ? p + W : -1])
      if (q >= 0 && !m[q] && !bg[q]) { bg[q] = 1; stack.push(q); }
  }
  for (let i = 0; i < n; i++) m[i] = bg[i] ? 0 : 1;
  return m;
}

const masks = [], boxes = [];
for (let k = 0; k < count; k++) {
  const m = mask(first + k); masks.push(m);
  let l = W, r = -1, t = H, b = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (m[y * W + x]) { if (x < l) l = x; if (x > r) r = x; if (y < t) t = y; if (y > b) b = y; }
  boxes.push({ l, r, t, b });
}
// 2. one scale for all frames: the union width (after lining up the ground) fits the cell with a margin
const L = Math.min(...boxes.map(b => b.l)), R = Math.max(...boxes.map(b => b.r));
const tallest = Math.max(...boxes.map(b => b.b - b.t));
const scale = Math.min((OW - 24) / (R - L + 1), (BASE - 12) / tallest);
const left = (OW - (R - L + 1) * scale) / 2;
// 3. resample each frame (box-filtered coverage), ground on BASE, then threshold for a crisp edge
const out = Buffer.alloc(count * OW * OH, 255);
for (let k = 0; k < count; k++) {
  const m = masks[k], b = boxes[k].b;
  for (let y = 0; y < OH; y++) for (let x = 0; x < OW; x++) {
    // source area covered by this output pixel
    const sx0 = L + (x - left) / scale, sx1 = L + (x + 1 - left) / scale;
    const sy0 = b + (y - BASE - 1) / scale, sy1 = b + (y - BASE) / scale;
    let cov = 0, tot = 0;
    for (let sy = Math.floor(sy0); sy < Math.ceil(sy1); sy++) for (let sx = Math.floor(sx0); sx < Math.ceil(sx1); sx++) {
      const wy = Math.min(sy + 1, sy1) - Math.max(sy, sy0), wx = Math.min(sx + 1, sx1) - Math.max(sx, sx0);
      const w = wx * wy; tot += w;
      if (sx >= 0 && sy >= 0 && sx < W && sy < H && m[sy * W + sx]) cov += w;
    }
    out[k * OW * OH + y * OW + x] = Math.round(255 * (1 - (tot ? cov / tot : 0)));
  }
}
fs.writeFileSync(outFile, out);
console.log(JSON.stringify({ scale: +scale.toFixed(4), union: [L, R], tallest, catWidthCell: +((R - L + 1) * scale / 3).toFixed(1), catHeightCell: +(tallest * scale / 3).toFixed(1) }));
