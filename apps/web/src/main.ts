import "./style.css";

import {
  Box3,
  Color,
  DirectionalLight,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  Vector3,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  KITS,
  KIT_CASE_HARDENED,
  kitLabel,
  kitSeedOptions,
  resolveKit,
  type ViewerKit,
} from "./kits/catalog";
import { attachPatternMap, type PatternHook } from "./patternMaterial";
import { clampFloat } from "./patina/patinaWearMix";
import { clampSeed, seedToPatternUv, type Affine2D } from "./seed/seedToPatternUv";

/** 3/4 view that reads as a rifle (model is ~1m along +Z). */
const FIXED_CAMERA = new Vector3(0.95, 0.42, 1.05);
const FIXED_TARGET = new Vector3(-0.01, -0.025, 0.18);

const MASKS_URL = "/assets/composite/weapon_rif_ak47_masks.png";
const CAVITY_URL = "/assets/composite/weapon_rif_ak47_cavity.png";
const MODEL_URL = "/assets/ak47.glb";

const IDENTITY: Affine2D = { a: 1, b: 0, tx: 0, c: 0, d: 1, ty: 0 };

const params = new URLSearchParams(window.location.search);
const fixedCamera = params.has("fixed") || params.has("capture");
const seedFromQuery = params.has("seed") ? clampSeed(Number(params.get("seed"))) : 0;
const floatFromQuery = params.has("float") ? clampFloat(Number(params.get("float"))) : 0;
const kitFromQuery = resolveKit(params.get("kit"));

if (fixedCamera) {
  document.body.classList.add("capture");
}

const statusEl = document.querySelector("#status");
const seedInput = document.querySelector("#seed-input");
const seedValue = document.querySelector("#seed-value");
const floatInput = document.querySelector("#float-input");
const floatValue = document.querySelector("#float-value");
const kitSelect = document.querySelector("#kit-select");

function setStatus(text: string): void {
  if (statusEl instanceof HTMLElement) {
    statusEl.textContent = text;
  }
}

function formatFloat(value: number): string {
  return value.toFixed(2);
}

function releaseDocumentHold(): void {
  void fetch("/m4-release", { method: "POST" }).catch(() => {
    void fetch("/m3-release", { method: "POST" }).catch(() => {
      void fetch("/m2-release", { method: "POST" }).catch(() => {
        void fetch("/m1-release", { method: "POST" }).catch(() => {
          // Dev-only gate; ignore if the middleware is absent (preview/build).
        });
      });
    });
  });
}

function markReady(): void {
  window.__M4_READY__ = true;
  window.__M3_READY__ = true;
  window.__M2_READY__ = true;
  window.__M1_READY__ = true;
  document.documentElement.dataset.ready = "loaded";
  releaseDocumentHold();
}

function markError(message: string): void {
  window.__M4_ERROR__ = message;
  window.__M3_ERROR__ = message;
  window.__M2_ERROR__ = message;
  window.__M1_ERROR__ = message;
  document.documentElement.dataset.ready = "error";
  setStatus(message);
  releaseDocumentHold();
}

const scene = new Scene();
scene.background = new Color(0x14161a);

const camera = new PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.01, 20);
camera.position.copy(FIXED_CAMERA);

const canvas = document.createElement("canvas");
const gl = canvas.getContext("webgl2", { antialias: true, alpha: false });
if (!gl) {
  markError("WebGL2 is required");
  throw new Error("WebGL2 is required");
}

const renderer = new WebGLRenderer({
  canvas,
  context: gl,
  antialias: true,
  alpha: false,
  preserveDrawingBuffer: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = SRGBColorSpace;
document.body.append(canvas);

const hemi = new HemisphereLight(0xd7e6ff, 0x3d2a1c, 1.15);
scene.add(hemi);

const key = new DirectionalLight(0xfff4e5, 2.1);
key.position.set(0.8, 1.2, 0.6);
scene.add(key);

const fill = new DirectionalLight(0xb7c8e0, 0.55);
fill.position.set(-0.7, 0.3, -0.4);
scene.add(fill);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.copy(FIXED_TARGET);
controls.minDistance = 0.15;
controls.maxDistance = 4;
controls.enabled = !fixedCamera;
controls.update();

function onResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener("resize", onResize);

function frame(): void {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

const patternHooks: PatternHook[] = [];
const patternByIndex = new Map<number, Texture>();
let currentSeed = seedFromQuery;
let currentFloat = floatFromQuery;
let currentKit: ViewerKit = kitFromQuery;

function applySeed(seed: number): void {
  const uv = seedToPatternUv(seed, kitSeedOptions(currentKit));
  currentSeed = uv.seed;
  const pattern = currentKit.ignoreWeaponSizeScale ? IDENTITY : uv.pattern.matrix;
  for (const hook of patternHooks) {
    hook.setLayers({
      pattern,
      wear: uv.wear.matrix,
      grunge: uv.grunge.matrix,
    });
  }
  if (seedValue instanceof HTMLElement) {
    seedValue.textContent = String(uv.seed);
  }
  window.__M2_SEED__ = uv.seed;
  window.__M3_SEED__ = uv.seed;
  window.__M4_SEED__ = uv.seed;
  window.__M2_UV__ = {
    translateX: uv.pattern.translateX,
    translateY: uv.pattern.translateY,
    rotationDeg: uv.pattern.rotationDeg,
    scale: uv.pattern.scale,
  };
}

function applyFloat(floatAmt: number): void {
  currentFloat = clampFloat(floatAmt);
  for (const hook of patternHooks) {
    hook.setFloat(currentFloat);
  }
  if (floatValue instanceof HTMLElement) {
    floatValue.textContent = formatFloat(currentFloat);
  }
  if (floatInput instanceof HTMLInputElement) {
    floatInput.value = String(currentFloat);
  }
  window.__M3_FLOAT__ = currentFloat;
  window.__M4_FLOAT__ = currentFloat;
}

function applyKit(kit: ViewerKit): void {
  currentKit = kit;
  const pattern = patternByIndex.get(kit.paintIndex);
  if (!pattern) return;
  for (const hook of patternHooks) {
    hook.setKit(kit, pattern);
  }
  applySeed(currentSeed);
  applyFloat(currentFloat);
  if (kitSelect instanceof HTMLSelectElement) {
    kitSelect.value = String(kit.paintIndex);
  }
  window.__M4_KIT__ = kit.paintIndex;
  window.__M4_STYLE__ = kit.style;
  setStatus(`AK-47 ${kitLabel(kit)} (${kit.internalName}) — seed ${currentSeed}  float ${formatFloat(currentFloat)}`);
}

if (kitSelect instanceof HTMLSelectElement) {
  kitSelect.replaceChildren();
  for (const kit of KITS) {
    const opt = document.createElement("option");
    opt.value = String(kit.paintIndex);
    opt.textContent = kitLabel(kit);
    kitSelect.append(opt);
  }
  kitSelect.value = String(kitFromQuery.paintIndex);
  kitSelect.addEventListener("change", () => {
    applyKit(resolveKit(kitSelect.value));
  });
}

if (seedInput instanceof HTMLInputElement) {
  seedInput.value = String(seedFromQuery);
  seedInput.addEventListener("input", () => {
    const next = clampSeed(Number(seedInput.value));
    seedInput.value = String(next);
    applySeed(next);
  });
}

if (floatInput instanceof HTMLInputElement) {
  floatInput.value = String(floatFromQuery);
  floatInput.addEventListener("input", () => {
    applyFloat(Number(floatInput.value));
  });
}

const textureLoader = new TextureLoader();
const gltfLoader = new GLTFLoader();

Promise.all([
  ...KITS.map((kit) => textureLoader.loadAsync(kit.patternPath).then((tex) => ({ kit, tex }))),
  textureLoader.loadAsync(KIT_CASE_HARDENED.wearPath),
  textureLoader.loadAsync(KIT_CASE_HARDENED.grungePath),
  textureLoader.loadAsync(MASKS_URL),
  textureLoader.loadAsync(CAVITY_URL),
  gltfLoader.loadAsync(MODEL_URL),
])
  .then((loaded) => {
    const kitTexes = loaded.slice(0, KITS.length) as Array<{ kit: ViewerKit; tex: Texture }>;
    const wearTex = loaded[KITS.length] as Texture;
    const grungeTex = loaded[KITS.length + 1] as Texture;
    const masksTex = loaded[KITS.length + 2] as Texture;
    const cavityTex = loaded[KITS.length + 3] as Texture;
    const gltf = loaded[KITS.length + 4] as Awaited<ReturnType<GLTFLoader["loadAsync"]>>;

    for (const { kit, tex } of kitTexes) {
      patternByIndex.set(kit.paintIndex, tex);
    }

    const startPattern = patternByIndex.get(kitFromQuery.paintIndex);
    if (!startPattern) throw new Error(`missing pattern for kit ${kitFromQuery.paintIndex}`);

    const root = gltf.scene;
    const maps = {
      pattern: startPattern,
      wear: wearTex,
      grunge: grungeTex,
      masks: masksTex,
      cavity: cavityTex,
    };

    root.traverse((obj) => {
      const name = obj.name.toLowerCase();
      if (name.includes("body_legacy")) {
        obj.visible = false;
        return;
      }
      if (!(obj instanceof Mesh)) return;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const mat of mats) {
        if (!(mat instanceof MeshStandardMaterial)) continue;
        if (mat.name.toLowerCase().includes("sticker")) continue;
        const hook = attachPatternMap(mat, maps);
        patternHooks.push(hook);
      }
    });

    applyKit(kitFromQuery);
    scene.add(root);

    const box = new Box3().setFromObject(root);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    console.info("[m4] AK-47 multi-kit", {
      size,
      center,
      seed: currentSeed,
      float: currentFloat,
      kit: currentKit.paintIndex,
      style: currentKit.style,
      modelUrl: MODEL_URL,
    });

    if (fixedCamera) {
      camera.position.copy(FIXED_CAMERA);
      controls.target.copy(FIXED_TARGET);
      controls.update();
      renderer.render(scene, camera);
    }
    markReady();
  })
  .catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    markError(`Failed to load model/pattern: ${message}`);
    console.error(err);
  });
