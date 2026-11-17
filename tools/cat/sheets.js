// Smooth, scale to 256x160 cells, pack sheets, fit travel for the clips that move, write cat-clips.json.
//   node sheets.js <workDir> <imagesDir> <walk-travel.json>
const fs = require('fs');
const { execFileSync } = require('child_process');
const [dir, imagesDir, walkTravelFile] = process.argv.slice(2);
const CW = 768, CH = 480, W = 256, H = 160, COLS = 16, GROUND = 150;
const joins = JSON.parse(fs.readFileSync(`${dir}/joins.json`));
const fps = { walk: 96, idle: 24, sitloop: 24, start: 96, stop: 96, sitdown: 48, standup: 48, jump: 48, turn: 24, petin: 24, petloop: 24, petout: 24 };
const out = { cell: { width: W, height: H, ground: GROUND }, clips: {} };

function frames1x(name) {
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'gray', '-s', `${CW}x${CH}`, '-i', `${dir}/${name}.fin.gray`,
    '-vf', "gblur=sigma=1.6,lut=y='if(lt(val\\,128)\\,0\\,255)',scale=256:160:flags=area", '-pix_fmt', 'gray', '-f', 'rawvideo', `${dir}/${name}.1x.gray`]);
  const b = fs.readFileSync(`${dir}/${name}.1x.gray`), N = b.length / (W * H), res = [];
  for (let f = 0; f < N; f++) res.push(b.subarray(f * W * H, (f + 1) * W * H));
  return res;
}
function sheet(name, frames) {
  const rows = Math.ceil(frames.length / COLS), SW = COLS * W, SH = rows * H, rgba = Buffer.alloc(SW * SH * 4);
  frames.forEach((fr, f) => { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const a = Math.max(0, Math.min(255, Math.round((255 - fr[y * W + x] - 4) * 255 / 247)));
    rgba[(((Math.floor(f / COLS) * H) + y) * SW + (f % COLS) * W + x) * 4 + 3] = a; } });
  fs.writeFileSync(`${dir}/${name}.rgba`, rgba);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${SW}x${SH}`, '-i', `${dir}/${name}.rgba`, '-pix_fmt', 'ya8', '-frames:v', '1', `${imagesDir}/cat-${name}.png`]);
  return { columns: COLS, rows, bytes: fs.statSync(`${imagesDir}/cat-${name}.png`).size };
}
// Median paw movement between neighbouring exposures, read at each exposure's own lowest rows,
// on 3x frames (768x480) for sub-pixel steps, returned in sheet pixels; `still` exposures (the
// cat standing during a blend) don't move at all.
function travel3(frames, still) {
  const N = frames.length, W3 = CW, H3 = CH;
  const contacts = frames.map(fr => {
    let g = 0; for (let y = 0; y < H3; y++) for (let x = 0; x < W3; x++) if (fr[y * W3 + x] < 128) g = y;
    const res = []; let s = -1;
    for (let x = 0; x <= W3; x++) { const on = x < W3 && Math.min(fr[(g - 2) * W3 + x], fr[g * W3 + x]) < 128; if (on && s < 0) s = x; if (!on && s >= 0) { res.push([s, x - 1]); s = -1; } }
    return res; });
  const steps = [0];
  for (let f = 1; f < N; f++) {
    const moves = [];
    for (const [l, r] of contacts[f]) { const p = contacts[f - 1].find(([pl, pr]) => Math.abs(pl - l) <= 15 && Math.abs((pr - pl) - (r - l)) <= 8); if (p) moves.push((l - p[0]) / 3, (r - p[1]) / 3); }
    moves.sort((a, b) => a - b);
    steps.push(still(f) ? 0 : moves.length ? Math.max(0, moves[moves.length >> 1]) : null);
  }
  for (let f = 1; f < N; f++) if (steps[f] === null) { let a = f, b = f; while (a > 0 && steps[a] === null) a--; while (b < N && steps[b] === null) b++;
    steps[f] = a > 0 && (b >= N || f - a <= b - f) ? steps[a] : b < N ? steps[b] : 0; }
  const sm = steps.map((_, f) => f && !still(f) ? (steps[Math.max(1, f - 1)] + steps[f] + steps[Math.min(N - 1, f + 1)]) / 3 : 0);
  const res = [0]; for (let f = 1; f < N; f++) res.push(res[f - 1] + sm[f]);
  return res;
}
// The jump's camera followed the cat, so its own frames barely move: on the ground the paws
// stay planted (median paw movement on the fixed ground line), and in the air the cat carries
// forward evenly, enough that its hind paws land `leap` sheet pixels ahead of where they left.
function jumpTravel(frames, leap) {
  const N = frames.length, W3 = CW;
  const contacts = frames.map(fr => { const res = []; let s = -1;
    for (let x = 0; x <= W3; x++) { let on = false; if (x < W3) for (let y = GROUND * 3 - 6; y <= GROUND * 3; y++) if (fr[y * W3 + x] < 128) { on = true; break; }
      if (on && s < 0) s = x; if (!on && s >= 0) { res.push([s, x - 1]); s = -1; } }
    return res; });
  const air = contacts.map(c => !c.length);
  const steps = [0];
  for (let f = 1; f < N; f++) {
    if (air[f]) { steps.push(0); continue; }
    const moves = [];
    for (const [l, r] of contacts[f]) { const p = contacts[f - 1].find(([pl, pr]) => Math.abs(pl - l) <= 15 && Math.abs((pr - pl) - (r - l)) <= 8); if (p) moves.push((l - p[0]) / 3, (r - p[1]) / 3); }
    moves.sort((a, b) => a - b);
    steps.push(moves.length ? Math.max(0, moves[moves.length >> 1]) : 0);   // forward only
  }
  const cum = s => { const t = [0]; for (let f = 1; f < N; f++) t.push(t[f - 1] + s[f]); return t; };
  const first = air.indexOf(true), lastAir = air.lastIndexOf(true), t0 = first - 1;
  let t2 = lastAir + 1; while (t2 < N - 1 && contacts[t2].length < 2) t2++;
  const hind = f => { const c = contacts[f].at(-1); return (c[0] + c[1]) / 2; };   // rightmost paw: a hind paw, facing left
  const T0 = cum(steps), carried = (hind(t0) - hind(t2)) / 3 + T0[t2] - T0[t0];
  const perAir = (leap - carried) / (lastAir - first + 1);
  for (let f = first; f <= lastAir; f++) steps[f] = perAir;
  // speed carries through take-off and landing: smoothed twice over five exposures
  // (the total distance stays the same, it's only spread)
  for (let pass = 0; pass < 2; pass++) {
    const s = steps.slice();
    for (let f = 1; f < N; f++) { let a = 0, c = 0; for (let k = -2; k <= 2; k++) { const g = f + k; if (g >= 1 && g < N) { a += s[g]; c++; } } steps[f] = a / c; }
  }
  return { travel: cum(steps).map(v => +v.toFixed(2)), air: [first, lastAir], carriedOnGround: +carried.toFixed(1), perAirFrame: +perAir.toFixed(2) };
}
const walkTravel = JSON.parse(fs.readFileSync(walkTravelFile));
const walkSpeed = walkTravel.stride / (91 / 96);   // sheet px per second

// clips built by later steps (the tap bridges) are kept as they are
const earlier = fs.existsSync(`${dir}/cat-clips.json`) ? JSON.parse(fs.readFileSync(`${dir}/cat-clips.json`)).clips : {};
for (const [k, v] of Object.entries(earlier)) if (v.every) out.clips[k] = v;
for (const name of ['walk', 'idle', 'start', 'stop', 'sitdown', 'sitloop', 'standup', 'jump', 'turn', 'petin', 'petloop', 'petout']) {
  if (!fs.existsSync(`${dir}/${name}.fin.gray`)) continue;
  const fr = frames1x(name);
  const info = sheet(name, fr);
  const clip = { src: `/images/cat-${name}.png`, frames: fr.length, fps: fps[name], columns: info.columns, rows: info.rows };
  // Measured on the 3x frames for sub-pixel steps. The opening blend of start and the closing
  // blend of stop are the cat standing; next to the walk, the speed eases into the walk's own.
  if (name === 'start' || name === 'stop') {
    const b3 = fs.readFileSync(`${dir}/${name}.fin.gray`), n3 = CW * CH, f3 = [];
    for (let f = 0; f < b3.length / n3; f++) f3.push(b3.subarray(f * n3, (f + 1) * n3));
    const t3 = travel3(f3, name === 'start' ? f => f < 18 : f => f >= f3.length - 20);
    let steps = t3.map((v, f) => f ? v - t3[f - 1] : 0);
    const walkStep = walkSpeed / clip.fps, K = 32;
    if (name === 'start') for (let k = 0; k < K; k++) { const f = steps.length - K + k, w = (k + 1) / K; steps[f] = (1 - w) * steps[f] + w * walkStep; }
    if (name === 'stop') for (let k = 1; k <= K; k++) { const w = 1 - (k - 1) / K; steps[k] = w * walkStep + (1 - w) * steps[k]; }
    const res = [0]; for (let f = 1; f < steps.length; f++) res.push(res[f - 1] + steps[f]);
    clip.travel = res.map(v => +v.toFixed(2));
  }
  if (name === 'jump') {
    const b3 = fs.readFileSync(`${dir}/jump.fin.gray`), n3 = CW * CH, f3 = [];
    for (let f = 0; f < b3.length / n3; f++) f3.push(b3.subarray(f * n3, (f + 1) * n3));
    const j = jumpTravel(f3, 80);
    clip.travel = j.travel;
    console.log('jump air', j.air, 'carried on the ground', j.carriedOnGround, 'per air frame', j.perAirFrame);
  }
  out.clips[name] = clip;
  console.log(name, fr.length, 'frames', info.rows, 'rows', (info.bytes / 1024).toFixed(0) + ' KB', clip.travel ? 'travel ' + clip.travel.at(-1) : '');
}
// joins with the walk: which walk exposure, and how far the pose sits from the walk sheet's drawing (sheet px)
out.joins = {
  startToWalk: { frame: Math.round(joins.startToWalk.j), dx: +(joins.startToWalk.dx / 3).toFixed(2), dy: +(joins.startToWalk.dy / 3).toFixed(2) },
  walkToStop: { frame: Math.round(joins.walkToStop.j), dx: +(joins.walkToStop.dx / 3).toFixed(2), dy: +(joins.walkToStop.dy / 3).toFixed(2) },
  idleExit: joins.idleExit,
  idleEntry: joins.idleEntry,
  pet: joins.pet,
  turn: joins.turn && { exit: joins.turn.exit, entry: joins.turn.entry, dx: +(joins.turn.dx / 3).toFixed(2) },
};
fs.writeFileSync(`${dir}/cat-clips.json`, JSON.stringify(out));
console.log(JSON.stringify(out.joins));
