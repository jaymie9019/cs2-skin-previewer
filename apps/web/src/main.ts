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
  OFFICIAL_AK47_KITS,
  clampFloatToKit,
  filterOfficialKits,
  formatWearRange,
  hasPaintPreview,
  kitSeedOptions,
  officialKit,
  officialKitLabel,
  resolveOfficialAk47Kit,
  viewerKitFor,
  type OfficialAk47Kit,
  type ViewerKit,
} from "./kits/catalog";
import { attachPatternMap, type PatternHook } from "./patternMaterial";
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
import {
  applyShareUrl,
  parseShareQuery,
  type BackgroundPlate,
  type InspectView,
  type ViewerWeapon,
} from "./share/query";

/** 3/4 view that reads as a rifle (model is ~1m along +Z). */
const FIXED_CAMERA = new Vector3(0.95, 0.42, 1.05);
const FIXED_TARGET = new Vector3(-0.01, -0.025, 0.18);
/** Receiver / right side (+X). */
const FRONT_CAMERA = new Vector3(1.35, 0.12, 0.18);
/** Magazine / left side (−X). */
const BACK_CAMERA = new Vector3(-1.35, 0.12, 0.18);

const VIEW_PRESETS: Record<InspectView, { camera: Vector3; target: Vector3 }> = {
  inspect: { camera: FIXED_CAMERA, target: FIXED_TARGET },
  front: { camera: FRONT_CAMERA, target: FIXED_TARGET },
  back: { camera: BACK_CAMERA, target: FIXED_TARGET },
};

const BG_COLORS: Record<BackgroundPlate, number> = {
  studio: 0x14161a,
  warm: 0x2a2218,
  cool: 0x1a1e24,
};

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
const officialFromQuery = share.official ?? officialKit(44);
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
const catalogList = document.querySelector("#catalog-list");
const catalogSearch = document.querySelector("#catalog-search");
const catalogCount = document.querySelector("#catalog-count");
const wearRangeEl = document.querySelector("#wear-range");
const unlockWearInput = document.querySelector("#unlock-wear");
const previewBadge = document.querySelector("#preview-badge");
const viewRow = document.querySelector("#view-row");
const bgRow = document.querySelector("#bg-row");

function setStatus(text: string): void {
  if (statusEl instanceof HTMLElement) {
    statusEl.textContent = text;
  }
}

function formatFloat(value: number): string {
  return value.toFixed(2);
}

function releaseDocumentHold(): void {
  void fetch("/m8-release", { method: "POST" }).catch(() => {
    void fetch("/m7-release", { method: "POST" }).catch(() => {
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
    });
  });
}

function markReady(): void {
  window.__M8_READY__ = true;
  window.__M7_READY__ = true;
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
  window.__M8_ERROR__ = message;
  window.__M7_ERROR__ = message;
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
scene.background = new Color(BG_COLORS[share.bg ?? "studio"]);

const camera = new PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.01, 20);
camera.position.copy(VIEW_PRESETS[share.view ?? "inspect"].camera);

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
controls.target.copy(VIEW_PRESETS[share.view ?? "inspect"].target);
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
let currentOfficial: OfficialAk47Kit = officialFromQuery;
let currentKit: ViewerKit | null = kitFromQuery;
let currentView: InspectView = share.view ?? "inspect";
let currentBg: BackgroundPlate = share.bg ?? "studio";
let currentUnlockWear = share.unlockWear ?? false;
let currentSlots: StickerSlot[] = stickerQuery.slots.map((s) => ({ ...s }));
let lookupCatalog: StickerLookupRow[] = [];
let catalogFilter = "";

function wearBounds(): { min: number; max: number } {
  if (currentUnlockWear) return { min: 0, max: 1 };
  return {
    min: currentOfficial.wear_remap_min_effective,
    max: currentOfficial.wear_remap_max_effective,
  };
}

function syncShareUrl(): void {
  const qs = applyShareUrl({
    weapon: currentWeapon,
    kit: currentKit,
    official: currentOfficial,
    seed: currentSeed,
    float: currentFloat,
    slots: currentSlots,
    view: currentView,
    bg: currentBg,
    unlockWear: currentUnlockWear,
    capture: share.capture,
    fixed: share.fixed,
  });
  const bounds = wearBounds();
  window.__M6_WEAPON__ = currentWeapon;
  window.__M6_KIT__ = currentOfficial.paint_index;
  window.__M6_SEED__ = currentSeed;
  window.__M6_FLOAT__ = currentFloat;
  window.__M6_SLOTS__ = currentSlots.map((s) => ({ ...s }));
  window.__M6_REJECTED__ = share.rejected;
  window.__M6_URL__ = qs;
  window.__M7_VIEW__ = currentView;
  window.__M7_BG__ = currentBg;
  window.__M7_KIT__ = currentOfficial.paint_index;
  window.__M7_PAINT__ = currentKit != null;
  window.__M7_WEAR_MIN__ = bounds.min;
  window.__M7_WEAR_MAX__ = bounds.max;
  window.__M7_UNLOCK__ = currentUnlockWear;
}

function setButtonActive(row: Element | null, attr: string, value: string): void {
  if (!(row instanceof HTMLElement)) return;
  for (const btn of row.querySelectorAll("button")) {
    btn.classList.toggle("active", btn.getAttribute(attr) === value);
  }
}

function applyView(view: InspectView): void {
  currentView = view;
  const preset = VIEW_PRESETS[view];
  camera.position.copy(preset.camera);
  controls.target.copy(preset.target);
  controls.update();
  setButtonActive(viewRow, "data-view", view);
  syncShareUrl();
}

function applyBackground(bg: BackgroundPlate): void {
  currentBg = bg;
  const hex = BG_COLORS[bg];
  scene.background = new Color(hex);
  document.body.style.background = `#${hex.toString(16).padStart(6, "0")}`;
  setButtonActive(bgRow, "data-bg", bg);
  syncShareUrl();
}

function applySeed(seed: number): void {
  if (currentKit) {
    const uv = seedToPatternUv(seed, kitSeedOptions(currentKit));
    currentSeed = uv.seed;
    const pattern =
      currentKit.uvAligned || currentKit.grainWindow != null ? IDENTITY : uv.pattern.matrix;
    for (const hook of patternHooks) {
      hook.setLayers({
        pattern,
        wear: uv.wear.matrix,
        grunge: uv.grunge.matrix,
      });
    }
    window.__M2_UV__ = {
      translateX: uv.pattern.translateX,
      translateY: uv.pattern.translateY,
      rotationDeg: uv.pattern.rotationDeg,
      scale: uv.pattern.scale,
    };
  } else {
    currentSeed = clampSeed(seed);
  }
  if (seedValue instanceof HTMLElement) {
    seedValue.textContent = String(currentSeed);
  }
  window.__M2_SEED__ = currentSeed;
  window.__M3_SEED__ = currentSeed;
  window.__M4_SEED__ = currentSeed;
  syncShareUrl();
}

function applyFloat(floatAmt: number): void {
  currentFloat = clampFloatToKit(floatAmt, currentOfficial, currentUnlockWear);
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

function updateWearSliderBounds(): void {
  const bounds = wearBounds();
  if (floatInput instanceof HTMLInputElement) {
    floatInput.min = String(bounds.min);
    floatInput.max = String(bounds.max);
    floatInput.value = String(currentFloat);
  }
  if (wearRangeEl instanceof HTMLElement) {
    const label = currentUnlockWear ? "wear 0–1 (unlocked)" : `wear ${formatWearRange(currentOfficial)}`;
    wearRangeEl.textContent = label;
  }
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

function updateStatus(): void {
  const label = officialKitLabel(currentOfficial);
  const vanilla = currentKit == null;
  const note = vanilla ? "  — preview not implemented / 尚未做涂装" : "";
  setStatus(
    `AK-47 ${label} — seed ${currentSeed}  float ${formatFloat(currentFloat)}  ${stickerStatus()}${note}`,
  );
  if (previewBadge instanceof HTMLElement) {
    previewBadge.hidden = !vanilla;
  }
}

function applyOfficial(official: OfficialAk47Kit): void {
  currentOfficial = official;
  const viewer = viewerKitFor(official);
  currentKit = viewer;
  const paintOn = viewer != null && hasPaintPreview(official.paint_index);
  for (const hook of patternHooks) {
    hook.setPaintEnabled(paintOn);
    if (viewer) {
      const pattern = patternByIndex.get(viewer.paintIndex);
      if (pattern) hook.setKit(viewer, pattern);
    }
  }
  currentFloat = clampFloatToKit(currentFloat, official, currentUnlockWear);
  updateWearSliderBounds();
  applySeed(currentSeed);
  applyFloat(currentFloat);
  if (kitSelect instanceof HTMLSelectElement) {
    kitSelect.value = String(official.paint_index);
  }
  window.__M4_KIT__ = official.paint_index;
  window.__M4_STYLE__ = official.style;
  renderCatalog();
  updateStatus();
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
  applyOfficial(currentOfficial);
}

function renderCatalog(): void {
  if (!(catalogList instanceof HTMLElement)) return;
  const rows = filterOfficialKits(OFFICIAL_AK47_KITS, catalogFilter);
  if (catalogCount instanceof HTMLElement) {
    catalogCount.textContent = catalogFilter.trim()
      ? `${rows.length} / 61`
      : "61 official";
  }
  catalogList.replaceChildren();
  for (const kit of rows) {
    const live = hasPaintPreview(kit.paint_index);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "catalog-row";
    if (kit.paint_index === currentOfficial.paint_index) btn.classList.add("active");
    btn.dataset.index = String(kit.paint_index);

    const left = document.createElement("div");
    const names = document.createElement("div");
    names.className = "catalog-names";
    names.textContent = `${kit.name_en} / ${kit.name_zh}`;
    const meta = document.createElement("div");
    meta.className = "catalog-meta";
    meta.textContent = `#${kit.paint_index} · ${kit.style_name} · ${formatWearRange(kit)}`;
    left.append(names, meta);

    const right = document.createElement("div");
    right.className = "catalog-badges";
    const badge = document.createElement("span");
    badge.className = `badge ${live ? "live" : "listed"}`;
    badge.textContent = live ? "Live" : "Listed";
    const dot = document.createElement("span");
    dot.className = `rar-dot ${kit.rarity}`;
    dot.title = kit.rarity;
    right.append(badge, dot);

    btn.append(left, right);
    btn.addEventListener("click", () => {
      applyOfficial(kit);
    });
    catalogList.append(btn);
  }
  const active = catalogList.querySelector(".catalog-row.active");
  if (active instanceof HTMLElement) {
    active.scrollIntoView({ block: "nearest" });
  }
}

if (kitSelect instanceof HTMLSelectElement) {
  kitSelect.replaceChildren();
  for (const kit of OFFICIAL_AK47_KITS) {
    const opt = document.createElement("option");
    opt.value = String(kit.paint_index);
    const tag = hasPaintPreview(kit.paint_index) ? "Live" : "Listed";
    opt.textContent = `${kitLabelish(kit)} (${tag})`;
    kitSelect.append(opt);
  }
  kitSelect.value = String(officialFromQuery.paint_index);
  kitSelect.addEventListener("change", () => {
    const next = resolveOfficialAk47Kit(kitSelect.value) ?? officialKit(44);
    applyOfficial(next);
  });
}

function kitLabelish(kit: OfficialAk47Kit): string {
  return officialKitLabel(kit);
}

if (seedInput instanceof HTMLInputElement) {
  seedInput.value = String(seedFromQuery);
  seedInput.addEventListener("input", () => {
    const next = clampSeed(Number(seedInput.value));
    seedInput.value = String(next);
    applySeed(next);
    updateStatus();
  });
}

if (floatInput instanceof HTMLInputElement) {
  floatInput.value = String(floatFromQuery);
  floatInput.addEventListener("input", () => {
    applyFloat(Number(floatInput.value));
    updateStatus();
  });
}

if (unlockWearInput instanceof HTMLInputElement) {
  unlockWearInput.checked = currentUnlockWear;
  unlockWearInput.addEventListener("change", () => {
    currentUnlockWear = unlockWearInput.checked;
    currentFloat = clampFloatToKit(currentFloat, currentOfficial, currentUnlockWear);
    updateWearSliderBounds();
    applyFloat(currentFloat);
    updateStatus();
    syncShareUrl();
  });
}

if (catalogSearch instanceof HTMLInputElement) {
  catalogSearch.addEventListener("input", () => {
    catalogFilter = catalogSearch.value;
    renderCatalog();
  });
}

if (viewRow instanceof HTMLElement) {
  viewRow.addEventListener("click", (ev) => {
    const t = ev.target;
    if (!(t instanceof HTMLElement)) return;
    const v = t.getAttribute("data-view");
    if (v === "inspect" || v === "front" || v === "back") applyView(v);
  });
}

if (bgRow instanceof HTMLElement) {
  bgRow.addEventListener("click", (ev) => {
    const t = ev.target;
    if (!(t instanceof HTMLElement)) return;
    const b = t.getAttribute("data-bg");
    if (b === "studio" || b === "warm" || b === "cool") applyBackground(b);
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
renderCatalog();
updateWearSliderBounds();
applyView(currentView);
applyBackground(currentBg);
updateStatus();

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
  ...EXTRACTED_STICKERS.map((s) =>
    loadExtracted(s.id, s.colorPath, s.wearPath, s.holoMaskPath, s.spectrumPath).catch((err) => {
      console.warn("[m8] sticker pack failed; continuing without it", s.id, err);
      return null;
    }),
  ),
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
    const packs = loaded.slice(KITS.length + 7).filter((p): p is ExtractedPack => p != null);

    for (const { kit, tex } of kitTexes) {
      patternByIndex.set(kit.paintIndex, tex);
    }

    const startPattern =
      (kitFromQuery && patternByIndex.get(kitFromQuery.paintIndex)) ||
      patternByIndex.get(KIT_CASE_HARDENED.paintIndex);
    if (!startPattern) throw new Error("missing Case Hardened pattern maps");

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

    applyOfficial(officialFromQuery);
    applySlots(currentSlots);
    scene.add(root);

    const box = new Box3().setFromObject(root);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    console.info("[m8] AK-47 paint styles", {
      size,
      center,
      seed: currentSeed,
      float: currentFloat,
      kit: currentOfficial.paint_index,
      paint: currentKit != null,
      view: currentView,
      bg: currentBg,
      slots: currentSlots,
      rejected: stickerQuery.rejected,
      modelUrl: MODEL_URL,
    });

    if (fixedCamera) {
      // capture without view= stays on the inspect pose (M6 baselines).
      applyView(currentView);
      renderer.render(scene, camera);
    }
    markReady();
  })
  .catch((err: unknown) => {
    let message: string;
    if (err instanceof Error) {
      message = err.message;
    } else if (err && typeof err === "object" && "type" in err) {
      const ev = err as Event;
      const target = ev.target as { src?: string; currentSrc?: string } | null;
      message = `${ev.type} ${target?.src || target?.currentSrc || ""}`.trim();
    } else {
      message = String(err);
    }
    markError(`Failed to load model/pattern/stickers: ${message}`);
    console.error(err);
  });
