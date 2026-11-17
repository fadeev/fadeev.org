// Place every clip's frames into the shared 3x cell at the walk's scale (24fps, no edits yet).
//   node place.js <workDir with .mask/.json> <walk3x.gray 576x384> <workDir>
const fs = require('fs');
const L = require('./lib.js');
const [dir, walkFile, outDir] = process.argv.slice(2);
const clip = name => ({ mask: fs.readFileSync(`${dir}/${name}.mask`), info: JSON.parse(fs.readFileSync(`${dir}/${name}.json`)) });

// size of each clip's cat relative to the walking clip: the start/stop clip's walking frames were
// matched against the walk, then every other clip's standing pose against its standing pose
const K = { startstop: 1.13, idle: 1.13 * 1.11, sit: 1.13 * 0.99, jump: 1.13 * 1.08 };

// static camera: one placement for the whole range, anchored on the first frame's torso and paws
function staticRange(name, from, to) {
  const c = clip(name), s = L.WALK_SCALE * K[name], i0 = c.info[from];
  const res = [];
  for (let f = from; f < to; f++) res.push(L.place(c.mask, f, s, i0.torso, i0.b + 0.5, L.ANCHOR, L.GROUND + 0.5));
  return res;
}
// tracking camera: hold the torso and the lowest paw still in every frame (travel is fitted later)
function trackedRange(name, from, to) {
  const c = clip(name), s = L.WALK_SCALE * K[name];
  const res = [];
  for (let f = from; f < to; f++) { const i = c.info[f]; res.push(L.place(c.mask, f, s, i.torso, i.b + 0.5, L.ANCHOR, L.GROUND + 0.5)); }
  return res;
}
// the finished walk loop (576x384, ground 363) moved into the cell with its torso near the anchor
function walkFrames() {
  const b = fs.readFileSync(walkFile), n = 576 * 384, N = b.length / n, res = [];
  const tmp = [];
  for (let f = 0; f < N; f++) { const c = new Float32Array(L.CN); for (let y = 0; y < 384; y++) for (let x = 0; x < 576; x++) { const X = x + 96, Y = y + (L.GROUND - 363); if (Y >= 0 && Y < L.CH) c[Y * L.CW + X] = 1 - b[f * n + y * 576 + x] / 255; } tmp.push(c); }
  const mean = tmp.reduce((a, c) => a + L.torsoX(c), 0) / N, dx = Math.round(L.ANCHOR - mean);
  for (const c of tmp) res.push(L.shifted(c.map(v => v), dx, 0).map(v => Math.max(0, v)));
  return { frames: res, dx: dx + 96 };
}

const t0 = Date.now();
const out = {};
out.idle = staticRange('idle', 0, 121);
out.start = trackedRange('startstop', 30, 84);   // 1.25s standing still .. 3.5s walking
out.stop = trackedRange('startstop', 96, 150);    // 4.0s walking .. 6.25s standing
out.sitdown = staticRange('sit', 0, 43);          // 0 .. 1.75s
out.jump = staticRange('jump', 0, 91);            // 0 .. 3.75s
// sitting (1.75 .. 6.0s) and standing up (6.0 .. 7.0s) share sitting down's placement, so they line up
{ const c = clip('sit'), s = L.WALK_SCALE * K.sit, i0 = c.info[0];
  const pl = f => L.place(c.mask, f, s, i0.torso, i0.b + 0.5, L.ANCHOR, L.GROUND + 0.5);
  out.sitloop = []; for (let f = 42; f < 145; f++) out.sitloop.push(pl(f));
  out.standup = []; for (let f = 144; f < 169; f++) out.standup.push(pl(f)); }
const walk = walkFrames(); out.walk = walk.frames;
for (const [k, v] of Object.entries(out)) L.save(v, `${outDir}/${k}.raw.gray`);
console.log(JSON.stringify({ frames: Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.length])), walkOffsetX: walk.dx, seconds: (Date.now() - t0) / 1000 }));
