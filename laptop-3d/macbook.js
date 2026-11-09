import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export const closedAngle = T.MathUtils.degToRad(110);
export async function createMacBook(canvas) {
  const renderer = new T.WebGLRenderer({canvas, antialias:true, alpha:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new T.Scene();
  const room = new RoomEnvironment();
  const pmrem = new T.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(room, 0.04).texture;
  scene.environmentIntensity = .36;
  room.dispose();
  pmrem.dispose();
  const {scene: laptop} = await new GLTFLoader().loadAsync('/laptop-3d/macbook.glb');
  const lid = laptop.getObjectByName('VCQqxpxkUlzqcJI_62');
  const screen = laptop.getObjectByName('Object_123');
  const hinge = new T.Group();
  // The authored lid is open at 110 degrees. Its origin is shared with the
  // chassis, so rotate it around the cylindrical hinge in the model's coordinates.
  hinge.position.set(0, -12.099, .129);
  lid.parent.add(hinge);
  hinge.add(lid);
  lid.position.sub(hinge.position);

  laptop.scale.setScalar(3.2 / 35.485);
  const bounds = new T.Box3().setFromObject(laptop);
  laptop.position.y = -bounds.min.y;
  scene.add(laptop);

  const light=new T.DirectionalLight(0xffffff,.52);light.position.set(-1.3,9,1.5);scene.add(light);
  return {renderer, scene, hinge, screen, light};
}
