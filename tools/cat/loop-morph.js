// Close a walk loop seamlessly by morphing its last K frames into the stride before it.
//   node loop-morph.js <frames.gray> <W> <H> <start> <period> <K> <out.gray>
// Frame j of the loop is frame start+j; over the last K frames each is blended (as a
// signed distance field, so shapes morph instead of cross-fading) with the frame one
// period earlier, ramping to it fully by the end, so the last frame leads into the first.
const fs = require('fs');
const [file, Warg, Harg, startArg, periodArg, Karg, outFile] = process.argv.slice(2);
const W = +Warg, H = +Harg, n = W * H, start = +startArg, P = +periodArg, K = +Karg;
const buf = fs.readFileSync(file);

// signed distance (positive inside the cat), two-pass chamfer 3-4 approximation, in pixels
function sdf(f) {
  const inside = new Uint8Array(n);
  for (let i = 0; i < n; i++) inside[i] = buf[f * n + i] < 128 ? 1 : 0;
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
  const din = dist(inside); // distance to outside, for inside pixels
  const outside = inside.map(v => 1 - v);
  const dout = dist(outside);
  const s = new Float32Array(n);
  for (let i = 0; i < n; i++) s[i] = (inside[i] ? din[i] - 1.5 : -(dout[i] - 1.5)) / 3;
  return s;
}
const isCat = (f, x, y) => x >= 0 && x < W && buf[f * n + y * W + x] < 128 ? 1 : 0;
function bestShift(a, b) {
  let best = [1e9, 0];
  for (let dx = -12; dx <= 12; dx++) {
    let e = 0;
    for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) e += isCat(a, x, y) ^ isCat(b, x + dx, y);
    if (e < best[0]) best = [e, dx];
  }
  return best[1];
}

const out = Buffer.alloc(P * n, 255);
const shifts = [];
for (let j = 0; j < P; j++) {
  const f = start + j;
  if (j < P - K) { out.set(buf.subarray(f * n, (f + 1) * n), j * n); continue; }
  const g = f - P;                      // same phase, one stride earlier
  const w = (j - (P - K) + 1) / K;      // ramps to 1 at the last frame
  const ww = w * w * (3 - 2 * w);       // ease in and out
  const dx = bestShift(f, g);           // g drawn at f's place: g's content sits dx to the right
  shifts.push(dx);
  const sf = sdf(f), sg = sdf(g);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    // move g gradually: at full weight it's drawn where it really is (no shift)
    const xg = x + Math.round(dx * (1 - ww));
    const vg = xg >= 0 && xg < W ? sg[y * W + xg] : -50;
    const v = (1 - ww) * sf[y * W + x] + ww * vg;
    // soft edge, one pixel wide
    const a = Math.max(0, Math.min(1, v + 0.5));
    out[j * n + y * W + x] = Math.round(255 * (1 - a));
  }
}
fs.writeFileSync(outFile, out);
console.log(JSON.stringify({ frames: P, morphed: K, shifts }));
