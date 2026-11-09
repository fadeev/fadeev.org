// Listen passively: browsers that require permission simply supply no samples.
export function articleTilt(host, signal, draw) {
  if (!window.isSecureContext || !window.DeviceOrientationEvent) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let baseline, lastFrame, target = 0, angle = 0, frame = 0;
  const options = {signal};
  function reset() {
    cancelAnimationFrame(frame);
    frame = 0;
    baseline = undefined;
    target = 0;
    if (angle !== 0) { angle = 0; draw(0); }
  }
  function step(now) {
    angle += (target-angle)*(1-Math.exp(-(now-lastFrame)/100));
    lastFrame = now;
    if (Math.abs(angle-target)<.01) angle = target;
    draw(angle*Math.PI/180);
    frame = angle !== target && !signal.aborted ? requestAnimationFrame(step) : 0;
  }
  function sample({beta,gamma}) {
    if (!Number.isFinite(beta) || !Number.isFinite(gamma)) return;
    const rad = Math.PI/180;
    const orientation = (window.screen.orientation?.angle ?? window.orientation ?? 0)*rad;
    const sideways = Math.sin(gamma*rad)*Math.cos(beta*rad)*Math.cos(orientation)
      + Math.sin(beta*rad)*Math.sin(orientation);
    const roll = Math.asin(Math.max(-1,Math.min(1,sideways)))/rad;
    baseline ??= roll;
    const delta = roll-baseline;
    target = Math.sign(delta)*Math.min(2,Math.max(0,Math.abs(delta)-2)*.12);
    if (!frame && angle !== target) {
      lastFrame = performance.now();
      frame = requestAnimationFrame(step);
    }
  }
  function sync() {
    removeEventListener('deviceorientation',sample);
    reset();
    if (!document.hidden && !reduced.matches && host.closest('.case:not([hidden])'))
      addEventListener('deviceorientation',sample,options);
  }
  addEventListener('route',sync,options);
  document.addEventListener('visibilitychange',sync,options);
  reduced.addEventListener('change',sync,options);
  window.screen.orientation?.addEventListener('change',reset,options);
  signal.addEventListener('abort',()=>cancelAnimationFrame(frame),{once:true});
  sync();
}
