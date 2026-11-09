import {articleTilt} from './article-tilt.js';
import {afterNavigation} from './after-navigation.js';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';

const formats = {
  iphone: {width:428, height:900, screen:'COLOUR_Black_Screen'},
  xdr: {width:1654, height:1359, screen:'YZsKmgdmwlRdfBy'},
};
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const assets = new Map();

export async function mount(host) {
  const kind = host.dataset.hardware;
  const {width,height,screen} = formats[kind];
  const canvas = host.querySelector('canvas');
  const renderer = new T.WebGLRenderer({canvas,alpha:true,antialias:true});
  // Roll off the studio highlights so the curved aluminum foot stays
  // distinguishable from the portfolio's white background.
  if (kind === 'xdr') {
    renderer.toneMapping = T.AgXToneMapping;
    renderer.toneMappingExposure = .9;
  }
  if (!assets.has(kind)) assets.set(kind, loader.loadAsync('/devices/'+kind+'.glb'));
  let source;
  try {
    source = await assets.get(kind);
  } catch (error) {
    renderer.dispose();
    assets.delete(kind);
    throw error;
  }
  const model = source.scene.clone(true);
  const resolution = Math.min(2, Math.max(1, devicePixelRatio*host.getBoundingClientRect().width/width));
  renderer.setSize(Math.round(width*resolution),Math.round(height*resolution),false);
  const scene = new T.Scene();
  const studio = new RoomEnvironment();
  const pmrem = new T.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(studio,.04).texture;
  scene.environmentIntensity = .85;
  studio.dispose();
  pmrem.dispose();
  const key = new T.DirectionalLight(0xffffff,1.3);
  key.position.set(-3,4,5);scene.add(key);
  const pivot = new T.Group();
  scene.add(pivot);
  pivot.add(model);
  const bounds = new T.Box3().setFromObject(model,true);
  const center = bounds.getCenter(new T.Vector3());
  const size = bounds.getSize(new T.Vector3());
  model.position.sub(center);
  model.updateMatrixWorld(true);
  let panel;
  model.traverse(mesh => {
    if (mesh.material?.name !== screen) return;
    panel = new T.Box3().setFromObject(mesh,true);
    mesh.material = new T.MeshBasicMaterial({color:0x060607});
  });
  if (!panel) throw new Error('Missing '+kind+' screen');
  // The XDR front-glass mesh includes its thin black bezel.
  if (kind === 'xdr') {
    const inset = size.x*.016;
    panel.min.x+=inset;panel.max.x-=inset;
    panel.min.y+=inset;panel.max.y-=inset;
  }
  const visibleHeight = Math.max(size.y,size.x*height/width)*1.003;
  const visibleWidth = visibleHeight*width/height;
  const camera = new T.OrthographicCamera(-visibleWidth/2,visibleWidth/2,visibleHeight/2,-visibleHeight/2,.001,10*visibleHeight);
  camera.position.z = 3*visibleHeight;
  camera.updateMatrixWorld();
  const content = host.querySelector('.hardware-content');
  const contentWidth = kind === 'iphone' ? 402 : 1590;
  const contentHeight = kind === 'iphone' ? 874 : 891;
  const corner = new T.Vector3();
  function project(x,y) {
    corner.set(x,y,panel.max.z).applyMatrix4(pivot.matrixWorld).project(camera);
    return {x:(corner.x+1)*width/2,y:(1-corner.y)*height/2};
  }
  function render() {
    renderer.render(scene,camera);
    const a=project(panel.min.x,panel.max.y), b=project(panel.max.x,panel.min.y);
    content.style.transform='matrix('+[(b.x-a.x)/contentWidth,0,0,(b.y-a.y)/contentHeight,a.x,a.y].join(',')+')';
    host.classList.add('hardware-live');
  }
  const events = new AbortController();
  const listeners = {signal: events.signal};
  function fallback(){
    events.abort();
    host.classList.remove('hardware-live');
    content.style.removeProperty('transform');
  }
  function syncView() {
    if (host.closest('.case:not([hidden])')) {
      try { render(); } catch (error) { fallback(); console.warn(error); }
    } else {
      host.classList.remove('hardware-live');
      content.style.removeProperty('transform');
    }
  }
  canvas.addEventListener('webglcontextlost',fallback,listeners);
  addEventListener('route',()=>afterNavigation().then(()=>{ if (!events.signal.aborted) syncView(); }),listeners);
  syncView();
  if (!events.signal.aborted) articleTilt(host,events.signal,yaw=>{
    pivot.rotation.y=yaw;
    syncView();
  });
}
