// Shared helpers for building the cat's behaviour sheets.
// Everything works in a 3x cell: 768x480 pixels (a 256x160 sheet cell), 0..1 coverage.
const fs = require('fs');
const { execFileSync } = require('child_process');

const CW = 768, CH = 480, CN = CW * CH;
const GROUND = 450;          // ground row in the 3x cell (150 in the sheet)
const ANCHOR = 400;          // torso column of the standing pose (133 in the sheet)
const SRC_W = 736, SRC_H = 400, SRC_N = SRC_W * SRC_H;
const WALK_SCALE = 0.9534;   // source px of the walking clip -> 3x cell px

// Place one source mask frame into the cell: scale about (srcX, srcY) -> (dstX, dstY), box-filtered coverage.
function place(mask, f, scale, srcX, srcY, dstX, dstY) {
  const out = new Float32Array(CN);
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    const sx0 = srcX + (x - dstX) / scale, sx1 = srcX + (x + 1 - dstX) / scale;
    const sy0 = srcY + (y - dstY) / scale, sy1 = srcY + (y + 1 - dstY) / scale;
    let cov = 0, tot = 0;
    for (let sy = Math.floor(sy0); sy < Math.ceil(sy1); sy++) for (let sx = Math.floor(sx0); sx < Math.ceil(sx1); sx++) {
      const w = (Math.min(sx + 1, sx1) - Math.max(sx, sx0)) * (Math.min(sy + 1, sy1) - Math.max(sy, sy0));
      tot += w;
      if (sx >= 0 && sy >= 0 && sx < SRC_W && sy < SRC_H && mask[f * SRC_N + sy * SRC_W + sx]) cov += w;
    }
    out[y * CW + x] = tot ? cov / tot : 0;
  }
  return out;
}

// Signed distance (px, positive inside) of a coverage frame, chamfer 3-4.
function sdf(cov) {
  const inside = new Uint8Array(CN);
  for (let i = 0; i < CN; i++) inside[i] = cov[i] >= 0.5 ? 1 : 0;
  const dist = mask => {
    const d = new Float32Array(CN).fill(1e9);
    for (let i = 0; i < CN; i++) if (!mask[i]) d[i] = 0;
    for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
      const i = y * CW + x; let v = d[i];
      if (x > 0) v = Math.min(v, d[i - 1] + 3);
      if (y > 0) { v = Math.min(v, d[i - CW] + 3); if (x > 0) v = Math.min(v, d[i - CW - 1] + 4); if (x < CW - 1) v = Math.min(v, d[i - CW + 1] + 4); }
      d[i] = v;
    }
    for (let y = CH - 1; y >= 0; y--) for (let x = CW - 1; x >= 0; x--) {
      const i = y * CW + x; let v = d[i];
      if (x < CW - 1) v = Math.min(v, d[i + 1] + 3);
      if (y < CH - 1) { v = Math.min(v, d[i + CW] + 3); if (x < CW - 1) v = Math.min(v, d[i + CW + 1] + 4); if (x > 0) v = Math.min(v, d[i + CW - 1] + 4); }
      d[i] = v;
    }
    return d;
  };
  const din = dist(inside), dout = dist(inside.map(v => 1 - v));
  const s = new Float32Array(CN);
  for (let i = 0; i < CN; i++) s[i] = (inside[i] ? din[i] - 1.5 : -(dout[i] - 1.5)) / 3;
  return s;
}
const fromSdf = s => { const c = new Float32Array(CN); for (let i = 0; i < CN; i++) c[i] = Math.max(0, Math.min(1, s[i] + 0.5)); return c; };

// Best horizontal/vertical shift that puts b onto a (b drawn at x+dx, y+dy matches a).
function bestShift(a, b, range = 24, vrange = 6) {
  let best = [1e9, 0, 0];
  for (let dy = -vrange; dy <= vrange; dy += 2) for (let dx = -range; dx <= range; dx += 2) {
    let e = 0;
    for (let y = 0; y < CH; y += 3) for (let x = 0; x < CW; x += 3) {
      const xb = x - dx, yb = y - dy;
      const vb = xb >= 0 && yb >= 0 && xb < CW && yb < CH ? b[yb * CW + xb] : 0;
      e += Math.abs(a[y * CW + x] - vb);
    }
    if (e < best[0]) best = [e, dx, dy];
  }
  return { err: best[0], dx: best[1], dy: best[2] };
}
const shifted = (s, dx, dy) => { const o = new Float32Array(CN).fill(-50); for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) { const xs = x - dx, ys = y - dy; if (xs >= 0 && ys >= 0 && xs < CW && ys < CH) o[y * CW + x] = s[ys * CW + xs]; } return o; };
const ease = t => t * t * (3 - 2 * t);

// Chamfer distance (px) from every pixel to the nearest pixel of `set`.
function distTo(set) {
  const d = new Float32Array(CN).fill(1e9);
  for (let i = 0; i < CN; i++) if (set[i]) d[i] = 0;
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    const i = y * CW + x; let v = d[i];
    if (x > 0) v = Math.min(v, d[i - 1] + 3);
    if (y > 0) { v = Math.min(v, d[i - CW] + 3); if (x > 0) v = Math.min(v, d[i - CW - 1] + 4); if (x < CW - 1) v = Math.min(v, d[i - CW + 1] + 4); }
    d[i] = v;
  }
  for (let y = CH - 1; y >= 0; y--) for (let x = CW - 1; x >= 0; x--) {
    const i = y * CW + x; let v = d[i];
    if (x < CW - 1) v = Math.min(v, d[i + 1] + 3);
    if (y < CH - 1) { v = Math.min(v, d[i + CW] + 3); if (x < CW - 1) v = Math.min(v, d[i + CW + 1] + 4); if (x > 0) v = Math.min(v, d[i + CW - 1] + 4); }
    d[i] = v;
  }
  for (let i = 0; i < CN; i++) d[i] /= 3;
  return d;
}

// Split a frame into body and tail. The tail is the thin part (no disc of radius R fits)
// sticking out behind the torso above the legs; it's described by its centreline from
// base to tip with a radius at each point, resampled to `M` points.
const R = 13, M = 48;
function splitTail(cov) {
  const inside = new Uint8Array(CN); for (let i = 0; i < CN; i++) inside[i] = cov[i] >= 0.5 ? 1 : 0;
  const s = sdf(cov);
  const centers = new Uint8Array(CN); for (let i = 0; i < CN; i++) centers[i] = s[i] >= R ? 1 : 0;
  const dc = distTo(centers);
  const thin = new Uint8Array(CN); for (let i = 0; i < CN; i++) thin[i] = inside[i] && dc[i] > R ? 1 : 0;
  const tx = torsoX(cov);
  let ground = 0; for (let i = 0; i < CN; i++) if (inside[i]) ground = Math.max(ground, (i / CW) | 0);
  // largest thin component behind the torso, above the legs
  const label = new Int32Array(CN); let best = null, next = 1;
  for (let i = 0; i < CN; i++) {
    if (!thin[i] || label[i]) continue;
    const pix = [i]; label[i] = next;
    for (let k = 0; k < pix.length; k++) { const p = pix[k], x = p % CW, y = (p / CW) | 0;
      for (const q of [x > 0 ? p - 1 : -1, x < CW - 1 ? p + 1 : -1, y > 0 ? p - CW : -1, y < CH - 1 ? p + CW : -1, x > 0 && y > 0 ? p - CW - 1 : -1, x < CW - 1 && y > 0 ? p - CW + 1 : -1, x > 0 && y < CH - 1 ? p + CW - 1 : -1, x < CW - 1 && y < CH - 1 ? p + CW + 1 : -1])
        if (q >= 0 && thin[q] && !label[q]) { label[q] = next; pix.push(q); } }
    let sx = 0, sy = 0; for (const p of pix) { sx += p % CW; sy += (p / CW) | 0; }
    const cx = sx / pix.length, cy = sy / pix.length;
    if (cx > tx + 40 && cy < ground - 70 && (!best || pix.length > best.length)) best = pix;
    next++;
  }
  if (!best || best.length < 300) return null;
  const tail = new Uint8Array(CN); for (const p of best) tail[p] = 1;
  // base: tail pixels touching the body; geodesic distance from there to every tail pixel
  const geo = new Float32Array(CN).fill(-1), queue = [];
  for (const p of best) { const x = p % CW, y = (p / CW) | 0; let touch = false;
    for (let v = -2; v <= 2 && !touch; v++) for (let u = -2; u <= 2; u++) { const xx = x + u, yy = y + v; if (xx >= 0 && yy >= 0 && xx < CW && yy < CH) { const q = yy * CW + xx; if (inside[q] && !tail[q]) { touch = true; break; } } }
    if (touch) { geo[p] = 0; queue.push(p); } }
  if (!queue.length) return null;
  for (let k = 0; k < queue.length; k++) { const p = queue[k], x = p % CW, y = (p / CW) | 0;
    for (const [u, v, c] of [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.41], [1, -1, 1.41], [-1, 1, 1.41], [-1, -1, 1.41]]) {
      const xx = x + u, yy = y + v; if (xx < 0 || yy < 0 || xx >= CW || yy >= CH) continue; const q = yy * CW + xx;
      if (tail[q] && geo[q] < 0) { geo[q] = geo[p] + c; queue.push(q); } } }
  // centreline: centroid and radius of each 3px band of geodesic distance
  let maxG = 0; for (const p of best) maxG = Math.max(maxG, geo[p]);
  const bins = []; for (let b = 0; b <= maxG / 3; b++) bins.push({ x: 0, y: 0, n: 0, r: 0 });
  for (const p of best) { if (geo[p] < 0) continue; const b = bins[Math.floor(geo[p] / 3)]; b.x += p % CW; b.y += (p / CW) | 0; b.n++; b.r = Math.max(b.r, s[p]); }
  const pts = bins.filter(b => b.n).map(b => ({ x: b.x / b.n, y: b.y / b.n, r: Math.max(1.5, b.r) }));
  if (pts.length < 4) return null;
  // the base starts inside the body, and the tip ends where the silhouette does
  const len = [0]; for (let k = 1; k < pts.length; k++) len.push(len[k - 1] + Math.hypot(pts[k].x - pts[k - 1].x, pts[k].y - pts[k - 1].y));
  const line = [];
  for (let m = 0; m < M; m++) { const t = len.at(-1) * m / (M - 1); let k = 1; while (k < pts.length - 1 && len[k] < t) k++;
    const f = len[k] === len[k - 1] ? 0 : (t - len[k - 1]) / (len[k] - len[k - 1]);
    line.push({ x: pts[k - 1].x + (pts[k].x - pts[k - 1].x) * f, y: pts[k - 1].y + (pts[k].y - pts[k - 1].y) * f, r: pts[k - 1].r + (pts[k].r - pts[k - 1].r) * f }); }
  const body = new Float32Array(CN); for (let i = 0; i < CN; i++) body[i] = tail[i] ? 0 : cov[i];
  return { body, line };
}
// Coverage of a tube along a centreline.
function drawTube(line) {
  const out = new Float32Array(CN);
  for (let k = 1; k < line.length; k++) {
    const a = line[k - 1], b = line[k], r = Math.max(a.r, b.r);
    const x0 = Math.floor(Math.min(a.x, b.x) - r - 2), x1 = Math.ceil(Math.max(a.x, b.x) + r + 2), y0 = Math.floor(Math.min(a.y, b.y) - r - 2), y1 = Math.ceil(Math.max(a.y, b.y) + r + 2);
    const vx = b.x - a.x, vy = b.y - a.y, vv = vx * vx + vy * vy || 1;
    for (let y = Math.max(0, y0); y <= Math.min(CH - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(CW - 1, x1); x++) {
      const t = Math.max(0, Math.min(1, ((x + .5 - a.x) * vx + (y + .5 - a.y) * vy) / vv));
      const d = Math.hypot(x + .5 - a.x - vx * t, y + .5 - a.y - vy * t), rr = a.r + (b.r - a.r) * t;
      const c = Math.max(0, Math.min(1, rr - d + .5)); const i = y * CW + x; if (c > out[i]) out[i] = c;
    }
  }
  return out;
}
// ---- deformation morph -------------------------------------------------------------
// Demons registration on clamped signed-distance fields, coarse to fine: finds a smooth
// displacement u on a's grid with b(x + u(x)) ~ a(x), so thin parts (ears, tail, legs)
// move to where they are in b instead of fading out.
function blur1(src, W, H, sigma) {
  const r = Math.ceil(sigma * 2.5), k = []; let ks = 0;
  for (let i = -r; i <= r; i++) { const v = Math.exp(-i * i / (2 * sigma * sigma)); k.push(v); ks += v; }
  const tmp = new Float32Array(W * H), out = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let a = 0; for (let i = -r; i <= r; i++) a += k[i + r] * src[y * W + Math.min(W - 1, Math.max(0, x + i))]; tmp[y * W + x] = a / ks; }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let a = 0; for (let i = -r; i <= r; i++) a += k[i + r] * tmp[Math.min(H - 1, Math.max(0, y + i)) * W + x]; out[y * W + x] = a / ks; }
  return out;
}
function sample(img, W, H, x, y) {
  x = Math.max(0, Math.min(W - 1.001, x)); y = Math.max(0, Math.min(H - 1.001, y));
  const x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0, i = y0 * W + x0;
  return (img[i] * (1 - fx) + img[i + 1] * fx) * (1 - fy) + (img[i + W] * (1 - fx) + img[i + W + 1] * fx) * fy;
}
function down(img, W, H, f) { const w = W / f, h = H / f, o = new Float32Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let a = 0; for (let v = 0; v < f; v++) for (let u = 0; u < f; u++) a += img[(y * f + v) * W + x * f + u]; o[y * w + x] = a / (f * f) / f; } return o; }
function demons(A, B) {
  // A, B: clamped SDFs (px) at full size; returns u at half size (in half-size px)
  let ux = null, uy = null, W0 = 0, H0 = 0;
  for (const [f, iters, sigma] of [[16, 200, 1.5], [8, 150, 2.0], [4, 80, 2.0], [2, 50, 2.0]]) {
    const W = CW / f, H = CH / f, a = down(A, CW, CH, f), b = down(B, CW, CH, f);
    if (!ux) { ux = new Float32Array(W * H); uy = new Float32Array(W * H); }
    else { const nx = new Float32Array(W * H), ny = new Float32Array(W * H);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { nx[y * W + x] = 2 * sample(ux, W0, H0, x / 2, y / 2); ny[y * W + x] = 2 * sample(uy, W0, H0, x / 2, y / 2); }
      ux = nx; uy = ny; }
    for (let it = 0; it < iters; it++) {
      const dx = new Float32Array(W * H), dy = new Float32Array(W * H);
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        const i = y * W + x, px = x + ux[i], py = y + uy[i];
        const m = sample(b, W, H, px, py), d = m - a[i];
        const gx = ((sample(b, W, H, px + 1, py) - sample(b, W, H, px - 1, py)) + (a[i + 1] - a[i - 1])) / 4;
        const gy = ((sample(b, W, H, px, py + 1) - sample(b, W, H, px, py - 1)) + (a[i + W] - a[i - W])) / 4;
        const den = gx * gx + gy * gy + d * d;
        if (den > 1e-6) { dx[i] = -d * gx / den; dy[i] = -d * gy / den; }
      }
      for (let i = 0; i < W * H; i++) { ux[i] += dx[i]; uy[i] += dy[i]; }
      ux = blur1(ux, W, H, sigma); uy = blur1(uy, W, H, sigma);
    }
    W0 = W; H0 = H;
  }
  return { ux, uy, W: W0, H: H0, f: 2 };
}
const clampSdf = c => { const s = sdf(c); for (let i = 0; i < CN; i++) s[i] = Math.max(-24, Math.min(24, s[i])); return s; };
// a at weight 0, b at weight 1; points of a travel along u, both shapes are resampled
// onto the in-between positions and their distance fields blended.
function morph(a, b, w) {
  if (w <= 0) return a; if (w >= 1) return b;
  const A = clampSdf(a), B = clampSdf(b), field = demons(A, B);
  const out = new Float32Array(CN), f = field.f;
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    // find the a-point that lands here: x = p + w u(p), two fixed-point steps
    let px = x, py = y;
    for (let k = 0; k < 3; k++) { const ux = sample(field.ux, field.W, field.H, px / f, py / f) * f, uy = sample(field.uy, field.W, field.H, px / f, py / f) * f; px = x - w * ux; py = y - w * uy; }
    const ux = sample(field.ux, field.W, field.H, px / f, py / f) * f, uy = sample(field.uy, field.W, field.H, px / f, py / f) * f;
    const sa = sample(A, CW, CH, px, py), sb = sample(B, CW, CH, px + ux, py + uy);
    out[y * CW + x] = Math.max(0, Math.min(1, (1 - w) * sa + w * sb + 0.5));
  }
  return out;
}

// Morph frame a towards b by weight w (0 = a, 1 = b): bodies blend as distance fields,
// tails move along their centrelines so they sweep instead of fading.
function morphTail(a, b, w) {
  const ta = splitTail(a), tb = splitTail(b);
  const blend = (p, q) => { const sp = sdf(p), sq = sdf(q), s = new Float32Array(CN); for (let i = 0; i < CN; i++) s[i] = (1 - w) * sp[i] + w * sq[i]; return fromSdf(s); };
  if (!ta || !tb) return blend(a, b);
  const body = blend(ta.body, tb.body);
  const line = ta.line.map((p, m) => { const q = tb.line[m]; return { x: p.x + (q.x - p.x) * w, y: p.y + (q.y - p.y) * w, r: p.r + (q.r - p.r) * w }; });
  const tube = drawTube(line);
  for (let i = 0; i < CN; i++) body[i] = Math.max(body[i], tube[i]);
  return body;
}

// Blend the first K frames from `from` (a coverage frame) into the clip, frame 0 = `from` exactly.
function morphIn(frames, from, K) {
  for (let k = 0; k < Math.min(K, frames.length); k++) {
    const w = 1 - ease(k / K);                 // weight of `from`
    const { dx, dy } = bestShift(frames[k], from);
    const f = shifted(from, Math.round(dx * (1 - w)), Math.round(dy * (1 - w))).map(v => Math.max(0, v));
    frames[k] = morph(frames[k], f, w);
  }
}
// Blend the last K frames into `to`, last frame = `to` exactly.
function morphOut(frames, to, K) {
  const N = frames.length;
  for (let k = 0; k < Math.min(K, N); k++) {
    const j = N - 1 - k, w = 1 - ease(k / K);    // weight of `to`
    const { dx, dy } = bestShift(frames[j], to);
    const t = shifted(to, Math.round(dx * (1 - w)), Math.round(dy * (1 - w))).map(v => Math.max(0, v));
    frames[j] = morph(frames[j], t, w);
  }
}

// Motion-interpolate a sequence (24fps) by `factor` with ffmpeg; returns frames from the first to the last original.
function interpolate(frames, factor, tmp) {
  if (factor === 1) return frames;
  const m = frames.length;
  const toBytes = c => { const b = Buffer.alloc(CN); for (let i = 0; i < CN; i++) b[i] = Math.round(255 * (1 - c[i])); return b; };
  fs.writeFileSync(`${tmp}.in.gray`, Buffer.concat([frames[0], ...frames, frames[m - 1]].map(toBytes)));
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'gray', '-s', `${CW}x${CH}`, '-r', '24', '-i', `${tmp}.in.gray`,
    '-vf', `format=yuv444p,minterpolate=fps=${24 * factor}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1:scd=none`,
    '-pix_fmt', 'gray', '-f', 'rawvideo', `${tmp}.out.gray`]);
  const out = fs.readFileSync(`${tmp}.out.gray`);
  const res = [];
  for (let k = factor; k <= factor * m; k++) {     // original frame i sits at factor*(i+1)
    const c = new Float32Array(CN); for (let i = 0; i < CN; i++) c[i] = 1 - out[k * CN + i] / 255; res.push(c);
  }
  return res;
}

function save(frames, file) {
  const b = Buffer.alloc(frames.length * CN);
  frames.forEach((c, f) => { for (let i = 0; i < CN; i++) b[f * CN + i] = Math.round(255 * (1 - c[i])); });
  fs.writeFileSync(file, b);
}
function load(file) {
  const b = fs.readFileSync(file), N = b.length / CN, res = [];
  for (let f = 0; f < N; f++) { const c = new Float32Array(CN); for (let i = 0; i < CN; i++) c[i] = 1 - b[f * CN + i] / 255; res.push(c); }
  return res;
}
function torsoX(c) { // coverage-weighted x of the band 35-55% down the silhouette
  let t = CH, b = 0; for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) if (c[y * CW + x] >= 0.5) { if (y < t) t = y; if (y > b) b = y; }
  let sx = 0, w = 0; for (let y = Math.round(t + (b - t) * 0.35); y <= Math.round(t + (b - t) * 0.55); y++) for (let x = 0; x < CW; x++) { sx += c[y * CW + x] * x; w += c[y * CW + x]; }
  return sx / w;
}

module.exports = { CW, CH, CN, GROUND, ANCHOR, SRC_W, SRC_H, SRC_N, WALK_SCALE, place, sdf, fromSdf, bestShift, shifted, morph, splitTail, drawTube, morphIn, morphOut, interpolate, save, load, torsoX, ease };
