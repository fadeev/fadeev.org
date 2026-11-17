// Short bridge clips so petting gets a quick reaction. Every `every` exposures of the
// standing loop gets a morph into the jump's first pose, and every `every` exposures of the
// sitting loop gets one into standing up. Each bridge is `len` exposures at 24fps (about 0.4s, eased); the clip
// it hands over to starts on its own first exposure right after.
//   node bridges.js <workDir> <imagesDir>
const fs = require('fs');
const { execFileSync } = require('child_process');
const L = require('./lib.js');
const [dir, imagesDir] = process.argv.slice(2);
const EVERY = 6, LEN = 10;
const idle = L.load(`${dir}/idle.fin.gray`), sitloop = L.load(`${dir}/sitloop.fin.gray`);
const jump0 = L.load(`${dir}/jump.fin.gray`)[0], standup0 = L.load(`${dir}/standup.fin.gray`)[0];

function bridges(loop, target) {
  const out = [];
  for (let e = 0; e < loop.length; e += EVERY)
    for (let k = 1; k <= LEN; k++) out.push(L.morph(loop[e], target, L.ease(k / (LEN + 1))));
  return out;
}
const sets = { tapjump: bridges(idle, jump0), tapstand: bridges(sitloop, standup0) };
const W = 256, H = 160, COLS = 16, report = {};
for (const [name, frames] of Object.entries(sets)) {
  L.save(frames, `${dir}/${name}.fin.gray`);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'gray', '-s', `${L.CW}x${L.CH}`, '-i', `${dir}/${name}.fin.gray`,
    '-vf', "gblur=sigma=1.6,lut=y='if(lt(val\\,128)\\,0\\,255)',scale=256:160:flags=area", '-pix_fmt', 'gray', '-f', 'rawvideo', `${dir}/${name}.1x.gray`]);
  const b = fs.readFileSync(`${dir}/${name}.1x.gray`), N = b.length / (W * H), rows = Math.ceil(N / COLS), SW = COLS * W, SH = rows * H, rgba = Buffer.alloc(SW * SH * 4);
  for (let f = 0; f < N; f++) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
    rgba[(((Math.floor(f / COLS) * H) + y) * SW + (f % COLS) * W + x) * 4 + 3] = Math.max(0, Math.min(255, Math.round((255 - b[f * W * H + y * W + x] - 4) * 255 / 247)));
  fs.writeFileSync(`${dir}/${name}.rgba`, rgba);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${SW}x${SH}`, '-i', `${dir}/${name}.rgba`, '-pix_fmt', 'ya8', '-frames:v', '1', `${imagesDir}/cat-${name}.png`]);
  report[name] = { src: `/images/cat-${name}.png`, frames: N, fps: 24, columns: COLS, rows, every: EVERY, length: LEN, kb: Math.round(fs.statSync(`${imagesDir}/cat-${name}.png`).size / 1024) };
}
const clips = JSON.parse(fs.readFileSync(`${dir}/cat-clips.json`));
for (const [k, v] of Object.entries(report)) { const { kb, ...c } = v; clips.clips[k] = c; }
fs.writeFileSync(`${dir}/cat-clips.json`, JSON.stringify(clips));
console.log(JSON.stringify(report));
