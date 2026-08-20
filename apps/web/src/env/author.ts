/**
 * Authored IBL scenes (M9). Original Three primitives → PMREM.
 *
 * Not Skincraft Inferno videos, not Skinshotter probes, not ripped CS2
 * cubemap faces. Studio is three.js RoomEnvironment (same as M6).
 */
import {
  BackSide,
  BoxGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PointLight,
  Scene,
  SphereGeometry,
  type Material,
} from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import type { EnvLookId } from "./catalog";

function tintedEmissive(hex: number, intensity: number): MeshBasicMaterial {
  const material = new MeshBasicMaterial();
  material.color.setHex(hex).multiplyScalar(intensity);
  return material;
}

function addBox(
  scene: Scene,
  geometry: BoxGeometry,
  material: MeshStandardMaterial | MeshBasicMaterial,
  pos: readonly [number, number, number],
  scale: readonly [number, number, number],
  rot: readonly [number, number, number] = [0, 0, 0],
): void {
  const mesh = new Mesh(geometry, material);
  mesh.position.set(pos[0], pos[1], pos[2]);
  mesh.scale.set(scale[0], scale[1], scale[2]);
  mesh.rotation.set(rot[0], rot[1], rot[2]);
  scene.add(mesh);
}

function disposeObject3DScene(scene: Scene): void {
  const resources = new Set<{ dispose: () => void }>();
  scene.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    resources.add(object.geometry);
    const mats: Material[] = Array.isArray(object.material) ? object.material : [object.material];
    for (const mat of mats) resources.add(mat);
  });
  for (const resource of resources) resource.dispose();
}

/** Dusty courtyard — warm sun + pale sky. Our look, not Dust II. */
export function createWarmEnvironment(): Scene {
  const scene = new Scene();
  const box = new BoxGeometry();
  box.deleteAttribute("uv");
  const sphere = new SphereGeometry(1, 24, 16);

  const roomMat = new MeshStandardMaterial({
    side: BackSide,
    color: 0xc4a574,
    roughness: 1,
    metalness: 0,
  });
  addBox(scene, box, roomMat, [0, 8, 0], [36, 22, 36]);

  const ground = new MeshStandardMaterial({ color: 0xb8935a, roughness: 0.95, metalness: 0 });
  addBox(scene, box, ground, [0, -0.4, 0], [34, 0.8, 34]);

  const adobe = new MeshStandardMaterial({ color: 0xd4b48a, roughness: 0.85, metalness: 0 });
  addBox(scene, box, adobe, [-8, 2.2, -6], [1.2, 4.4, 10], [0, 0.2, 0]);
  addBox(scene, box, adobe, [7, 1.8, 4], [8, 3.6, 1.4], [0, -0.35, 0]);
  addBox(scene, box, adobe, [2, 1.2, -8], [4, 2.4, 2], [0, 0.5, 0]);

  const sky = new Mesh(sphere, tintedEmissive(0xd8e6f4, 18));
  sky.scale.set(20, 12, 20);
  sky.position.set(0, 14, 0);
  scene.add(sky);

  const sun = new Mesh(sphere, tintedEmissive(0xffd08a, 90));
  sun.scale.set(1.6, 1.6, 1.6);
  sun.position.set(10, 16, 6);
  scene.add(sun);

  addBox(scene, box, tintedEmissive(0xffe0b0, 28), [0, 18, 0], [8, 0.2, 8]);
  addBox(scene, box, tintedEmissive(0xffc878, 22), [14, 10, 2], [0.15, 3, 4]);
  addBox(scene, box, tintedEmissive(0xfff2d0, 12), [-12, 8, -4], [0.15, 4, 5]);

  const bounce = new PointLight(0xffe2b0, 400, 40, 2);
  bounce.position.set(10, 16, 6);
  scene.add(bounce);

  return scene;
}

/** Overcast — large soft sky, no hard sun. */
export function createCoolEnvironment(): Scene {
  const scene = new Scene();
  const box = new BoxGeometry();
  box.deleteAttribute("uv");
  const sphere = new SphereGeometry(1, 24, 16);

  const roomMat = new MeshStandardMaterial({
    side: BackSide,
    color: 0x8a96a8,
    roughness: 1,
    metalness: 0,
  });
  addBox(scene, box, roomMat, [0, 8, 0], [36, 22, 36]);

  const ground = new MeshStandardMaterial({ color: 0x5a6270, roughness: 0.98, metalness: 0 });
  addBox(scene, box, ground, [0, -0.4, 0], [34, 0.8, 34]);

  const stone = new MeshStandardMaterial({ color: 0x6e7684, roughness: 0.9, metalness: 0 });
  addBox(scene, box, stone, [-6, 2, 5], [2, 4, 6], [0, 0.3, 0]);
  addBox(scene, box, stone, [6, 1.5, -4], [5, 3, 2], [0, -0.2, 0]);

  const sky = new Mesh(sphere, tintedEmissive(0xb8c8dc, 22));
  sky.scale.set(22, 10, 22);
  sky.position.set(0, 16, 0);
  scene.add(sky);

  addBox(scene, box, tintedEmissive(0xc8d4e8, 36), [0, 19, 0], [16, 0.15, 16]);
  addBox(scene, box, tintedEmissive(0xa8b8cc, 14), [-14, 10, 0], [0.2, 8, 10]);
  addBox(scene, box, tintedEmissive(0xa8b8cc, 14), [14, 10, 0], [0.2, 8, 10]);
  addBox(scene, box, tintedEmissive(0xb0c0d4, 10), [0, 8, 14], [10, 6, 0.2]);
  addBox(scene, box, tintedEmissive(0xb0c0d4, 10), [0, 8, -14], [10, 6, 0.2]);

  const fill = new PointLight(0xc8d4e8, 220, 40, 2);
  fill.position.set(0, 16, 0);
  scene.add(fill);

  return scene;
}

/** High-sun key — brighter disc, deeper sky, more contrast. */
export function createSunEnvironment(): Scene {
  const scene = new Scene();
  const box = new BoxGeometry();
  box.deleteAttribute("uv");
  const sphere = new SphereGeometry(1, 24, 16);

  const roomMat = new MeshStandardMaterial({
    side: BackSide,
    color: 0x3a4a68,
    roughness: 1,
    metalness: 0,
  });
  addBox(scene, box, roomMat, [0, 8, 0], [40, 24, 40]);

  const ground = new MeshStandardMaterial({ color: 0x6a5a40, roughness: 0.92, metalness: 0 });
  addBox(scene, box, ground, [0, -0.4, 0], [38, 0.8, 38]);

  const dark = new MeshStandardMaterial({ color: 0x4a4034, roughness: 0.8, metalness: 0 });
  addBox(scene, box, dark, [-9, 1.6, 3], [2, 3.2, 5], [0, 0.4, 0]);
  addBox(scene, box, dark, [5, 1.2, -7], [6, 2.4, 1.6], [0, -0.25, 0]);

  const sky = new Mesh(sphere, tintedEmissive(0x6a88b8, 10));
  sky.scale.set(24, 14, 24);
  sky.position.set(0, 16, 0);
  scene.add(sky);

  const sun = new Mesh(sphere, tintedEmissive(0xfff2cc, 140));
  sun.scale.set(1.1, 1.1, 1.1);
  sun.position.set(4, 20, 8);
  scene.add(sun);

  addBox(scene, box, tintedEmissive(0xffe8b0, 40), [4, 20, 8], [2.2, 0.15, 2.2]);
  addBox(scene, box, tintedEmissive(0xfff6d8, 8), [-12, 6, -6], [0.15, 3, 3]);

  const key = new PointLight(0xfff0d0, 700, 50, 2);
  key.position.set(4, 20, 8);
  scene.add(key);

  return scene;
}

export function createEnvironmentScene(id: EnvLookId): Scene {
  switch (id) {
    case "studio":
      return new RoomEnvironment();
    case "warm":
      return createWarmEnvironment();
    case "cool":
      return createCoolEnvironment();
    case "sun":
      return createSunEnvironment();
  }
}

export function disposeEnvironmentScene(scene: Scene): void {
  const maybe = scene as Scene & { dispose?: () => void };
  if (typeof maybe.dispose === "function") {
    maybe.dispose();
    return;
  }
  disposeObject3DScene(scene);
}
