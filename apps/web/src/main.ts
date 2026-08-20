import "./style.css";

import {
  Box3,
  Color,
  DirectionalLight,
  HemisphereLight,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

/** 3/4 view that reads as a rifle (model is ~1m along +Z). */
const FIXED_CAMERA = new Vector3(0.95, 0.42, 1.05);
const FIXED_TARGET = new Vector3(-0.01, -0.025, 0.18);

const params = new URLSearchParams(window.location.search);
const fixedCamera = params.has("fixed") || params.has("capture");

if (fixedCamera) {
  document.body.classList.add("capture");
}

const statusEl = document.querySelector("#status");

function setStatus(text: string): void {
  if (statusEl instanceof HTMLElement) {
    statusEl.textContent = text;
  }
}

function releaseDocumentHold(): void {
  void fetch("/m1-release", { method: "POST" }).catch(() => {
    // Dev-only gate; ignore if the middleware is absent (preview/build).
  });
}

function markReady(): void {
  window.__M1_READY__ = true;
  document.documentElement.dataset.ready = "loaded";
  releaseDocumentHold();
}

function markError(message: string): void {
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

const loader = new GLTFLoader();
const modelUrl = "/assets/ak47.glb";

loader.load(
  modelUrl,
  (gltf) => {
    const root = gltf.scene;

    root.traverse((obj) => {
      const name = obj.name.toLowerCase();
      if (name.includes("body_legacy")) {
        obj.visible = false;
      }
    });

    scene.add(root);

    const box = new Box3().setFromObject(root);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    console.info("[m1] AK-47 bounds", { size, center, modelUrl });

    setStatus("AK-47 — drag to orbit");
    if (fixedCamera) {
      camera.position.copy(FIXED_CAMERA);
      controls.target.copy(FIXED_TARGET);
      controls.update();
      renderer.render(scene, camera);
    }
    markReady();
  },
  undefined,
  (err) => {
    const message = err instanceof Error ? err.message : String(err);
    markError(`Failed to load ${modelUrl}: ${message}`);
    console.error(err);
  },
);
