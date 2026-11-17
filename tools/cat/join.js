// Register the clips on the standing pose, find where start/stop meet the walk,
// interpolate, morph every join, and write finished 3x sequences plus a join report.
//   node join.js <workDir>
const fs = require('fs');
const L = require('./lib.js');
const [dir] = process.argv.slice(2);
const raw = name => L.load(`${dir}/${name}.raw.gray`);
const shiftAll = (frames, dx, dy) => frames.map(c => L.shifted(c, dx, dy).map(v => Math.max(0, v)));
const log = {};

const idle = raw('idle'), hub = idle[0];
const walk = raw('walk');                       // 96fps loop, 91 frames

// 1. register on the standing pose
const reg = (frames, k) => { const s = L.bestShift(hub, frames[k], 90, 10); return { frames: shiftAll(frames, s.dx, s.dy), dx: s.dx, dy: s.dy }; };
let sitdown = raw('sitdown'), sitloop = raw('sitloop'), standup = raw('standup');
{ const s = L.bestShift(hub, sitdown[0], 90, 10); sitdown = shiftAll(sitdown, s.dx, s.dy); sitloop = shiftAll(sitloop, s.dx, s.dy); standup = shiftAll(standup, s.dx, s.dy); log.sitShift = [s.dx, s.dy]; }
const jumpR = reg(raw('jump'), 0); let jump = jumpR.frames; log.jumpShift = [jumpR.dx, jumpR.dy];
const startR = reg(raw('start'), 0); let start = startR.frames;
const stopRaw = raw('stop'); const stopR = reg(stopRaw, stopRaw.length - 1); let stop = stopR.frames;

// 2. where start ends and stop begins on the walk loop: best pose match, any shift
// coarse search on quarter-size copies, then refine the winner at full size
const small = c => { const W = L.CW / 4, H = L.CH / 4, s = new Float32Array(W * H); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let a = 0; for (let v = 0; v < 4; v++) for (let u = 0; u < 4; u++) a += c[(y * 4 + v) * L.CW + x * 4 + u]; s[y * W + x] = a / 16; } return s; };
const walkSmall = walk.map(small);
function coarse(a, b) {
  const W = L.CW / 4, H = L.CH / 4; let best = [1e18, 0, 0];
  for (let dy = -3; dy <= 3; dy++) for (let dx = -24; dx <= 24; dx++) {
    let e = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const xb = x - dx, yb = y - dy; e += Math.abs(a[y * W + x] - (xb >= 0 && yb >= 0 && xb < W && yb < H ? b[yb * W + xb] : 0)); }
    if (e < best[0]) best = [e, dx, dy];
  }
  return best;
}
function bestPair(seq, from, to) {
  let best = { err: 1e18 };
  for (let i = from; i < to; i++) { const a = small(seq[i]); for (let j = 0; j < walk.length; j++) { const [e, dx, dy] = coarse(a, walkSmall[j]); if (e < best.err) best = { err: e, i, j, dx: dx * 4, dy: dy * 4 }; } }
  const r = L.bestShift(seq[best.i], walk[best.j], 100, 12);
  return { ...best, err: r.err, dx: r.dx, dy: r.dy };
}
const sj = bestPair(start, 28, 54);   // 2.7-3.5s into the clip: walking
const ej = bestPair(stop, 0, 24);     // 4.0-4.6s: still walking
log.startToWalk = sj; log.walkToStop = ej;
start = start.slice(0, sj.i + 1);
stop = stop.slice(ej.i);

// 3. interpolate fast clips to 48fps
const tmp = `${dir}/tmp`;
start = L.interpolate(start, 4, tmp);
stop = L.interpolate(stop, 4, tmp);
sitdown = L.interpolate(sitdown, 2, tmp).slice(0, -1);   // its last frame is the sitting loop's first
standup = L.interpolate(standup, 2, tmp);
jump = L.interpolate(jump, 2, tmp);

// 4. joins: exact poses at every boundary, morphed over a fraction of a second
const walkAt = (j, dx, dy) => L.shifted(walk[j], dx, dy).map(v => Math.max(0, v));
L.morphOut(idle, hub, 12); idle.pop();                    // the idle loops back to its first frame
// Clips that start or end standing join the idle at whichever idle exposure already
// looks most like them (the idle sweeps its tail through many positions), so the
// blend at the join only has to cover small differences.
const idleSmall = idle.map(small);
const diff = (a, b) => { let d = 0; for (let i = 0; i < a.length; i++) d += Math.abs(a[i] - b[i]); return d; };
// best (clip exposure, idle exposure) pair among the clip's first or last `window` exposures
function idlePair(seq, from, to) {
  let best = { d: 1e18 };
  for (let i = Math.max(0, from); i < Math.min(seq.length, to); i++) { const a = small(seq[i]); idleSmall.forEach((b, e) => { const d = diff(a, b); if (d < best.d) best = { d, i, e }; }); }
  return best;
}
const typical = idleSmall.slice(1).reduce((s, b, e) => s + diff(idleSmall[e], b), 0) / (idleSmall.length - 1);
const pairs = {
  start: idlePair(start, 0, 48), sitdown: idlePair(sitdown, 0, 12), jumpIn: idlePair(jump, 0, 16),
  stop: idlePair(stop, stop.length - 60, stop.length), standup: idlePair(standup, standup.length - 24, standup.length), jumpOut: idlePair(jump, jump.length - 40, jump.length),
};
log.pairs = Object.fromEntries(Object.entries(pairs).map(([k, p]) => [k, { clip: p.i, idle: p.e, vsIdleStep: +(p.d / typical).toFixed(2) }]));
start = start.slice(pairs.start.i); sitdown = sitdown.slice(pairs.sitdown.i);
stop = stop.slice(0, pairs.stop.i + 1); standup = standup.slice(0, pairs.standup.i + 1);
jump = jump.slice(pairs.jumpIn.i, pairs.jumpOut.i + 1);
log.idleExit = { start: pairs.start.e, sitdown: pairs.sitdown.e, jump: pairs.jumpIn.e };
log.idleEntry = { stop: pairs.stop.e, standup: pairs.standup.e, jump: pairs.jumpOut.e };
L.morphIn(start, idle[log.idleExit.start], 16);
L.morphOut(start, walkAt(sj.j, sj.dx, sj.dy), 28);       // last frame = walk frame j, drawn where start has it
L.morphIn(stop, walkAt(ej.j, ej.dx, ej.dy), 28);
L.morphOut(stop, idle[log.idleEntry.stop], 20);
L.morphIn(sitdown, idle[log.idleExit.sitdown], 10);
L.morphOut(sitloop, sitloop[0], 12); sitloop.pop();       // loops back to its first frame
L.morphIn(standup, sitloop[0], 14);
L.morphOut(standup, idle[log.idleEntry.standup], 10);
L.morphIn(jump, idle[log.idleExit.jump], 8);
L.morphOut(jump, idle[log.idleEntry.jump], 10);

const clips = { idle, start, stop, sitdown, sitloop, standup, jump, walk };
for (const [k, v] of Object.entries(clips)) L.save(v, `${dir}/${k}.fin.gray`);
log.frames = Object.fromEntries(Object.entries(clips).map(([k, v]) => [k, v.length]));
fs.writeFileSync(`${dir}/joins.json`, JSON.stringify(log, null, 1));
console.log(JSON.stringify(log));
