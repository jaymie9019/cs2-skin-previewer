/**
 * Shareable inspect URL (M6).
 *
 * Grammar (query string):
 *   weapon=ak47                 only AK-47 for now (aliases: ak-47, weapon_ak47, ak)
 *   kit=44                      paint index or slug (casehardened / 122 / junglespray / 14 / redlaminate)
 *   seed=923                    0–999
 *   float=0.056                 0–1
 *   sN=id,x,y,rot,wear          N = 0..3  (same as M5; omit / id 0 = empty)
 *
 * Optional screenshot flags (preserved, not part of the inspect):
 *   capture=1  /  fixed=1
 *
 * Opening a URL restores the same inspect. UI changes write back via
 * history.replaceState (no extra history entries).
 *
 * Rejected (not applied):
 *   unknown weapon, unknown kit, s4 / s5 / …
 * Invalid values fall back: weapon → ak47, kit → 44 Case Hardened.
 */
import {
  KIT_CASE_HARDENED,
  isViewerKitQuery,
  resolveKit,
  type ViewerKit,
} from "../kits/catalog";
import { clampFloat } from "../patina/patinaWearMix";
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

export type ShareState = {
  weapon: ViewerWeapon;
  kit: ViewerKit;
  seed: number;
  float: number;
  slots: StickerSlot[];
  capture: boolean;
  fixed: boolean;
};

export type ParsedShareQuery = ShareState & {
  rejected: string[];
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
  let kit = KIT_CASE_HARDENED;
  if (kitRaw != null && kitRaw.trim() !== "") {
    if (isViewerKitQuery(kitRaw)) {
      kit = resolveKit(kitRaw);
    } else {
      rejected.push("kit");
      kit = KIT_CASE_HARDENED;
    }
  }

  const seed = params.has("seed") ? clampSeed(Number(params.get("seed"))) : 0;
  const floatAmt = params.has("float") ? clampFloat(Number(params.get("float"))) : 0;

  const stickers = parseStickerQuery(params);
  rejected.push(...stickers.rejected);

  return {
    weapon,
    kit,
    seed,
    float: floatAmt,
    slots: stickers.slots,
    capture: params.has("capture"),
    fixed: params.has("fixed"),
    rejected,
  };
}

export function serializeShareQuery(state: ShareState): URLSearchParams {
  const params = new URLSearchParams();
  params.set("weapon", state.weapon);
  params.set("kit", String(state.kit.paintIndex));
  params.set("seed", String(state.seed));
  params.set("float", formatQueryFloat(state.float));
  const slots = state.slots.slice(0, MAX_STICKER_LAYERS);
  for (let i = 0; i < MAX_STICKER_LAYERS; i++) {
    const slot = slots[i];
    if (!slot) continue;
    const raw = serializeSlot(slot);
    if (raw != null) params.set(`s${i}`, raw);
  }
  if (state.capture) params.set("capture", "1");
  if (state.fixed) params.set("fixed", "1");
  return params;
}

export function shareStateFromParsed(parsed: ParsedShareQuery): ShareState {
  return {
    weapon: parsed.weapon,
    kit: parsed.kit,
    seed: parsed.seed,
    float: parsed.float,
    slots: parsed.slots.map((s) => ({ ...s })),
    capture: parsed.capture,
    fixed: parsed.fixed,
  };
}

/** Inspect fields that must survive parse → serialize → parse. */
export function sameInspect(a: ShareState, b: ShareState): boolean {
  if (a.weapon !== b.weapon) return false;
  if (a.kit.paintIndex !== b.kit.paintIndex) return false;
  if (a.seed !== b.seed) return false;
  if (a.float !== b.float) return false;
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
