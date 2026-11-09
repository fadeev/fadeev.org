import {articleTilt} from '../devices/article-tilt.js';
import * as T from 'three';
import {createMacBook, closedAngle} from './macbook.js';

export async function mount(laptop) {
  const canvas = laptop.querySelector('canvas');
  const button = laptop.querySelector('.lid-toggle');
  const {renderer, scene, hinge, screen} = await createMacBook(canvas);
  const docs = await new T.TextureLoader().loadAsync('/images/zetachain-docs-universal-app-2025-09.png');
  docs.colorSpace = T.SRGBColorSpace;
  docs.anisotropy = renderer.capabilities.getMaxAnisotropy();
  // Map the page to the physical display, independently of the wallpaper atlas.
  const geometry = screen.geometry;
  geometry.computeBoundingBox();
  const {min, max} = geometry.boundingBox;
  const positions = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < positions.count; i++) {
    uv.setXY(i, (positions.getX(i)-min.x)/(max.x-min.x), (max.z-positions.getZ(i))/(max.z-min.z));
  }
  uv.needsUpdate = true;
  screen.material = new T.MeshBasicMaterial({map: docs, side: T.DoubleSide});
  // Stand the authored 110° lid upright for the straight-on portfolio view.
  const upright = closedAngle - Math.PI/2;
  hinge.rotation.x = upright;
  const camera = new T.PerspectiveCamera(15, 486/294, .1, 40);
  camera.position.set(0, .12, 13.7);
  camera.lookAt(0, .12, 0);
  camera.updateMatrixWorld();
  scene.updateMatrixWorld(true);
  // Fit the open hardware once. The camera stays fixed as the lid moves.
  const frame = new T.Box2();
  scene.traverse(mesh => {
    if (!mesh.isMesh) return;
    const position = mesh.geometry.attributes.position;
    const point = new T.Vector3();
    for (let i = 0; i < position.count; i++) {
      point.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld).project(camera);
      frame.expandByPoint(point);
    }
  });
  // Align the silhouette with the original 486 × 294 shelf footprint.
  const scaleX = 1.99/(frame.max.x-frame.min.x);
  const scaleY = 1.99/(frame.max.y-frame.min.y);
  const projection = camera.projectionMatrix.elements;
  projection[0] *= scaleX; projection[5] *= scaleY;
  projection[8] = scaleX*(frame.max.x+frame.min.x)/2;
  projection[9] = scaleY*frame.min.y+.995;
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();

  let animation = 0;
  let closed = false;
  const events = new AbortController();
  const resize = new ResizeObserver(paint);
  function fallback(error) {
    events.abort();
    resize.disconnect();
    cancelAnimationFrame(animation);
    laptop.classList.remove('model-ready', 'lid-closed');
    button.hidden = true;
    dispatchEvent(new Event('lidchange'));
    console.warn('Using the MacBook still image.', error);
  }
  function paint() {
    try {
      const width = canvas.clientWidth, height = canvas.clientHeight;
      if (!width || !height) return;
      if (canvas.width !== Math.floor(width*renderer.getPixelRatio()) || canvas.height !== Math.floor(height*renderer.getPixelRatio())) {
        renderer.setSize(width, height, false);
      }
      renderer.render(scene, camera);
      // Endpoints on the free edge in the lid's authored coordinate system.
      const edge = x => {
        const p = screen.localToWorld(new T.Vector3(x, -20.98, -22.66)).project(camera);
        return new T.Vector2((p.x+1)*width/2, (1-p.y)*height/2);
      };
      const left = edge(-17.2), right = edge(17.2);
      const delta = right.clone().sub(left);
      button.style.width = delta.length()+'px';
      button.style.left = (left.x+right.x)/2+'px';
      button.style.top = (left.y+right.y)/2+'px';
      button.style.transform = 'translate(-50%, -50%) rotate('+Math.atan2(delta.y,delta.x)+'rad)';
      laptop.classList.add('model-ready');
      button.hidden = false;
      return true;
    } catch (error) { fallback(error); }
  }
  function toggle() {
    closed = !closed;
    button.setAttribute('aria-expanded', String(!closed));
    button.setAttribute('aria-label', (closed?'Open':'Close')+' laptop lid');
    laptop.classList.toggle('lid-closed', closed);
    const from = hinge.rotation.x, to = closed ? closedAngle : upright;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = reduced ? 0 : 650*Math.abs(to-from)/(closedAngle-upright);
    const start = performance.now() + (closed && !reduced ? 200 : 0);
    cancelAnimationFrame(animation);
    function step(now) {
      const t = duration ? T.MathUtils.clamp((now-start)/duration, 0, 1) : 1;
      hinge.rotation.x = T.MathUtils.lerp(from, to, t*t*(3-2*t));
      screen.material.color.setScalar(T.MathUtils.smoothstep(closedAngle-hinge.rotation.x, .12, .75));
      if (!paint()) return;
      if (t<1) animation=requestAnimationFrame(step);
      else dispatchEvent(new Event('lidchange'));
    }
    step(performance.now());
  }
  canvas.addEventListener('webglcontextlost', fallback, {signal:events.signal});
  button.addEventListener('click', toggle, {signal:events.signal});
  resize.observe(canvas);
  paint();
  if (!events.signal.aborted) articleTilt(laptop,events.signal,yaw=>{
    scene.rotation.y=yaw;
    paint();
  });
}
