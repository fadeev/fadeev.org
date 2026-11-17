// The 128 exposures span one stride of the original walking cycle.
const sourceStride = 96;
const frameCount = 128;
const columns = 16;
const rows = 8;
const cycleDuration = 1.15;
const strideLength = sourceStride * 112 / 288;
// Fraction of stride traveled at each timing landmark in the retimed sheet.
const travel = [0.0, 0.01911, 0.04172, 0.07097, 0.10502, 0.14199, 0.18427, 0.2326, 0.28405, 0.34248, 0.38324, 0.42045, 0.45098, 0.47286, 0.4928, 0.51512, 0.54446, 0.57827, 0.61634, 0.65296, 0.67937, 0.70631, 0.74321, 0.77476, 0.80273, 0.83087, 0.85806, 0.88398, 0.91189, 0.94108, 0.96443, 0.98277, 1];
function distanceAt(phase) {
  const segment = phase * (travel.length - 1);
  const i = Math.min(Math.floor(segment), travel.length - 2);
  return travel[i] + (travel[i + 1] - travel[i]) * (segment - i);
}
const image = new Image();
image.src = '/images/cat-walk.png?v=10';
await image.decode();
const cat = document.createElement('div');
cat.className = 'shelf-cat';
cat.setAttribute('aria-hidden', 'true');
document.body.append(cat);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let x = Math.min(160, innerWidth / 3);
let direction = -1;
let cycle = 0;
let previous = 0;
let frame = 0;

function paint() {
  const sprite = Math.floor(cycle * frameCount);
  cat.style.backgroundPosition = `${sprite % columns * 100 / (columns - 1)}% ${Math.floor(sprite / columns) * 100 / (rows - 1)}%`;
  // The original artwork faces left.
  const plantedX = x + direction * (distanceAt(sprite / frameCount) - cycle) * strideLength;
  cat.style.transform = `translateX(${plantedX}px) scaleX(${-direction})`;
}

function tick(now) {
  frame = 0;
  const elapsed = Math.min((now - previous) / 1000, .05);
  previous = now;
  if (!reducedMotion.matches) {
    const progress = elapsed / cycleDuration;
    x += direction * progress * strideLength;
    cycle = (cycle + progress) % 1;
    const left = -cat.offsetWidth;
    const right = innerWidth;
    if (x < left || x > right) {
      x = Math.max(left, Math.min(right, x));
      direction *= -1;
    }
  }
  paint();
  if (!reducedMotion.matches) frame = requestAnimationFrame(tick);
}

function sync() {
  cancelAnimationFrame(frame);
  frame = 0;
  const captions = [...document.querySelectorAll('.chapters figcaption')];
  const bottom = Math.max(0, ...captions.map(caption => caption.getBoundingClientRect().bottom));
  const room = innerHeight - bottom;
  cat.hidden = document.body.classList.contains('reading') || document.hidden || room < 76;
  cat.style.top = `${bottom + Math.max(0, (room - 76) / 2)}px`;
  x = Math.max(-112, Math.min(x, innerWidth));
  if (!cat.hidden) {
    previous = performance.now();
    frame = requestAnimationFrame(tick);
  }
}

addEventListener('route', sync);
addEventListener('resize', sync);
document.addEventListener('visibilitychange', sync);
reducedMotion.addEventListener('change', sync);
const layout = new ResizeObserver(sync);
layout.observe(document.querySelector('.chapters'));
sync();
