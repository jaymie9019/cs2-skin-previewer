/**
 * Shareable inspect URL (M6 + M7 catalog / view / bg / wear clamp).
 *
 * Grammar (query string):
 *   weapon=ak47                 only AK-47 for now (aliases: ak-47, weapon_ak47, ak)
 *   kit=44                      official paint index or ViewerKit slug; official listed kits (72, 226, …) accepted
 *   seed=923                    0–999
 *   float=0.056                 clamped to kit wear remap unless unlock=1 / wear=full
 *   sN=id,x,y,rot,wear          N = 0..3  (same as M5; omit / id 0 = empty)
 *   view=inspect|front|back     omit = inspect
 *   bg=studio|warm|cool         omit = studio
 *   unlock=1  /  wear=full      wear slider 0–1 (else kit remap)
 *
 * Optional screenshot flags (preserved, not part of the inspect):
 *   capture=1  /  fixed=1
 *
 * Opening a URL restores the same inspect. UI changes write back via
 * history.replaceState (no extra history entries).
 *
 * Rejected (not applied):
 *   unknown weapon, unknown kit (fade / 38 / 999 — not official AK), s4 / s5 / …
 * Invalid values fall back: weapon → ak47, kit → 44 Case Hardened.
 */
import {
  KIT_CASE_HARDENED,
  isOfficialAk47KitQuery,
  isViewerKitQuery,
  officialKit,
  resolveKit,
  resolveOfficialAk47Kit,
  viewerKitFor,
  clampFloatToKit,
  type OfficialAk47Kit,
  type ViewerKit,
} from "../kits/catalog";
import { clampSeed } from "../seed/seedToPatternUv";
import {
  MAX_STICKER_LAYERS,
  parseStickerQuery,
  serializeSlot,
  type StickerSlot,
} from "../stickers/slots";

export const WEAPON_AK47 = "ak47";
export type ViewerWeapon = typeof WEAPON_AK47;

const WEAPON_ALIASES = new Set(["ak47", "ak-47", "weapon_ak47", "ak"]);

export type InspectView = "inspect" | "front" | "back";
export type BackgroundPlate = "studio" | "warm" | "cool";

export const INSPECT_VIEWS = ["inspect", "front", "back"] as const;
export const BACKGROUND_PLATES = ["studio", "warm", "cool"] as const;

export type ShareState = {
  weapon: ViewerWeapon;
  /** Painted ViewerKit, or null when the official kit has no shader yet. */
  kit: ViewerKit | null;
  official?: OfficialAk47Kit;
  seed: number;
  float: number;
  slots: StickerSlot[];
  view?: InspectView;
  bg?: BackgroundPlate;
  unlockWear?: boolean;
  capture: boolean;
  fixed: boolean;
};

export type ParsedShareQuery = ShareState & {
  rejected: string[];
  official: OfficialAk47Kit;
  view: InspectView;
  bg: BackgroundPlate;
  unlockWear: boolean;
};

export function isViewerWeaponQuery(query: string | null | undefined): boolean {
  if (query == null || query.trim() === "") return false;
  return WEAPON_ALIASES.has(query.trim().toLowerCase());
}

export function formatQueryFloat(value: number): string {
  if (!Number.isFinite(value)) return "0";
  const clamped = Math.min(1, Math.max(0, value));
  if (clamped === 0) return "0";
  if (clamped === 1) return "1";
  const rounded = Math.round(clamped * 1e8) / 1e8;
  return String(rounded);
}

export function officialIndexOf(state: ShareState): number {
  return state.official?.paint_index ?? state.kit?.paintIndex ?? 44;
}

function defaultOfficial(): OfficialAk47Kit {
  return officialKit(44);
}

export function parseShareQuery(params: URLSearchParams): ParsedShareQuery {
  const rejected: string[] = [];

  const weaponRaw = params.get("weapon");
  let weapon: ViewerWeapon = WEAPON_AK47;
  if (weaponRaw != null && weaponRaw.trim() !== "") {
    if (isViewerWeaponQuery(weaponRaw)) {
      weapon = WEAPON_AK47;
    } else {
      rejected.push("weapon");
      weapon = WEAPON_AK47;
    }
  }

  const kitRaw = params.get("kit");
  let kit: ViewerKit | null = KIT_CASE_HARDENED;
  let official = defaultOfficial();
  if (kitRaw != null && kitRaw.trim() !== "") {
    // ViewerKit slugs (casehardened / junglespray / …) first so M4 aliases keep working.
    if (isViewerKitQuery(kitRaw)) {
      kit = resolveKit(kitRaw);
      official = officialKit(kit.paintIndex);
    } else if (isOfficialAk47KitQuery(kitRaw)) {
      official = resolveOfficialAk47Kit(kitRaw) ?? defaultOfficial();
      kit = viewerKitFor(official);
    } else {
      rejected.push("kit");
      kit = KIT_CASE_HARDENED;
      official = defaultOfficial();
    }
  }

  const unlockWear = params.get("unlock") === "1" || params.get("wear") === "full";

  const seed = params.has("seed") ? clampSeed(Number(params.get("seed"))) : 0;
  const rawFloat = params.has("float") ? Number(params.get("float")) : 0;
  const floatAmt = clampFloatToKit(rawFloat, official, unlockWear);

  let view: InspectView = "inspect";
  const viewRaw = params.get("view");
  if (viewRaw != null && viewRaw.trim() !== "") {
    const v = viewRaw.trim().toLowerCase();
    if (v === "front" || v === "back" || v === "inspect") {
      view = v;
    } else {
      rejected.push("view");
      view = "inspect";
    }
  }

  let bg: BackgroundPlate = "studio";
  const bgRaw = params.get("bg");
  if (bgRaw != null && bgRaw.trim() !== "") {
    const b = bgRaw.trim().toLowerCase();
    if (b === "studio" || b === "warm" || b === "cool") {
      bg = b;
    } else {
      rejected.push("bg");
      bg = "studio";
    }
  }

  const stickers = parseStickerQuery(params);
  rejected.push(...stickers.rejected);

  return {
    weapon,
    kit,
    official,
    seed,
    float: floatAmt,
    slots: stickers.slots,
    view,
    bg,
    unlockWear,
    capture: params.has("capture"),
    fixed: params.has("fixed"),
    rejected,
  };
}

export function serializeShareQuery(state: ShareState): URLSearchParams {
  const params = new URLSearchParams();
  params.set("weapon", state.weapon);
  params.set("kit", String(officialIndexOf(state)));
  params.set("seed", String(state.seed));
  params.set("float", formatQueryFloat(state.float));
  const slots = state.slots.slice(0, MAX_STICKER_LAYERS);
  for (let i = 0; i < MAX_STICKER_LAYERS; i++) {
    const slot = slots[i];
    if (!slot) continue;
    const raw = serializeSlot(slot);
    if (raw != null) params.set(`s${i}`, raw);
  }
  if (state.view && state.view !== "inspect") params.set("view", state.view);
  if (state.bg && state.bg !== "studio") params.set("bg", state.bg);
  if (state.unlockWear) params.set("unlock", "1");
  if (state.capture) params.set("capture", "1");
  if (state.fixed) params.set("fixed", "1");
  return params;
}

export function shareStateFromParsed(parsed: ParsedShareQuery): ShareState {
  return {
    weapon: parsed.weapon,
    kit: parsed.kit,
    official: parsed.official,
    seed: parsed.seed,
    float: parsed.float,
    slots: parsed.slots.map((s) => ({ ...s })),
    view: parsed.view,
    bg: parsed.bg,
    unlockWear: parsed.unlockWear,
    capture: parsed.capture,
    fixed: parsed.fixed,
  };
}

/** Inspect fields that must survive parse → serialize → parse. */
export function sameInspect(a: ShareState, b: ShareState): boolean {
  if (a.weapon !== b.weapon) return false;
  if (officialIndexOf(a) !== officialIndexOf(b)) return false;
  if (a.seed !== b.seed) return false;
  if (a.float !== b.float) return false;
  if ((a.view ?? "inspect") !== (b.view ?? "inspect")) return false;
  if ((a.bg ?? "studio") !== (b.bg ?? "studio")) return false;
  if (Boolean(a.unlockWear) !== Boolean(b.unlockWear)) return false;
  if (a.slots.length !== b.slots.length) return false;
  for (let i = 0; i < a.slots.length; i++) {
    const x = a.slots[i];
    const y = b.slots[i];
    if (
      x.id !== y.id ||
      x.offsetX !== y.offsetX ||
      x.offsetY !== y.offsetY ||
      x.rotationDeg !== y.rotationDeg ||
      x.wear !== y.wear
    ) {
      return false;
    }
  }
  return true;
}

export function applyShareUrl(state: ShareState, loc: Location = window.location, hist: History = window.history): string {
  const qs = serializeShareQuery(state).toString();
  const next = qs ? `${loc.pathname}?${qs}` : loc.pathname;
  const current = `${loc.pathname}${loc.search}`;
  if (next !== current) {
    hist.replaceState(null, "", next);
  }
  return qs;
}
