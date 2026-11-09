import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createMacBook, closedAngle } from './macbook.js';

const canvas=document.querySelector('canvas');
const {renderer,scene,hinge,screen,light}=await createMacBook(canvas);
const screenBrightness=screen.material.emissiveIntensity;
const camera = new T.PerspectiveCamera(50, 1, 0.1, 100);
const orbit = new OrbitControls(camera, canvas);
orbit.enablePan = false;
orbit.minDistance = 2.5;
orbit.maxDistance = 14;
light.castShadow=true;
light.shadow.mapSize.set(1024,1024);
Object.assign(light.shadow.camera,{left:-3,right:3,top:3,bottom:-3,near:.1,far:14});
light.shadow.normalBias=.004;
light.shadow.radius=4;
scene.traverse(part=>{if(part.isMesh)part.castShadow=true;});
renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
const floor=new T.Mesh(new T.PlaneGeometry(40,40),new T.ShadowMaterial({opacity:.17,depthWrite:false}));
floor.rotation.x=-Math.PI/2;floor.position.y=-.002;scene.add(floor);
floor.receiveShadow=true;
function draw(){renderer.render(scene,camera);}
orbit.addEventListener('change',draw);
function reset(){
  const distance=4.88;
  orbit.target.set(0,.96,0);
  camera.position.copy(new T.Vector3(.809,.063,.584).normalize().multiplyScalar(distance)).add(orbit.target);
  orbit.maxDistance=Math.max(14,distance*1.5);
  orbit.update();draw();
}
function resize(){
  const {width,height}=canvas.getBoundingClientRect();
  renderer.setSize(width,height,false);
  camera.aspect=width/height;
  // Preserve the clip's horizontal framing, with enough height for the open lid.
  const focalPixels=Math.min(width*867/1280,height*1.48);
  camera.fov=T.MathUtils.radToDeg(2*Math.atan(height/(2*focalPixels)));
  camera.updateProjectionMatrix();
  reset();
}
new ResizeObserver(resize).observe(canvas);
const resetButton=document.querySelector('#reset');
resetButton.disabled=false;resetButton.onclick=reset;
canvas.addEventListener('keydown',e=>{
  const offsets={ArrowLeft:[-0.13,0],ArrowRight:[0.13,0],ArrowUp:[0,-0.1],ArrowDown:[0,0.1]};
  if(!offsets[e.key])return;
  e.preventDefault();
  const spherical=new T.Spherical().setFromVector3(camera.position.clone().sub(orbit.target));
  spherical.theta+=offsets[e.key][0];spherical.phi+=offsets[e.key][1];spherical.makeSafe();
  camera.position.setFromSpherical(spherical).add(orbit.target);orbit.update();
});
const button=document.querySelector('#lid');

let open=true, frame;

button.disabled=false;
document.querySelector('#hint').textContent='Drag to rotate · Scroll to zoom';
button.onclick=()=>{
  open=!open;button.textContent=open?'Close lid':'Open lid';
  const from=hinge.rotation.x,to=open?0:closedAngle,start=performance.now();
  const duration=matchMedia('(prefers-reduced-motion: reduce)').matches?0:850*Math.abs((to-from)/closedAngle);
  cancelAnimationFrame(frame);
  function step(now){
    const t=duration?Math.min(1,(now-start)/duration):1;
    hinge.rotation.x=T.MathUtils.lerp(from,to,t*t*(3-2*t));
    screen.material.emissiveIntensity=screenBrightness*T.MathUtils.smoothstep(closedAngle-hinge.rotation.x,.12,.75);
    draw();if(t<1)frame=requestAnimationFrame(step);
  }
  step(start);
};
