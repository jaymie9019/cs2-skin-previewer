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
  TextureLoader,
  Vector3,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { attachPatternMap, type PatternHook } from "./patternMaterial";
import { clampSeed, seedToPatternUv } from "./seed/seedToPatternUv";

/** 3/4 view that reads as a rifle (model is ~1m along +Z). */
const FIXED_CAMERA = new Vector3(0.95, 0.42, 1.05);
const FIXED_TARGET = new Vector3(-0.01, -0.025, 0.18);

const PATTERN_URL = "/assets/paints/aq_oiled/oiled.png";
const MODEL_URL = "/assets/ak47.glb";

const params = new URLSearchParams(window.location.search);
const fixedCamera = params.has("fixed") || params.has("capture");
const seedFromQuery = params.has("seed") ? clampSeed(Number(params.get("seed"))) : 0;

if (fixedCamera) {
  document.body.classList.add("capture");
}

const statusEl = document.querySelector("#status");
const seedInput = document.querySelector("#seed-input");
const seedValue = document.querySelector("#seed-value");

function setStatus(text: string): void {
  if (statusEl instanceof HTMLElement) {
    statusEl.textContent = text;
  }
}

function releaseDocumentHold(): void {
  void fetch("/m2-release", { method: "POST" }).catch(() => {
    void fetch("/m1-release", { method: "POST" }).catch(() => {
      // Dev-only gate; ignore if the middleware is absent (preview/build).
    });
  });
}

function markReady(): void {
  window.__M2_READY__ = true;
  window.__M1_READY__ = true;
  document.documentElement.dataset.ready = "loaded";
  releaseDocumentHold();
}

function markError(message: string): void {
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

function applySeed(seed: number): void {
  const uv = seedToPatternUv(seed);
  for (const hook of patternHooks) {
    hook.setAffine(uv.pattern.matrix);
  }
  if (seedValue instanceof HTMLElement) {
    seedValue.textContent = String(uv.seed);
  }
  window.__M2_SEED__ = uv.seed;
  window.__M2_UV__ = {
    translateX: uv.pattern.translateX,
    translateY: uv.pattern.translateY,
    rotationDeg: uv.pattern.rotationDeg,
    scale: uv.pattern.scale,
  };
}

if (seedInput instanceof HTMLInputElement) {
  seedInput.value = String(seedFromQuery);
  seedInput.addEventListener("input", () => {
    const next = clampSeed(Number(seedInput.value));
    seedInput.value = String(next);
    applySeed(next);
  });
}

const textureLoader = new TextureLoader();
const gltfLoader = new GLTFLoader();

Promise.all([
  textureLoader.loadAsync(PATTERN_URL),
  gltfLoader.loadAsync(MODEL_URL),
])
  .then(([patternTex, gltf]) => {
    const root = gltf.scene;

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
        const hook = attachPatternMap(mat, patternTex);
        patternHooks.push(hook);
      }
    });

    applySeed(seedFromQuery);
    scene.add(root);

    const box = new Box3().setFromObject(root);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    console.info("[m2] AK-47 + aq_oiled pattern", {
      size,
      center,
      seed: seedFromQuery,
      patternUrl: PATTERN_URL,
      modelUrl: MODEL_URL,
    });

    setStatus(`AK-47 Case Hardened (aq_oiled) — seed ${seedFromQuery}`);
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
