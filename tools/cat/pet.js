// Petting: the first two seconds of the video, standing then arching into an unseen hand.
//   petin    0-1s, rising into the arch; starts on the pose the tap bridges end on (jump's first)
//   petloop  1-2s, leaning in, looped while the strokes keep coming
//   petout   petin played backwards, relaxing, then settling on a matching idle exposure
// (After 2s the cat looks back over its shoulder, which reads as a blob in silhouette, and
// its raised tail runs out of the frame.)
//   node pet.js <workDir> <workDir>
const fs = require('fs');
const L = require('./lib.js');
const [vdir, dir] = process.argv.slice(2);
const mask = fs.readFileSync(`${vdir}/pet.mask`), info = JSON.parse(fs.readFileSync(`${vdir}/pet.json`));
const scale = L.WALK_SCALE * 1.13 * 1.03, i0 = info[0];
let frames = [];
for (let f = 0; f <= 48; f++) frames.push(L.place(mask, f, scale, i0.torso, i0.b + 0.5, L.ANCHOR, L.GROUND + 0.5));
const idle = L.load(`${dir}/idle.fin.gray`), hub = idle[0], jump0 = L.load(`${dir}/jump.fin.gray`)[0];
const reg = L.bestShift(hub, frames[0], 90, 10);
frames = frames.map(c => L.shifted(c, reg.dx, reg.dy).map(v => Math.max(0, v)));

const petin = frames.slice(0, 25), petloop = frames.slice(24, 49);
L.morphOut(petloop, petloop[0], 8); petloop.pop();        // loops back to its first exposure
const petout = petin.slice(0, -1).reverse();               // relaxing: the rise backwards
L.morphIn(petin, jump0, 8);
// settle on whichever idle exposure looks most like the relaxed end
const small = c => { const W = L.CW / 4, H = L.CH / 4, s = new Float32Array(W * H); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let a = 0; for (let v = 0; v < 4; v++) for (let u = 0; u < 4; u++) a += c[(y * 4 + v) * L.CW + x * 4 + u]; s[y * W + x] = a / 16; } return s; };
const end = small(petout.at(-1)); let best = [1e18, 0];
idle.forEach((c, e) => { const s = small(c); let d = 0; for (let i = 0; i < s.length; i++) d += Math.abs(s[i] - end[i]); if (d < best[0]) best = [d, e]; });
L.morphOut(petout, idle[best[1]], 10);
for (const [k, v] of Object.entries({ petin, petloop, petout })) L.save(v, `${dir}/${k}.fin.gray`);
const joins = JSON.parse(fs.readFileSync(`${dir}/joins.json`));
joins.pet = { entry: best[1] };
fs.writeFileSync(`${dir}/joins.json`, JSON.stringify(joins, null, 1));
console.log(JSON.stringify({ petin: petin.length, petloop: petloop.length, petout: petout.length, idleEntry: best[1], registered: [reg.dx, reg.dy] }));
