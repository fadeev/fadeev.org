// Give every frame of a walk loop the same ears (from one clean frame, carried with the head)
// and smooth the kink at the back of the neck. Frames are 576x384, 0 = cat.
//   node fix-head.js <loop.gray> <frames> <templateFrame> <out.gray>
const fs = require('fs');
const [file, Narg, tplArg, outFile] = process.argv.slice(2);
const W = 576, H = 384, n = W * H, N = +Narg, TPL = +tplArg;
const buf = fs.readFileSync(file);
const cat = (f, x, y) => x >= 0 && y >= 0 && x < W && y < H && buf[f * n + y * W + x] < 128 ? 1 : 0;

function sdfOf(get) {
  const inside = new Uint8Array(n);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) inside[y * W + x] = get(x, y);
  const dist = mask => {
    const d = new Float32Array(n).fill(1e9);
    for (let i = 0; i < n; i++) if (!mask[i]) d[i] = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; let v = d[i];
      if (x > 0) v = Math.min(v, d[i - 1] + 3);
      if (y > 0) { v = Math.min(v, d[i - W] + 3); if (x > 0) v = Math.min(v, d[i - W - 1] + 4); if (x < W - 1) v = Math.min(v, d[i - W + 1] + 4); }
      d[i] = v;
    }
    for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
      const i = y * W + x; let v = d[i];
      if (x < W - 1) v = Math.min(v, d[i + 1] + 3);
      if (y < H - 1) { v = Math.min(v, d[i + W] + 3); if (x < W - 1) v = Math.min(v, d[i + W + 1] + 4); if (x > 0) v = Math.min(v, d[i + W - 1] + 4); }
      d[i] = v;
    }
    return d;
  };
  const din = dist(inside), dout = dist(inside.map(v => 1 - v));
  const s = new Float32Array(n);
  for (let i = 0; i < n; i++) s[i] = (inside[i] ? din[i] - 1.5 : -(dout[i] - 1.5)) / 3;
  return s;
}

// Head position: align on the face and jaw below the ears, sub-pixel by parabola fit.
function headTop(f) { for (let y = 0; y < H; y++) for (let x = 0; x < 220; x++) if (cat(f, x, y)) return y; return H; }
const tplTop = headTop(TPL);
const EAR_BASE = tplTop + 48;          // ears are everything above this row in the template (3x px)
function headShift(f) {
  const score = (dx, dy) => { let e = 0; for (let y = EAR_BASE; y < EAR_BASE + 110; y++) for (let x = 0; x < 170; x++) e += cat(TPL, x, y) ^ cat(f, x + dx, y + dy); return e; };
  let best = [1e9, 0, 0];
  for (let dy = -10; dy <= 10; dy++) for (let dx = -10; dx <= 10; dx++) { const e = score(dx, dy); if (e < best[0]) best = [e, dx, dy]; }
  return [best[1], best[2]];
}

const tplSdf = sdfOf((x, y) => cat(TPL, x, y));
const out = Buffer.alloc(N * n);
const report = [];
for (let f = 0; f < N; f++) {
  const [dx, dy] = headShift(f);
  const s = sdfOf((x, y) => cat(f, x, y));
  // 1. ears: blend to the template's ear, shifted with the head, fading in over 14 rows above the ear base
  for (let y = 0; y < H; y++) for (let x = 0; x < 260; x++) {
    const ty = y - dy, tx = x - dx;                   // template coordinates
    const wy = Math.max(0, Math.min(1, (EAR_BASE - ty) / 14));
    const wx = Math.max(0, Math.min(1, (230 - tx) / 20));
    const w = wy * wx; if (!w) continue;
    const t = tx >= 0 && ty >= 0 && tx < W && ty < H ? tplSdf[ty * W + tx] : -50;
    s[y * W + x] = (1 - w) * s[y * W + x] + w * t;
  }
  // 2. neck: the top edge from behind the ears to mid-back, smoothed into an even curve
  const X0 = 112 + dx, X1 = 360 + dx;
  const top = [];
  for (let x = X0 - 40; x <= X1 + 40; x++) { let y = 0; while (y < H && s[y * W + x] <= 0) y++; top.push(y); }
  const smooth = top.map((_, i) => { let a = 0, c = 0; for (let k = -28; k <= 28; k++) { const j = i + k; if (j >= 0 && j < top.length) { const w = 1 - Math.abs(k) / 29; a += top[j] * w; c += w; } } return a / c; });
  for (let x = X0; x <= X1; x++) {
    const i = x - (X0 - 40), wEdge = Math.min(1, (x - X0) / 30, (X1 - x) / 30);
    const target = top[i] + (smooth[i] - top[i]) * Math.max(0, wEdge);
    // rewrite the column's distance near the edge so the outline sits at the smoothed height
    for (let y = Math.max(0, Math.floor(Math.min(target, top[i])) - 6); y < Math.min(H, Math.ceil(Math.max(target, top[i])) + 6); y++)
      s[y * W + x] = Math.max(-2, Math.min(2, (y - target) / 3));
  }
  for (let i = 0; i < n; i++) out[f * n + i] = Math.round(255 * (1 - Math.max(0, Math.min(1, s[i] + 0.5))));
  report.push(`${dx},${dy}`);
}
fs.writeFileSync(outFile, out);
console.log('template frame', TPL, 'head top', tplTop, 'shifts', report.join(' '));
