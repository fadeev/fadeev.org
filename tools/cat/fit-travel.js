// Fit a travel table to a walk sheet so the paws on the ground stay planted.
//   node fit-travel.js <sheet.rgba> <width> <frames> <cols> <matchTol> <trim> <smooth> [travelJSON]
// With travelJSON, only evaluates that table (fractions of the stride, plus "stride" in sheet px).
const fs = require('fs');
const [file, widthArg, countArg, colsArg, tolArg, trimArg, smoothArg, given] = process.argv.slice(2);
const SW = +widthArg, N = +countArg, cols = +colsArg, TOL = +tolArg, TRIM = +trimArg, SMOOTH = +smoothArg;
const fw = 192, fh = 128;
const buf = fs.readFileSync(file);
const A = (f, x, y) => buf[(((Math.floor(f / cols) * fh) + y) * SW + (f % cols) * fw + x) * 4 + 3];

// ground row: lowest row with paws in most frames
let ground = 0;
for (let f = 0; f < N; f++) for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) if (A(f, x, y) > 128) ground = Math.max(ground, y);

function contacts(f) {
  const cov = []; for (let x = 0; x < fw; x++) cov.push(Math.max(A(f, x, ground - 1), A(f, x, ground)) / 255);
  const res = []; let s = -1;
  for (let x = 0; x <= fw; x++) {
    const on = x < fw && cov[x] > 0.5;
    if (on && s < 0) s = x;
    if (!on && s >= 0) { res.push({ l: s - (s > 0 ? cov[s - 1] : 0), r: x - 1 + (x < fw ? cov[x] : 0) }); s = -1; }
  }
  return res;
}
const C = Array.from({ length: N }, (_, f) => contacts(f));

// track contacts over three unwrapped cycles, matching by expected drift (paws move back in the cell)
function trackAll(Tk) {
  const tracks = []; let open = [];
  for (let k = 0; k < 3 * N; k++) {
    const next = [];
    for (const q of C[k % N]) {
      const t = open.find(t => !t.used && (process.env.RAW ? Math.abs(t.pts.at(-1).l - q.l) : Math.abs((t.pts.at(-1).l - Tk(t.pts.at(-1).k)) - (q.l - Tk(k)))) <= TOL);
      if (t) { t.used = true; t.pts.push({ k, ...q }); next.push(t); } else { const nt = { pts: [{ k, ...q }] }; tracks.push(nt); next.push(nt); }
    }
    next.forEach(t => t.used = false); open = next;
  }
  const obs = [];
  tracks.forEach((t, ti) => {
    if (t.pts.length < 2 * TRIM + 3) return;
    t.pts.slice(TRIM, t.pts.length - TRIM).forEach(p => { obs.push({ g: ti * 2, k: p.k, v: p.l }); obs.push({ g: ti * 2 + 1, k: p.k, v: p.r }); });
  });
  return obs;
}

function evaluate(T, S, obs) {
  const Tk = k => T[k % N] + Math.floor(k / N) * S;
  const gs = {}, gc = {};
  for (const o of obs) { gs[o.g] = (gs[o.g] || 0) + o.v - Tk(o.k); gc[o.g] = (gc[o.g] || 0) + 1; }
  let e = 0, mx = 0;
  for (const o of obs) { const r = o.v - Tk(o.k) - gs[o.g] / gc[o.g]; e += r * r; mx = Math.max(mx, Math.abs(r)); }
  return { rms: Math.sqrt(e / obs.length), max: mx };
}

if (given) {
  const g = JSON.parse(given);
  const T = g.travel.map(v => v * g.stride), S = g.stride;
  const obs = trackAll(k => T[k % N] + Math.floor(k / N) * S);
  const r = evaluate(T, S, obs);
  console.log(JSON.stringify({ ground, obs: obs.length, pawRms: +r.rms.toFixed(2), pawMax: +r.max.toFixed(2) }));
  if (!process.env.PERFRAME) process.exit(0);
}

// start from a steady walk and refine: track with the current guess, then least-squares
let S = 50, T = Array.from({ length: N }, (_, f) => f / N * S);
let obs;
for (let pass = 0; pass < 4; pass++) {
  obs = trackAll(k => T[k % N] + Math.floor(k / N) * S);
  const G = {};
  for (let it = 0; it < 3000; it++) {
    const Tk = k => T[k % N] + Math.floor(k / N) * S;
    const gs = {}, gc = {};
    for (const o of obs) { gs[o.g] = (gs[o.g] || 0) + o.v - Tk(o.k); gc[o.g] = (gc[o.g] || 0) + 1; }
    for (const g in gs) G[g] = gs[g] / gc[g];
    const ts = new Array(N).fill(0), tc = new Array(N).fill(0);
    for (const o of obs) { const f = o.k % N, cy = Math.floor(o.k / N); ts[f] += o.v - G[o.g] - cy * S; tc[f]++; }
    for (let f = 0; f < N; f++) if (tc[f]) T[f] = ts[f] / tc[f];
    let ss = 0, sc = 0;
    for (const o of obs) { const cy = Math.floor(o.k / N); if (cy) { ss += (o.v - G[o.g] - T[o.k % N]) / cy; sc++; } }
    S = ss / sc;
    const t0 = T[0]; T = T.map(v => v - t0);
  }
}
const fitted = evaluate(T, S, obs);
// smooth the steps, keep them from going backwards, rebuild
let steps = T.map((v, f) => (f === N - 1 ? S : T[f + 1]) - v);
const smooth = s => s.map((_, f) => { let a = 0; for (let j = -SMOOTH; j <= SMOOTH; j++) a += s[(f + j + N) % N]; return a / (2 * SMOOTH + 1); });
if (SMOOTH) steps = smooth(steps);
const negative = steps.filter(s => s < 0).length;
steps = steps.map(s => Math.max(0, s));
const T2 = [0]; for (let f = 1; f < N; f++) T2.push(T2[f - 1] + steps[f - 1]);
const S2 = T2[N - 1] + steps[N - 1];
const final = evaluate(T2, S2, obs);
console.log(JSON.stringify({
  ground, obs: obs.length, strideFit: +S.toFixed(2), fitRms: +fitted.rms.toFixed(2), fitMax: +fitted.max.toFixed(2),
  negativeSteps: negative, stride: +S2.toFixed(2), pawRms: +final.rms.toFixed(2), pawMax: +final.max.toFixed(2),
  minStep: +Math.min(...steps).toFixed(3), maxStep: +Math.max(...steps).toFixed(3),
}));
fs.writeFileSync(file.replace(/\.rgba$/, '.travel.json'), JSON.stringify({ stride: +S2.toFixed(2), travel: T2.map(v => +(v / S2).toFixed(4)) }));

// per-frame paw residuals for a given table (env PERFRAME=1 with travelJSON)
if (process.env.PERFRAME && given) {
  const g = JSON.parse(given); const T = g.travel.map(v => v * g.stride), S = g.stride;
  const obs = trackAll(k => T[k % N] + Math.floor(k / N) * S);
  const Tk = k => T[k % N] + Math.floor(k / N) * S; const gs = {}, gc = {};
  for (const o of obs) { gs[o.g] = (gs[o.g] || 0) + o.v - Tk(o.k); gc[o.g] = (gc[o.g] || 0) + 1; }
  const per = new Array(N).fill(0);
  for (const o of obs) { const r = Math.abs(o.v - Tk(o.k) - gs[o.g] / gc[o.g]); per[o.k % N] = Math.max(per[o.k % N], r); }
  console.log('PERFRAME ' + per.map((v, i) => i + ':' + v.toFixed(1)).join(' '));
}
