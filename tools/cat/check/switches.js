// Render simulated frames (from sim.js) into a world strip, in sheet pixels, and measure how much
// changes from one frame to the next, especially where the clip switches.
//   node switches.js <simulate output> <workDir with NAME.1x.gray> <out.gray or -> [fromFrame] [toFrame] [every]   (env SHELF=px)
const fs = require('fs');
const [simFile, dir, outFile, fromArg, toArg] = process.argv.slice(2);
const W = 256, H = 160, scale = 112 / 192, WW = Math.ceil(+(process.env.SHELF || 1280) / scale);
const lines = fs.readFileSync(simFile, 'utf8').trim().split('\n').map(l => { const [n, s, x, d] = l.split(' '); return { n, s: +s, x: +x, d: +d }; });
const sheets = {}; const sheet = n => sheets[n] ||= fs.readFileSync(`${dir}/${n}.1x.gray`);
const from = +fromArg || 0, to = +toArg || lines.length;
const out = outFile === '-' ? null : fs.createWriteStream(outFile);
const cxs = [];
let prev = null; const diffs = [];
const every = +process.argv[7] || 1;
for (let k = from; k < to; k += every) {
  const { n, s, x, d } = lines[k], sh = sheet(n), left = x / scale, fr = new Uint8Array(WW * H).fill(255);
  for (let y = 0; y < H; y++) for (let X = 0; X < WW; X++) {
    let u = X - left; if (u < 0 || u >= W) continue; if (d === -1) u = W - 1 - u;   // mirrored about the cell
    const u0 = Math.floor(u), f = u - u0, a = sh[s * W * H + y * W + u0], b = u0 + 1 < W ? sh[s * W * H + y * W + u0 + 1] : 255;
    fr[y * WW + X] = Math.round(a * (1 - f) + b * f);
  }
  if (prev) { let c = 0; for (let i = 0; i < fr.length; i++) if ((fr[i] < 128) !== (prev[i] < 128)) c++; diffs.push({ k, n, c, sw: lines[k - 1].n !== n }); }
  { let sx = 0, w = 0; for (let y = 40; y < 140; y++) for (let X = 0; X < WW; X++) if (fr[y * WW + X] < 128) { sx += X; w++; } cxs.push(sx / w * scale); }
  prev = fr; if (out) out.write(Buffer.from(fr));
}
if (out) out.end();
// on-screen speed of the cat's mass (CSS px per frame) around each switch
const v = cxs.map((c, i) => i ? c - cxs[i - 1] : 0);
diffs.filter(d => d.sw).forEach(d => { const i = d.k - from; console.log(`${lines[d.k - 1].n}->${d.n}@${d.k} speed:`, v.slice(Math.max(1, i - 5), i + 8).map(x => x.toFixed(2)).join(' ')); });
const typical = diffs.map(d => d.c).sort((a, b) => a - b)[Math.floor(diffs.length * 0.95)];
console.log('changed px per frame: 95th percentile', typical, '| at clip switches:', diffs.filter(d => d.sw).map(d => `${d.n}@${d.k}:${d.c}`).join(' '));
const spikes = diffs.filter(d => d.c > typical * 2).map(d => `${d.n}@${d.k}:${d.c}`); console.log('frames over 2x the 95th percentile:', spikes.length, spikes.slice(0, 20).join(' '));
console.log(`${WW}x${H}`);
