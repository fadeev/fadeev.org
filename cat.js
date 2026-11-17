// The cat that wanders along the bottom of the shelf. Each behaviour is a sprite
// sheet cut from a video and drawn as a silhouette; they all share one 256x160
// cell with the ground on row 150, and each clip begins and ends on a pose the
// clip it hands over to also has, so switching between them never jumps.
//   walk     one stride, looped; the paws stay (nearly) planted
//   start    standing to walking; stop: walking to standing
//   idle     standing, looped, swishing its tail
//   sitdown  standing to sitting; sitloop: sitting, looped; standup: back to standing
//   jump     a hop on the spot, from standing back to standing
//   turn     standing, turning round to face the other way
//   petin    standing to arching into a stroke; petloop: leaning in, looped; petout: relaxing
//   tapjump, tapstand  bridges for petting: from every `every`th standing or sitting
//            exposure, an eased morph of `length` exposures into the pose petting starts
//            from (the jump's first) or into standing up; `skip` lists the
//            few bridges where the morph came apart, which the cat waits past
// `travel` is how far a moving clip carries the cat, in sheet pixels per exposure;
// the walk's is a fraction of its stride instead. `joins` say which walk exposure
// start ends on and stop begins with (and how far that pose sits from the walk
// sheet's drawing of it), and which idle exposure each standing clip leaves from
// or arrives on.
const version = 23;
const cell = { width: 256, height: 160, ground: 150 };
const clips = {
  walk: { src: '/images/cat-walk.png', frames: 91, fps: 96, columns: 16, rows: 6, loop: true, stride: 50.04, travel: [
    0.0000, 0.0106, 0.0194, 0.0284, 0.0377, 0.0478, 0.0584, 0.0690, 0.0784, 0.0889, 0.0988, 0.1073, 0.1144, 0.1241, 0.1339, 0.1440,
    0.1537, 0.1645, 0.1748, 0.1837, 0.1935, 0.2030, 0.2135, 0.2239, 0.2344, 0.2432, 0.2529, 0.2604, 0.2704, 0.2804, 0.2915, 0.3004,
    0.3117, 0.3222, 0.3335, 0.3404, 0.3478, 0.3560, 0.3650, 0.3750, 0.3848, 0.3949, 0.4080, 0.4177, 0.4281, 0.4386, 0.4513, 0.4655,
    0.4807, 0.4920, 0.5043, 0.5149, 0.5270, 0.5369, 0.5498, 0.5637, 0.5778, 0.5892, 0.5996, 0.6124, 0.6239, 0.6332, 0.6467, 0.6607,
    0.6757, 0.6880, 0.6976, 0.7076, 0.7203, 0.7298, 0.7414, 0.7526, 0.7663, 0.7787, 0.7921, 0.8069, 0.8183, 0.8285, 0.8418, 0.8542,
    0.8668, 0.8781, 0.8935, 0.9101, 0.9224, 0.9335, 0.9434, 0.9544, 0.9639, 0.9760, 0.9880,
  ] },
  idle: { src: '/images/cat-idle.png', frames: 120, fps: 24, columns: 16, rows: 8, loop: true },
  start: { src: '/images/cat-start.png', frames: 213, fps: 96, columns: 16, rows: 14, travel: [
    0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
    0.0, 0.0, 0.0, 0.0, 0.0, 0.1, 0.2, 0.3, 0.3, 0.3, 0.3, 0.3, 0.4, 0.6, 0.7, 0.7,
    0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.3, 1.3, 1.3, 1.4, 1.6, 1.7, 1.8, 1.9, 2.0,
    2.0, 2.1, 2.3, 2.6, 2.7, 2.7, 2.7, 2.7, 2.7, 2.8, 3.0, 3.2, 3.3, 3.4, 3.7, 3.9,
    4.0, 4.1, 4.2, 4.3, 4.4, 4.7, 4.9, 5.0, 5.0, 5.0, 5.0, 5.0, 5.0, 5.1, 5.3, 5.6,
    5.7, 5.7, 5.8, 5.9, 6.0, 6.0, 6.1, 6.2, 6.3, 6.3, 6.3, 6.3, 6.3, 6.4, 6.6, 6.7,
    6.7, 6.7, 6.7, 6.7, 6.7, 6.7, 6.7, 6.7, 6.7, 6.7, 6.7, 6.8, 6.9, 7.0, 7.0, 7.0,
    7.0, 7.0, 7.0, 7.0, 7.0, 7.1, 7.2, 7.3, 7.3, 7.3, 7.3, 7.3, 7.3, 7.3, 7.3, 7.3,
    7.3, 7.3, 7.4, 7.6, 7.7, 7.8, 7.9, 8.0, 8.0, 8.0, 8.0, 8.0, 8.0, 8.0, 8.0, 8.0,
    8.0, 8.0, 8.1, 8.2, 8.3, 8.4, 8.7, 8.9, 9.0, 9.0, 9.0, 9.0, 9.0, 9.1, 9.2, 9.3,
    9.3, 9.6, 9.9, 10.2, 10.3, 10.4, 10.7, 10.9, 11.0, 11.1, 11.2, 11.3, 11.4, 11.8, 12.3, 12.9,
    13.3, 13.8, 14.3, 14.9, 15.4, 15.9, 16.3, 16.7, 17.0, 17.2, 17.6, 18.1, 18.6, 19.3, 20.1, 20.8,
    21.4, 22.0, 22.7, 23.3, 23.9, 24.6, 25.3, 26.0, 26.7, 27.2, 27.8, 28.3, 28.8, 29.3, 29.8, 30.4,
    30.9, 31.4, 31.9, 32.4, 33.0,
  ] },
  stop: { src: '/images/cat-stop.png', frames: 139, fps: 96, columns: 16, rows: 9, travel: [
    0.0, 0.6, 1.1, 1.6, 2.1, 2.6, 3.1, 3.6, 4.1, 4.6, 5.2, 5.7, 6.2, 6.8, 7.3, 7.9,
    8.5, 9.1, 9.8, 10.4, 11.1, 11.7, 12.4, 12.8, 13.2, 13.8, 14.4, 15.1, 15.5, 15.9, 16.4, 16.8,
    17.4, 17.8, 18.4, 18.8, 19.3, 19.7, 20.1, 20.6, 20.9, 21.1, 21.3, 21.3, 21.3, 21.4, 21.6, 21.8,
    22.0, 22.3, 22.6, 22.8, 23.0, 23.3, 23.7, 24.1, 24.5, 24.7, 24.9, 25.1, 25.3, 25.3, 25.3, 25.3,
    25.4, 25.8, 26.6, 27.4, 27.9, 28.4, 28.9, 29.5, 30.0, 30.6, 31.1, 31.7, 32.0, 32.4, 32.6, 32.9,
    33.1, 33.4, 33.8, 34.3, 34.6, 34.7, 34.9, 35.3, 35.6, 35.9, 36.3, 36.5, 36.6, 36.7, 36.9, 37.1,
    37.3, 37.4, 37.5, 37.6, 37.6, 37.7, 37.9, 38.1, 38.3, 38.4, 38.6, 38.8, 38.9, 39.0, 39.3, 39.6,
    39.9, 40.1, 40.3, 40.3, 40.3, 40.4, 40.5, 40.5, 40.5, 40.5, 40.5, 40.5, 40.5, 40.5, 40.5, 40.5,
    40.5, 40.5, 40.5, 40.5, 40.5, 40.5, 40.5, 40.5, 40.5, 40.5, 40.5,
  ] },
  sitdown: { src: '/images/cat-sitdown.png', frames: 84, fps: 48, columns: 16, rows: 6 },
  sitloop: { src: '/images/cat-sitloop.png', frames: 102, fps: 24, columns: 16, rows: 7, loop: true },
  standup: { src: '/images/cat-standup.png', frames: 49, fps: 48, columns: 16, rows: 4 },
  jump: { src: '/images/cat-jump.png', frames: 181, fps: 48, columns: 16, rows: 12, travel: [
    0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
    0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
    0.0, 0.0, 0.0, 0.0, 0.1, 0.1, 0.2, 0.3, 0.5, 0.6, 0.6, 0.7, 0.7, 0.7, 0.7, 0.7,
    0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0.8, 0.8, 1.0, 1.2, 1.4, 1.7, 2.0, 2.4,
    2.8, 3.2, 3.7, 4.1, 4.6, 5.0, 5.5, 6.0, 6.6, 7.1, 7.6, 8.2, 8.7, 9.2, 9.8, 10.4,
    11.0, 11.7, 12.3, 13.0, 13.7, 14.3, 15.0, 15.7, 16.3, 17.0, 17.7, 18.3, 18.9, 19.6, 20.3, 21.0,
    21.8, 22.7, 23.8, 24.9, 26.0, 27.1, 28.2, 29.4, 30.5, 31.6, 32.8, 33.9, 35.0, 36.1, 37.3, 38.4,
    39.5, 40.6, 41.7, 42.9, 44.1, 45.4, 46.9, 48.5, 50.0, 51.5, 52.7, 53.7, 54.5, 55.2, 55.8, 56.4,
    57.0, 57.5, 58.0, 58.5, 59.0, 59.4, 59.8, 60.3, 60.7, 61.2, 61.7, 62.2, 62.7, 63.2, 63.6, 64.1,
    64.7, 65.2, 65.7, 66.2, 66.7, 67.1, 67.5, 67.9, 68.3, 68.6, 69.0, 69.4, 69.8, 70.2, 70.5, 70.9,
    71.3, 71.6, 71.9, 72.2, 72.5, 72.8, 73.1, 73.4, 73.8, 74.1, 74.4, 74.7, 75.1, 75.7, 76.4, 77.3,
    78.3, 79.3, 80.4, 81.4, 82.4,
  ] },
  turn: { src: '/images/cat-turn.png', frames: 73, fps: 24, columns: 16, rows: 5 },
  petin: { src: '/images/cat-petin.png', frames: 25, fps: 24, columns: 16, rows: 2 },
  petloop: { src: '/images/cat-petloop.png', frames: 24, fps: 24, columns: 16, rows: 2, loop: true },
  petout: { src: '/images/cat-petout.png', frames: 24, fps: 24, columns: 16, rows: 2 },
  tapjump: { src: '/images/cat-tapjump.png', frames: 200, fps: 24, columns: 16, rows: 13, every: 6, length: 10, skip: [1, 17, 19] },
  tapstand: { src: '/images/cat-tapstand.png', frames: 170, fps: 24, columns: 16, rows: 11, every: 6, length: 10 },
};
const joins = {
  startToWalk: { frame: 8, dx: -14 },
  walkToStop: { frame: 3, dx: -14 },
  // idle exposures each clip leaves from or arrives on
  idleExit: { start: 115, sitdown: 113, jump: 25 },
  idleEntry: { stop: 119, standup: 7, jump: 119 },
  // relaxing after petting lands on this idle exposure
  pet: { entry: 31 },
  // the turn leaves the idle at `exit`, lands on the mirrored idle at `entry`, drawn `dx` sheet px over
  turn: { exit: 30, entry: 32, dx: -10.67 },
};

const scale = 112 / 192;               // sheet pixels to CSS pixels
const cellWidth = cell.width * scale;
const walk = clips.walk;
const strideLength = walk.stride * scale;
const cycleDuration = walk.frames / walk.fps;
const random = (min, max) => min + Math.random() * (max - min);

// Every sheet is decoded up front and frames are drawn onto a canvas, so switching
// behaviour never waits on an image and never shows a neighbouring cell's edge.
async function load(name) {
  const clip = clips[name], image = new Image();
  image.src = `${clip.src}?v=${version}`;
  await image.decode();
  clip.image = 'createImageBitmap' in window ? await createImageBitmap(image) : image;
  clip.ready = true;
}
await load('walk');
for (const name in clips) if (name !== 'walk') load(name).catch(() => {});

const cat = document.createElement('canvas');
cat.className = 'shelf-cat';
cat.setAttribute('aria-hidden', 'true');
cat.style.width = `${cellWidth}px`;
cat.style.height = `${cell.height * scale}px`;
const context = cat.getContext('2d');
// The cat lives on the shelf itself: it walks on the line the products stand on, behind
// them (it's the row's first child, so the products paint over it), scrolls with them,
// and roams the row's whole length, from before the first product to past the last.
const row = document.querySelector('.chapters');
row.prepend(cat);
const shelfWidth = () => row.scrollWidth;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

// On load the cat walks out from behind a product in view, either way, or in from either edge
// of the window, picked at random. Only the phone and the laptop hide it completely (under the
// display it would show), and only across part of their width at the cat's height: the
// laptop's screen is narrower than its base, and the phone's corners round off.
const covers = { iphone: [0.09, 0.91], laptop: [0.08, 0.92] };
function entrance() {
  // where the cat's nose and tail end are in the walk's first exposure, facing left
  const probe = document.createElement('canvas');
  probe.width = cell.width; probe.height = cell.height;
  const pen = probe.getContext('2d');
  pen.drawImage(walk.image, 0, 0, cell.width, cell.height, 0, 0, cell.width, cell.height);
  const alpha = pen.getImageData(0, 0, cell.width, cell.height).data;
  let nose = cell.width, tail = 0;
  for (let i = 3; i < alpha.length; i += 4) if (alpha[i] > 64) { const px = (i >> 2) % cell.width; nose = Math.min(nose, px); tail = Math.max(tail, px); }
  nose *= scale; tail *= scale;
  const rowLeft = row.getBoundingClientRect().left, inset = 4;
  const starts = [
    { direction: -1, x: Math.min(innerWidth, row.getBoundingClientRect().right) - rowLeft },   // past the right edge
    { direction: 1, x: -(cellWidth - nose) - rowLeft },                                          // past the left edge, mirrored
  ];
  for (const [name, [from, to]] of Object.entries(covers)) for (const product of row.querySelectorAll(`.${name}`)) {
    const box = product.getBoundingClientRect(), left = box.left + from * box.width, right = box.left + to * box.width;
    if (right - left < tail - nose + 2 * inset) continue;
    // out of its left side walking left, the nose just inside; out of its right side walking right, mirrored
    if (left > inset && left < innerWidth - inset) starts.push({ direction: -1, x: left + inset - nose - rowLeft });
    if (right > inset && right < innerWidth - inset) starts.push({ direction: 1, x: right - inset - (cellWidth - nose) - rowLeft });
  }
  return starts[Math.floor(Math.random() * starts.length)];
}

let direction = -1;                    // -1 walks left, as drawn; 1 walks right, mirrored
let mode = 'walk';
let x = 0;                             // walking: where a steady walker would be
let cycle = 0;                         // walking: phase of the stride
let base = 0;                          // other clips: cell position where the clip started
let time = 0;                          // other clips: seconds into the clip
let until = random(6, 12);             // seconds left in the current behaviour
let wantStop = false;
let pending = null;                    // standing: the clip to play at its idle exposure
let bridge = null;                     // petted while standing or sitting: the bridge clip to take
let segment = 0;                       // which of the bridge clip's segments is playing
let bridgeNext = null;                 // what the bridge leads into
let wantPet = false;                   // petted mid-move: lean into it once standing
let lastStroke = -1e9;                 // seconds, when the cat was last stroked
const stroked = within => performance.now() / 1000 - lastStroke < within;
let shown = '';
let previous = 0;
let frame = 0;

({ direction, x } = entrance());

const walkLeft = () => x + direction * (walk.travel[Math.floor(cycle * walk.frames)] - cycle) * strideLength;
// A pose drawn `dx` sheet pixels further right in one sheet than in another
// stays put on screen when the cell moves the other way (mirrored when walking right).
const rebase = (left, dx) => left - direction * dx * scale;

function play(name) {
  mode = name;
  time = 0;
}

// how close to an end of the shelf the cat turns back
const endMargin = () => 1.5 * cellWidth;
const facingEnd = left => direction === -1 ? left < endMargin() : left > shelfWidth() - cellWidth - endMargin();

function decide() {
  // after standing a while: turn back at an end of the shelf; otherwise mostly walk on,
  // sometimes turn round, sit or hop
  const roll = Math.random();
  if (facingEnd(base) && clips.turn.ready) return 'turn';
  if (roll < .45 || !clips.start.ready) return 'start';
  if (roll < .6 && clips.turn.ready) return 'turn';
  if (roll < .8 && clips.sitdown.ready && clips.sitloop.ready && clips.standup.ready) return 'sitdown';
  if (clips.jump.ready) return 'jump';
  return 'start';
}

// Tapping or stroking the cat pets it: standing, it eases into arching its back and leans
// in for as long as the taps or strokes keep coming, then relaxes; walking, it stops first;
// sitting, it stands up first; in the middle of a move, it leans in once the move is done.
// (It still jumps, sits and turns of its own accord.)
const petReady = () => clips.petin.ready && clips.petloop.ready && clips.petout.ready && clips.tapjump.ready;
function stroke() {
  lastStroke = performance.now() / 1000;
  if (!petReady()) return;
  if (mode === 'walk') {
    if (clips.stop.ready && clips.idle.ready) { wantStop = true; until = 0; wantPet = true; }
  } else if (mode === 'idle') {
    if (!bridge) { bridge = 'tapjump'; bridgeNext = 'petin'; pending = null; }
  } else if (mode === 'sitloop') {
    if (!bridge && clips.tapstand.ready && clips.standup.ready) { bridge = 'tapstand'; bridgeNext = 'standup'; wantPet = true; }
  } else if (mode !== 'petin' && mode !== 'petloop') wantPet = true;
}
const tap = stroke;

function step(elapsed) {
  if (mode === 'walk') {
    const before = Math.floor(cycle * walk.frames);
    const progress = elapsed / cycleDuration;
    x += direction * progress * strideLength;
    cycle = (cycle + progress) % 1;
    const after = Math.floor(cycle * walk.frames);
    // nearing an end of the shelf, stop there and turn round; past it (only if the
    // sheets for that haven't loaded), turn while out of sight
    if (facingEnd(walkLeft()) && clips.stop.ready && clips.idle.ready && clips.turn.ready) wantStop = true;
    if (x < -cellWidth || x > shelfWidth()) {
      x = Math.max(-cellWidth, Math.min(shelfWidth(), x));
      direction *= -1;
    }
    until -= elapsed;
    if (wantPet) { wantStop = true; until = 0; }   // petted while setting off
    if (until <= 0 && clips.stop.ready && clips.idle.ready && clips.start.ready && x > 0 && x < shelfWidth() - cellWidth) wantStop = true;
    // leave the walk on the exposure the stop clip begins with
    const n = walk.frames, j = joins.walkToStop.frame;
    const ahead = (j - before + n) % n, moved = (after - before + n) % n;
    if (wantStop && moved > 0 && ahead <= moved) {
      cycle = j / walk.frames;
      base = rebase(walkLeft(), -joins.walkToStop.dx);
      wantStop = false;
      play('stop');
    }
    return;
  }
  const clip = clips[mode];
  const before = Math.floor(time * clip.fps);
  time += elapsed;
  const index = Math.floor(time * clip.fps);
  if (clip.every) {
    // a bridge: one segment, then the clip it leads into, from that clip's first exposure
    if (index >= clip.length) play(bridgeNext);
    return;
  }
  if (mode === 'idle' && wantPet && !bridge) {
    wantPet = false;
    if (petReady()) { bridge = 'tapjump'; bridgeNext = 'petin'; pending = null; }
  }
  if (mode === 'petloop') {
    // lean in while the strokes keep coming; a second after the last, relax at the loop's end
    if (stroked(1)) return;
    const n = clip.frames, from = before % n, to = index % n;
    if ((to - from + n) % n > 0 && (n - 1 - from + n) % n <= (to - from + n) % n) play('petout');
    return;
  }
  if (clip.loop && bridge) {
    // tapped: take the bridge from the next exposure that has one (a quarter second at most)
    const n = clip.frames, every = clips[bridge].every;
    for (let t = 1; t <= (index - before + n) % n; t++) {
      const at = (before + t) % n;
      if (at % every || clips[bridge].skip?.includes(at / every)) continue;
      segment = at / every;
      play(bridge);
      bridge = null;
      until = 0;
      return;
    }
    return;
  }
  if (clip.loop) {
    until -= elapsed;
    if (until > 0) return;
    // leave on the exposure the next clip begins with
    const n = clip.frames, from = before % n, to = index % n;
    const crossed = target => { const ahead = (target - from + n) % n, moved = (to - from + n) % n; return moved > 0 && ahead <= moved; };
    if (mode === 'sitloop') { if (crossed(n - 1)) play('standup'); return; }
    pending ||= decide();
    if (!crossed(pending === 'turn' ? joins.turn.exit : joins.idleExit[pending])) return;
    const next = pending;
    pending = null;
    until = next === 'start' ? random(6, 14) : 0;
    return play(next);
  }
  if (index < clip.frames) return;
  // a one-way clip finished: carry its travel over, then move on
  base += direction * (clip.travel ? clip.travel[clip.frames - 1] : 0) * scale;
  if (mode === 'start') {
    cycle = joins.startToWalk.frame / walk.frames;
    const left = rebase(base, joins.startToWalk.dx);
    x = left - direction * (walk.travel[joins.startToWalk.frame] - cycle) * strideLength;
    mode = 'walk';
    return;
  }
  if (mode === 'sitdown') { until = random(4, 9); return play('sitloop'); }
  if (mode === 'petin') return play('petloop');
  if (mode === 'turn') {
    // facing the other way now: the idle, mirrored, picks up where the turn landed
    base = rebase(base, joins.turn.dx);
    direction *= -1;
    until = random(1.5, 3);
    play('idle');
    time = (joins.turn.entry + 1) / clips.idle.fps;
    return;
  }
  // back to standing: pick the idle up on the exposure this clip ended on
  const entry = mode === 'petout' ? joins.pet.entry : joins.idleEntry[mode];
  until = random(2, 5);
  play('idle');
  time = (entry + 1) / clips.idle.fps;
}

function paint() {
  let name = mode, sprite, left;
  if (mode === 'walk') {
    sprite = Math.floor(cycle * walk.frames);
    left = walkLeft();
  } else {
    const clip = clips[mode];
    const index = Math.floor(time * clip.fps);
    sprite = clip.every ? segment * clip.length + Math.min(index, clip.length - 1)
      : clip.loop ? index % clip.frames : Math.min(index, clip.frames - 1);
    left = base + direction * (clip.travel ? clip.travel[sprite] : 0) * scale;
  }
  if (reducedMotion.matches) { name = clips.idle.ready ? 'idle' : 'walk'; sprite = 0; }
  const clip = clips[name];
  const key = `${name} ${sprite} ${cat.width}`;
  if (clip.ready && shown !== key) {
    context.clearRect(0, 0, cat.width, cat.height);
    context.drawImage(clip.image, sprite % clip.columns * cell.width, Math.floor(sprite / clip.columns) * cell.height, cell.width, cell.height, 0, 0, cat.width, cat.height);
    shown = key;
  }
  // The artwork faces left.
  cat.style.transform = `translateX(${left}px) scaleX(${-direction})`;
}

function tick(now) {
  frame = 0;
  // A frame's timestamp is when the frame began, which can be earlier than the
  // performance.now() that sync() took during the same frame, after a resize.
  const elapsed = Math.max(0, Math.min((now - previous) / 1000, .05));
  previous = now;
  if (!reducedMotion.matches) step(elapsed);
  paint();
  if (!reducedMotion.matches) frame = requestAnimationFrame(tick);
}

function sync() {
  cancelAnimationFrame(frame);
  frame = 0;
  // The cat walks just behind the line the products stand on (the top of their captions):
  // a little higher on the screen, as something further back would be, and enough that its
  // paws stay hidden behind a product's base, which ends a few pixels above that line.
  const captions = [...document.querySelectorAll('.chapters figcaption')];
  cat.hidden = document.body.classList.contains('reading') || document.hidden || !captions.length;
  if (captions.length) {
    const products = [...document.querySelectorAll('.chapters .device > div')].map(product => product.getBoundingClientRect().height);
    const behind = Math.max(3, 0.012 * Math.max(0, ...products));
    const ground = Math.min(...captions.map(caption => caption.getBoundingClientRect().top)) - behind;
    cat.style.top = `${ground - cell.ground * scale - row.getBoundingClientRect().top}px`;
  }
  // draw at the screen's pixel density, no finer than the sheet itself
  const density = Math.min(devicePixelRatio || 1, 1 / scale);
  cat.width = Math.round(cellWidth * density);
  cat.height = Math.round(cell.height * scale * density);
  context.imageSmoothingQuality = 'high';
  shown = '';
  x = Math.max(-cellWidth, Math.min(x, shelfWidth()));
  if (!cat.hidden) {
    previous = performance.now();
    frame = requestAnimationFrame(tick);
  }
}

// Taps count only on the cat itself (with a little slack), so the canvas never blocks the
// page: it takes the pointer only while it's over the cat, to show that it can be tapped.
function overCat(event) {
  if (cat.hidden || !cat.width) return false;
  const box = cat.getBoundingClientRect();
  let u = (event.clientX - box.left) / box.width, v = (event.clientY - box.top) / box.height;
  if (u < 0 || u > 1 || v < 0 || v > 1) return false;
  // behind a product it can't be reached
  if (document.elementsFromPoint(event.clientX, event.clientY).some(element => element.closest('.chapters .device'))) return false;
  if (direction === 1) u = 1 - u;      // drawn mirrored
  const r = Math.round(8 * cat.width / box.width), px = Math.round(u * cat.width), py = Math.round(v * cat.height);
  const data = context.getImageData(Math.max(0, px - r), Math.max(0, py - r), 2 * r + 1, 2 * r + 1).data;
  for (let i = 3; i < data.length; i += 4) if (data[i] > 100) return true;
  return false;
}
// A stroke is the pointer travelling 40 CSS pixels across the cat: a mouse just moving over
// it, or a finger or pen dragged along it (though on a touch screen a drag mostly scrolls the
// shelf, so there a tap is the way to pet it). A mouse click is a tap at once; a touch is a
// tap when it lifts without having moved.
let trail = 0, last = null, press = null;
addEventListener('pointermove', event => {
  const over = overCat(event);
  if (event.pointerType === 'mouse') {
    cat.style.pointerEvents = over ? 'auto' : '';
    cat.style.cursor = over ? 'pointer' : '';
  }
  const moving = event.pointerType === 'mouse' ? event.buttons === 0 : !!press;
  if (over && moving && !reducedMotion.matches) {
    if (last && event.timeStamp - last.time < 250) trail += Math.hypot(event.clientX - last.x, event.clientY - last.y);
    last = { x: event.clientX, y: event.clientY, time: event.timeStamp };
    if (trail >= 40) { trail = 0; stroke(); }
  } else { trail = 0; last = null; }
  if (press && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 10) press.moved = true;
}, { passive: true });
addEventListener('pointerdown', event => {
  if (reducedMotion.matches || !overCat(event)) return;
  if (event.pointerType === 'mouse') tap();
  else press = { x: event.clientX, y: event.clientY, time: event.timeStamp, moved: false };
});
addEventListener('pointerup', event => {
  if (press && !press.moved && event.timeStamp - press.time < 500) tap();
  press = null;
});
addEventListener('pointercancel', () => { press = null; });
// a click on the cat is for the cat, not for whatever is under it
addEventListener('click', event => { if (overCat(event)) { event.preventDefault(); event.stopPropagation(); } }, true);

addEventListener('route', sync);
addEventListener('resize', sync);
document.addEventListener('visibilitychange', sync);
reducedMotion.addEventListener('change', sync);
const layout = new ResizeObserver(sync);
layout.observe(document.querySelector('.chapters'));
sync();
