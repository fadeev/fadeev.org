// Run cat.js against a fake DOM and a simulated clock; print one line per frame:
// clip src, sprite index (from background-position), left (translateX), scaleX.
//   node simulate.js <cat.js> <seconds> <seed> [tapFrames,…]   (env STROKES=frames,…  SHELF=px)
const fs = require('fs');
const [file, secondsArg, seedArg, tapsArg] = process.argv.slice(2);
const taps = (tapsArg || '').split(',').filter(Boolean).map(Number); const strokes = (process.env.STROKES || '').split(',').filter(Boolean).map(Number); const listeners = {};
let seed = +seedArg || 1; Math.random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const style = {}; let drawn = { name: 'walk', sprite: 0 };
const cat = { style, hidden: false, width: 0, height: 0, setAttribute() {}, get offsetWidth() { return 149; }, getBoundingClientRect: () => ({ left: 0, top: 0, width: 149, height: 93 }),
  getContext: () => ({ getImageData: (x, y, w, h) => ({ data: new Uint8Array(w * h * 4).fill(255) }), clearRect() {}, drawImage(img, sx, sy) { drawn = { name: /cat-(\w+)\.png/.exec(img.src)[1], sprite: (sy / 160) * 16 + sx / 256 }; } }) };
let raf = null, now = 0;
const g = {
  innerWidth: 1280, innerHeight: 800, window: { }, devicePixelRatio: 2, document: { hidden: false, body: { append() {}, classList: { contains: () => false } }, createElement: () => cat, elementsFromPoint: () => [], querySelectorAll: () => [{ getBoundingClientRect: () => ({ bottom: 560 }) }], querySelector: () => ({ append() {}, prepend() {}, querySelectorAll: () => [], scrollWidth: +(process.env.SHELF || 3000), getBoundingClientRect: () => ({ left: 0, top: 0, right: +(process.env.SHELF || 3000) }) }), addEventListener() {} },
  Image: class { decode() { return Promise.resolve(); } }, matchMedia: () => ({ matches: false, addEventListener() {} }),
  requestAnimationFrame: cb => { raf = cb; return 1; }, cancelAnimationFrame() { raf = null; }, addEventListener(type, fn) { (listeners[type] ||= []).push(fn); }, ResizeObserver: class { observe() {} },
  performance: { now: () => now },
};
const src = fs.readFileSync(file, 'utf8');
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const run = new AsyncFunction(...Object.keys(g), src);
(async () => {
  await run(...Object.values(g));
  await new Promise(r => setTimeout(r, 10));
  const out = [];
  for (let k = 0; k < +secondsArg * 60; k++) {
    now += 1000 / 60;
    if (taps.includes(k)) (listeners.pointerdown || []).forEach(fn => fn({ clientX: 70, clientY: 50, pointerType: 'mouse' }));
    // strokes: env STROKES = start frames; each is 1.5s of a mouse sweeping back and forth over the cat
    for (const st of strokes) if (k >= st && k < st + 90) { const ph = (k - st) / 30 * Math.PI; (listeners.pointermove || []).forEach(fn => fn({ clientX: 75 + 45 * Math.sin(ph), clientY: 45, pointerType: 'mouse', buttons: 0, timeStamp: now })); }
    const cb = raf; raf = null; if (cb) cb(now);
    const m = /translateX\(([-\d.e]+)px\) scaleX\(([-\d]+)\)/.exec(style.transform || '');
    out.push(`${drawn.name} ${drawn.sprite} ${(+m[1]).toFixed(2)} ${m[2]}`);
  }
  console.log(out.join('\n'));
})();
