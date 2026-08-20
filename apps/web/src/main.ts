import "./style.css";

import {
  Box3,
  Color,
  DirectionalLight,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  Vector3,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
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
import {
  EXTRACTED_STICKERS,
  extractedSticker,
  lookupStickerRow,
  stickerLabel,
  type StickerLookupRow,
} from "./stickers/catalog";
import {
  attachStickers,
  bindExtracted,
  makeDummyTextures,
  type StickerHook,
  type StickerSharedMaps,
} from "./stickers/stickerMaterial";
import {
  MAX_STICKER_LAYERS,
  clampOffset,
  clampRotation,
  clampWear,
  emptySlots,
  isEmptySlot,
  type StickerSlot,
} from "./stickers/slots";
import { applyShareUrl, parseShareQuery, type ViewerWeapon } from "./share/query";

/** 3/4 view that reads as a rifle (model is ~1m along +Z). */
const FIXED_CAMERA = new Vector3(0.95, 0.42, 1.05);
const FIXED_TARGET = new Vector3(-0.01, -0.025, 0.18);

const MASKS_URL = "/assets/composite/weapon_rif_ak47_masks.png";
const CAVITY_URL = "/assets/composite/weapon_rif_ak47_cavity.png";
const MODEL_URL = "/assets/ak47.glb";
const SCRATCHES_URL = "/assets/stickers/shared/scratches.png";
const BACKING_URL = "/assets/stickers/shared/backing.png";

const IDENTITY: Affine2D = { a: 1, b: 0, tx: 0, c: 0, d: 1, ty: 0 };

const params = new URLSearchParams(window.location.search);
const share = parseShareQuery(params);
const fixedCamera = share.capture || share.fixed;
const seedFromQuery = share.seed;
const floatFromQuery = share.float;
const kitFromQuery = share.kit;
const stickerQuery = { slots: share.slots, rejected: share.rejected };

if (fixedCamera) {
  document.body.classList.add("capture");
}

const statusEl = document.querySelector("#status");
const seedInput = document.querySelector("#seed-input");
const seedValue = document.querySelector("#seed-value");
const floatInput = document.querySelector("#float-input");
const floatValue = document.querySelector("#float-value");
const kitSelect = document.querySelector("#kit-select");
const stickerPanel = document.querySelector("#sticker-panel");

function setStatus(text: string): void {
  if (statusEl instanceof HTMLElement) {
    statusEl.textContent = text;
  }
}

function formatFloat(value: number): string {
  return value.toFixed(2);
}

function releaseDocumentHold(): void {
  void fetch("/m6-release", { method: "POST" }).catch(() => {
    void fetch("/m5-release", { method: "POST" }).catch(() => {
      void fetch("/m4-release", { method: "POST" }).catch(() => {
        void fetch("/m3-release", { method: "POST" }).catch(() => {
          void fetch("/m2-release", { method: "POST" }).catch(() => {
            void fetch("/m1-release", { method: "POST" }).catch(() => {
              // Dev-only gate; ignore if the middleware is absent (preview/build).
            });
          });
        });
      });
    });
  });
}

function markReady(): void {
  window.__M6_READY__ = true;
  window.__M5_READY__ = true;
  window.__M4_READY__ = true;
  window.__M3_READY__ = true;
  window.__M2_READY__ = true;
  window.__M1_READY__ = true;
  document.documentElement.dataset.ready = "loaded";
  releaseDocumentHold();
}

function markError(message: string): void {
  window.__M6_ERROR__ = message;
  window.__M5_ERROR__ = message;
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

// Conservative IBL: RoomEnvironment -> PMREM so metal actually reflects
// something. Keep the dark studio; do not chase Dust II / Skincraft sun.
const pmrem = new PMREMGenerator(renderer);
const room = new RoomEnvironment();
const envRt = pmrem.fromScene(room, 0.04);
scene.environment = envRt.texture;
room.dispose();
pmrem.dispose();

const hemi = new HemisphereLight(0xd7e6ff, 0x3d2a1c, 1.22);
scene.add(hemi);

const key = new DirectionalLight(0xfff4e5, 2.55);
key.position.set(0.8, 1.2, 0.6);
scene.add(key);

const fill = new DirectionalLight(0xb7c8e0, 0.62);
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
const stickerHooks: StickerHook[] = [];
const patternByIndex = new Map<number, Texture>();
let currentWeapon: ViewerWeapon = share.weapon;
let currentSeed = seedFromQuery;
let currentFloat = floatFromQuery;
let currentKit: ViewerKit = kitFromQuery;
let currentSlots: StickerSlot[] = stickerQuery.slots.map((s) => ({ ...s }));
let lookupCatalog: StickerLookupRow[] = [];

function syncShareUrl(): void {
  const qs = applyShareUrl({
    weapon: currentWeapon,
    kit: currentKit,
    seed: currentSeed,
    float: currentFloat,
    slots: currentSlots,
    capture: share.capture,
    fixed: share.fixed,
  });
  window.__M6_WEAPON__ = currentWeapon;
  window.__M6_KIT__ = currentKit.paintIndex;
  window.__M6_SEED__ = currentSeed;
  window.__M6_FLOAT__ = currentFloat;
  window.__M6_SLOTS__ = currentSlots.map((s) => ({ ...s }));
  window.__M6_REJECTED__ = share.rejected;
  window.__M6_URL__ = qs;
}

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
  syncShareUrl();
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
  syncShareUrl();
}

function stickerStatus(): string {
  const filled = currentSlots.filter((s) => !isEmptySlot(s));
  if (filled.length === 0) return "no stickers";
  return currentSlots
    .map((s, slot) => {
      if (isEmptySlot(s)) return null;
      const rec = extractedSticker(s.id);
      const name = rec ? rec.nameEn : `id ${s.id}`;
      return `s${slot}=${name}`;
    })
    .filter((x): x is string => x != null)
    .join("  ");
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
  setStatus(
    `AK-47 ${kitLabel(kit)} (${kit.internalName}) — seed ${currentSeed}  float ${formatFloat(currentFloat)}  ${stickerStatus()}`,
  );
  syncShareUrl();
}

function applySlots(slots: StickerSlot[]): void {
  currentSlots = slots.slice(0, MAX_STICKER_LAYERS).map((s) => ({ ...s }));
  while (currentSlots.length < MAX_STICKER_LAYERS) currentSlots.push(...emptySlots());
  currentSlots = currentSlots.slice(0, MAX_STICKER_LAYERS);
  for (const hook of stickerHooks) {
    hook.setSlots(currentSlots);
  }
  window.__M5_SLOTS__ = currentSlots.map((s) => ({ ...s }));
  window.__M5_REJECTED__ = stickerQuery.rejected;
  applyKit(currentKit);
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

function lookupName(id: number): string {
  if (id <= 0) return "empty";
  const extracted = extractedSticker(id);
  if (extracted) return stickerLabel(extracted);
  const row = lookupStickerRow(lookupCatalog, id);
  if (row) {
    const label = stickerLabel(row);
    return extractedSticker(id) ? label : `${label} (not extracted)`;
  }
  return `id ${id}`;
}

function buildStickerUi(): void {
  if (!(stickerPanel instanceof HTMLElement)) return;
  stickerPanel.replaceChildren();
  const heading = document.createElement("div");
  heading.className = "sticker-heading";
  heading.textContent = "Stickers (4 slots)";
  stickerPanel.append(heading);

  for (let i = 0; i < MAX_STICKER_LAYERS; i++) {
    const slot = currentSlots[i];
    const row = document.createElement("fieldset");
    row.className = "sticker-slot";

    const legend = document.createElement("legend");
    legend.textContent = `s${i}`;
    row.append(legend);

    const pick = document.createElement("label");
    const pickSpan = document.createElement("span");
    pickSpan.textContent = "Kit";
    const select = document.createElement("select");
    const none = document.createElement("option");
    none.value = "0";
    none.textContent = "(empty)";
    select.append(none);
    for (const s of EXTRACTED_STICKERS) {
      const opt = document.createElement("option");
      opt.value = String(s.id);
      opt.textContent = stickerLabel(s);
      select.append(opt);
    }
    const other = document.createElement("option");
    other.value = "custom";
    other.textContent = "id lookup…";
    select.append(other);
    const extracted = extractedSticker(slot.id);
    select.value = slot.id === 0 ? "0" : extracted ? String(slot.id) : "custom";
    pick.append(pickSpan, select);

    const idLabel = document.createElement("label");
    const idSpan = document.createElement("span");
    idSpan.textContent = "id";
    const idInput = document.createElement("input");
    idInput.type = "number";
    idInput.min = "0";
    idInput.step = "1";
    idInput.value = String(slot.id);
    const idName = document.createElement("span");
    idName.className = "sticker-name";
    idName.textContent = lookupName(slot.id);
    idLabel.append(idSpan, idInput, idName);

    const xLabel = document.createElement("label");
    xLabel.innerHTML = `<span>x</span>`;
    const xInput = document.createElement("input");
    xInput.type = "number";
    xInput.min = "-0.5";
    xInput.max = "0.5";
    xInput.step = "0.005";
    xInput.value = String(slot.offsetX);
    xLabel.append(xInput);

    const yLabel = document.createElement("label");
    yLabel.innerHTML = `<span>y</span>`;
    const yInput = document.createElement("input");
    yInput.type = "number";
    yInput.min = "-0.5";
    yInput.max = "0.5";
    yInput.step = "0.005";
    yInput.value = String(slot.offsetY);
    yLabel.append(yInput);

    const rotLabel = document.createElement("label");
    rotLabel.innerHTML = `<span>rot</span>`;
    const rotInput = document.createElement("input");
    rotInput.type = "number";
    rotInput.min = "-180";
    rotInput.max = "180";
    rotInput.step = "1";
    rotInput.value = String(slot.rotationDeg);
    rotLabel.append(rotInput);

    const wearLabel = document.createElement("label");
    wearLabel.innerHTML = `<span>wear</span>`;
    const wearInput = document.createElement("input");
    wearInput.type = "range";
    wearInput.min = "0";
    wearInput.max = "1";
    wearInput.step = "0.01";
    wearInput.value = String(slot.wear);
    const wearVal = document.createElement("span");
    wearVal.className = "float-like";
    wearVal.textContent = formatFloat(slot.wear);
    wearLabel.append(wearInput, wearVal);

    const commit = (): void => {
      const next = currentSlots.map((s) => ({ ...s }));
      next[i] = {
        id: Math.max(0, Math.floor(Number(idInput.value) || 0)),
        offsetX: clampOffset(Number(xInput.value)),
        offsetY: clampOffset(Number(yInput.value)),
        rotationDeg: clampRotation(Number(rotInput.value)),
        wear: clampWear(Number(wearInput.value)),
      };
      idName.textContent = lookupName(next[i].id);
      wearVal.textContent = formatFloat(next[i].wear);
      applySlots(next);
    };

    select.addEventListener("change", () => {
      if (select.value === "custom") {
        idInput.focus();
        return;
      }
      idInput.value = select.value;
      commit();
    });
    idInput.addEventListener("change", () => {
      const id = Math.max(0, Math.floor(Number(idInput.value) || 0));
      select.value = extractedSticker(id) ? String(id) : id === 0 ? "0" : "custom";
      commit();
    });
    xInput.addEventListener("input", commit);
    yInput.addEventListener("input", commit);
    rotInput.addEventListener("input", commit);
    wearInput.addEventListener("input", commit);

    row.append(pick, idLabel, xLabel, yLabel, rotLabel, wearLabel);
    stickerPanel.append(row);
  }
}

void fetch("/data/stickers.json")
  .then((r) => r.json())
  .then((rows: StickerLookupRow[]) => {
    lookupCatalog = rows;
    buildStickerUi();
  })
  .catch(() => {
    lookupCatalog = EXTRACTED_STICKERS.map((s) => ({
      id: s.id,
      name: s.name,
      name_en: s.nameEn,
      name_zh: s.nameZh,
      sticker_material: s.stickerMaterial,
    }));
  });

buildStickerUi();

const textureLoader = new TextureLoader();
const gltfLoader = new GLTFLoader();

type ExtractedPack = {
  id: number;
  color: Texture;
  wear: Texture;
  holo?: Texture;
  spectrum?: Texture;
};

function loadExtracted(id: number, colorPath: string, wearPath: string, holoPath?: string, spectrumPath?: string): Promise<ExtractedPack> {
  const jobs: Array<Promise<Texture | undefined>> = [
    textureLoader.loadAsync(colorPath),
    textureLoader.loadAsync(wearPath),
  ];
  if (holoPath) jobs.push(textureLoader.loadAsync(holoPath));
  else jobs.push(Promise.resolve(undefined));
  if (spectrumPath) jobs.push(textureLoader.loadAsync(spectrumPath));
  else jobs.push(Promise.resolve(undefined));
  return Promise.all(jobs).then(([color, wear, holo, spectrum]) => ({
    id,
    color: color as Texture,
    wear: wear as Texture,
    holo,
    spectrum,
  }));
}

Promise.all([
  ...KITS.map((kit) => textureLoader.loadAsync(kit.patternPath).then((tex) => ({ kit, tex }))),
  textureLoader.loadAsync(KIT_CASE_HARDENED.wearPath),
  textureLoader.loadAsync(KIT_CASE_HARDENED.grungePath),
  textureLoader.loadAsync(MASKS_URL),
  textureLoader.loadAsync(CAVITY_URL),
  textureLoader.loadAsync(SCRATCHES_URL),
  textureLoader.loadAsync(BACKING_URL),
  gltfLoader.loadAsync(MODEL_URL),
  ...EXTRACTED_STICKERS.map((s) => loadExtracted(s.id, s.colorPath, s.wearPath, s.holoMaskPath, s.spectrumPath)),
])
  .then((loaded) => {
    const kitTexes = loaded.slice(0, KITS.length) as Array<{ kit: ViewerKit; tex: Texture }>;
    const wearTex = loaded[KITS.length] as Texture;
    const grungeTex = loaded[KITS.length + 1] as Texture;
    const masksTex = loaded[KITS.length + 2] as Texture;
    const cavityTex = loaded[KITS.length + 3] as Texture;
    const scratchesTex = loaded[KITS.length + 4] as Texture;
    const backingTex = loaded[KITS.length + 5] as Texture;
    const gltf = loaded[KITS.length + 6] as Awaited<ReturnType<GLTFLoader["loadAsync"]>>;
    const packs = loaded.slice(KITS.length + 7) as ExtractedPack[];

    for (const { kit, tex } of kitTexes) {
      patternByIndex.set(kit.paintIndex, tex);
    }

    const startPattern = patternByIndex.get(kitFromQuery.paintIndex);
    if (!startPattern) throw new Error(`missing pattern for kit ${kitFromQuery.paintIndex}`);

    const dummy = makeDummyTextures();
    const stickerMaps: StickerSharedMaps = {
      scratches: scratchesTex,
      backing: backingTex,
      dummyColor: dummy.color,
      dummyData: dummy.data,
      byId: new Map(),
    };
    for (const pack of packs) {
      stickerMaps.byId.set(pack.id, bindExtracted(pack.id, pack));
    }

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
        const isStickerMat = mat.name.toLowerCase().includes("sticker");
        if (!isStickerMat) {
          const hook = attachPatternMap(mat, maps);
          patternHooks.push(hook);
        }
        const stickerHook = attachStickers(mat, stickerMaps, { gapsOverlay: isStickerMat });
        stickerHooks.push(stickerHook);
      }
    });

    applyKit(kitFromQuery);
    applySlots(currentSlots);
    scene.add(root);

    const box = new Box3().setFromObject(root);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    console.info("[m6] AK-47 share + IBL", {
      size,
      center,
      seed: currentSeed,
      float: currentFloat,
      kit: currentKit.paintIndex,
      style: currentKit.style,
      slots: currentSlots,
      rejected: stickerQuery.rejected,
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
    markError(`Failed to load model/pattern/stickers: ${message}`);
    console.error(err);
  });
