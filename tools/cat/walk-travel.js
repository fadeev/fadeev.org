// The walk's travel table: fitted to the paws on the ground (fit-travel.js), then taken
// halfway towards moving the body at an even speed, which reads smoother than planting
// the paws exactly.
//   node walk-travel.js <walk3x.gray 576x384> <workDir> <out walk-travel.json>
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const [file, dir, outFile] = process.argv.slice(2);
const W = 192, H = 128, COLS = 16;
execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'gray', '-s', '576x384', '-i', file,
  '-vf', 'scale=192:128:flags=area', '-pix_fmt', 'gray', '-f', 'rawvideo', `${dir}/walk192.gray`]);
const b = fs.readFileSync(`${dir}/walk192.gray`), N = b.length / (W * H), SW = COLS * W, rows = Math.ceil(N / COLS);
const rgba = Buffer.alloc(SW * rows * H * 4);
for (let f = 0; f < N; f++) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
  rgba[(((Math.floor(f / COLS) * H) + y) * SW + (f % COLS) * W + x) * 4 + 3] = Math.max(0, Math.min(255, Math.round((255 - b[f * W * H + y * W + x] - 4) * 255 / 247)));
fs.writeFileSync(`${dir}/walk192.rgba`, rgba);
execFileSync('node', [path.join(__dirname, 'fit-travel.js'), `${dir}/walk192.rgba`, String(SW), String(N), String(COLS), '3.5', '3', '1'], { env: { ...process.env, RAW: '1' }, stdio: 'inherit' });
const paws = JSON.parse(fs.readFileSync(`${dir}/walk192.travel.json`));
const A = (f, x, y) => rgba[(((Math.floor(f / COLS) * H) + y) * SW + (f % COLS) * W + x) * 4 + 3] / 255;
const body = []; for (let f = 0; f < N; f++) { let bx = 0, bw = 0; for (let y = 40; y <= 70; y++) for (let x = 40; x <= 150; x++) { const a = A(f, x, y); bx += a * x; bw += a; } body.push(bx / bw); }
const S = paws.stride, lam = 0.5;
const T = paws.travel.map((t, f) => (1 - lam) * t + lam * ((body[f] - body[0] + f / N * S) / S)), t0 = T[0];
fs.writeFileSync(outFile, JSON.stringify({ stride: S, travel: T.map(v => +(v - t0).toFixed(4)) }));
console.log(`walk travel: stride ${S}, ${N} exposures`);
