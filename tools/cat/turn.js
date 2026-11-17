// The turn: standing facing left, the cat turns round to face right. It leaves the idle at
// a matching exposure and ends on the idle's mirror image (the idle drawn facing right),
// shifted to wherever the turned cat stands; that shift is applied to the cell at the switch.
//   node turn.js <workDir with turn.mask/.json> <workDir>
const fs = require('fs');
const L = require('./lib.js');
const [vdir, dir] = process.argv.slice(2);
const mask = fs.readFileSync(`${vdir}/turn.mask`), info = JSON.parse(fs.readFileSync(`${vdir}/turn.json`));
const scale = L.WALK_SCALE * 1.13 * 1.25, i0 = info[0];
let turn = [];
for (let f = 0; f < 85; f++) turn.push(L.place(mask, f, scale, i0.torso, i0.b + 0.5, L.ANCHOR, L.GROUND + 0.5));   // 0 .. 3.5s
const idle = L.load(`${dir}/idle.fin.gray`), hub = idle[0];
const reg = L.bestShift(hub, turn[0], 90, 10);
turn = turn.map(c => L.shifted(c, reg.dx, reg.dy).map(v => Math.max(0, v)));
// the turn stays at the video's 24fps: in-betweens can't follow its fast leg swing

const small = c => { const W = L.CW / 4, H = L.CH / 4, s = new Float32Array(W * H); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let a = 0; for (let v = 0; v < 4; v++) for (let u = 0; u < 4; u++) a += c[(y * 4 + v) * L.CW + x * 4 + u]; s[y * W + x] = a / 16; } return s; };
const mirror = c => { const o = new Float32Array(L.CN); for (let y = 0; y < L.CH; y++) for (let x = 0; x < L.CW; x++) o[y * L.CW + x] = c[y * L.CW + L.CW - 1 - x]; return o; };
const diffShift = (a, b, range) => { const W = L.CW / 4, H = L.CH / 4; let best = [1e18, 0];
  for (let dx = -range; dx <= range; dx++) { let d = 0; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const xb = x - dx; d += Math.abs(a[y * W + x] - (xb >= 0 && xb < W ? b[y * W + xb] : 0)); } if (d < best[0]) best = [d, dx]; }
  return best; };
const idleSmall = idle.map(small), mirrored = idle.map(mirror), mirroredSmall = mirrored.map(small);

// leave the idle: first half second of the turn against every idle exposure, no shift (same place)
let entry = { d: 1e18 };
for (let i = 0; i < 12; i++) { const a = small(turn[i]); idleSmall.forEach((b, e) => { const [d] = diffShift(a, b, 0); if (d < entry.d) entry = { d, i, e }; }); }
// arrive: last second of the turn against the mirrored idle, any horizontal shift
let exit = { d: 1e18 };
for (let i = turn.length - 24; i < turn.length; i++) { const a = small(turn[i]); mirroredSmall.forEach((b, e) => { const [d, dx] = diffShift(a, b, 24); if (d < exit.d) exit = { d, i, e, dx: dx * 4 }; }); }
turn = turn.slice(entry.i, exit.i + 1);
L.morphIn(turn, idle[entry.e], 6);
L.morphOut(turn, L.shifted(mirrored[exit.e], exit.dx, 0).map(v => Math.max(0, v)), 8);
L.save(turn, `${dir}/turn.fin.gray`);
const joins = JSON.parse(fs.readFileSync(`${dir}/joins.json`));
joins.turn = { exit: entry.e, entry: exit.e, dx: exit.dx };
fs.writeFileSync(`${dir}/joins.json`, JSON.stringify(joins, null, 1));
console.log(JSON.stringify({ frames: turn.length, ...joins.turn, cut: [entry.i, exit.i] }));
