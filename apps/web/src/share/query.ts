/**
 * Shareable inspect URL (M6 + M7 catalog / view / bg / wear clamp).
 *
 * Grammar (query string):
 *   weapon=ak47|glock          AK-47 or Glock-18 (aliases below)
 *   kit=44                      official paint index or ViewerKit slug; official listed kits (72, 226, …) accepted
 *   seed=923                    0–999
 *   float=0.056                 clamped to kit wear remap unless unlock=1 / wear=full
 *   sN=id,x,y,rot,wear          N = 0..3  (same as M5; omit / id 0 = empty)
 *   view=inspect|front|back     omit = inspect
 *   bg=studio|warm|cool|sun     omit = studio (IBL look, not just a plate)
 *   unlock=1  /  wear=full      wear slider 0–1 (else kit remap)
 *   st=1  /  st=0  /  st=<kills>  StatTrak overlay; omit / 0 = off
 *   kills=<n>                   optional kill count (used when StatTrak is on)
 *   name=<text>                 nametag (URL-encoded, max 20 chars; empty rejected)
 *   charm=                      stub — rejected (no local keychain extract)
 *
 * Optional screenshot flags (preserved, not part of the inspect):
 *   capture=1  /  fixed=1
 *
 * Opening a URL restores the same inspect. UI changes write back via
 * history.replaceState (no extra history entries).
 *
 * Rejected (not applied):
 *   unknown weapon (awp), kit not official for THAT weapon (fade / 38 on AK; 44 on Glock), s4 / s5 / …
 *   charm= (M10 stub), empty name=, invalid st=
 * Invalid values fall back: weapon → ak47; kit → 44 on AK, 38 Fade on Glock.
 */
import {
  KIT_CASE_HARDENED,
  KIT_FADE,
  isOfficialAk47KitQuery,
  isOfficialGlockKitQuery,
  isGlockViewerKitQuery,
  isViewerKitQuery,
  officialKit,
  officialGlockKit,
  resolveKit,
  resolveGlockKit,
  resolveOfficialAk47Kit,
  resolveOfficialGlockKit,
  viewerKitFor,
  viewerKitForWeapon,
  clampFloatToKit,
  type OfficialKit,
  type ViewerKit,
} from "../kits/catalog";
import {
  WEAPON_AK47,
  WEAPON_GLOCK,
  resolveViewerWeapon,
  type ViewerWeapon,
} from "./weapons";
import { clampSeed } from "../seed/seedToPatternUv";
import {
  ENV_LOOK_IDS,
  resolveEnvLook,
  type EnvLookId,
} from "../env/catalog";
import {
  MAX_STICKER_LAYERS,
  parseStickerQuery,
  serializeSlot,
  type StickerSlot,
} from "../stickers/slots";

export { WEAPON_AK47, WEAPON_GLOCK, isViewerWeaponQuery, type ViewerWeapon } from "./weapons";

export type InspectView = "inspect" | "front" | "back";
/** M9: `bg=` selects an IBL look (PMREM). Alias kept for M7 call sites. */
export type BackgroundPlate = EnvLookId;

export const INSPECT_VIEWS = ["inspect", "front", "back"] as const;
export const BACKGROUND_PLATES = ENV_LOOK_IDS;

export const NAMETAG_MAX_CHARS = 20;
export const STATTRAK_KILLS_MAX = 999999;

/** Unicode-safe clamp (code points). Empty / whitespace-only → "". */
export function clampNametag(raw: string): string {
  const trimmed = raw.replace(/\s+/g, " ").trim();
  if (!trimmed) return "";
  return [...trimmed].slice(0, NAMETAG_MAX_CHARS).join("");
}

export function clampKills(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.min(STATTRAK_KILLS_MAX, Math.floor(value));
}

/**
 * st omitted / 0 / off / false → off.
 * st=1 / on / true → on, kills 0 (unless kills= is also present).
 * st=<n> n>1 → on, kills n.
 * kills=<n> sets the counter; if st is omitted, kills>0 turns StatTrak on.
 * Invalid st / kills → ignored + rejected.
 */
export function parseStatTrak(params: URLSearchParams): { on: boolean; kills: number; rejected: string[] } {
  const rejected: string[] = [];
  const hasSt = params.has("st");
  const hasKills = params.has("kills");
  let on = false;
  let kills = 0;

  if (hasSt) {
    const raw = (params.get("st") ?? "").trim();
    const lower = raw.toLowerCase();
    if (raw === "" || raw === "0" || lower === "false" || lower === "off") {
      on = false;
      kills = 0;
    } else if (raw === "1" || lower === "true" || lower === "on") {
      on = true;
      kills = 0;
    } else {
      const n = Number(raw);
      if (Number.isFinite(n) && n > 0) {
        on = true;
        kills = clampKills(n);
      } else {
        rejected.push("st");
        on = false;
        kills = 0;
      }
    }
  }

  if (hasKills) {
    const raw = (params.get("kills") ?? "").trim();
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0) {
      kills = clampKills(n);
      if (!hasSt && kills > 0) on = true;
    } else {
      rejected.push("kills");
    }
  }

  if (!on) kills = 0;
  return { on, kills, rejected };
}

export function parseNametag(params: URLSearchParams): { nametag: string; rejected: string[] } {
  if (!params.has("name")) return { nametag: "", rejected: [] };
  const clamped = clampNametag(params.get("name") ?? "");
  if (!clamped) return { nametag: "", rejected: ["name"] };
  return { nametag: clamped, rejected: [] };
}

export type ShareState = {
  weapon: ViewerWeapon;
  /** Painted ViewerKit, or null when the official kit has no shader yet. */
  kit: ViewerKit | null;
  official?: OfficialKit;
  seed: number;
  float: number;
  slots: StickerSlot[];
  view?: InspectView;
  bg?: BackgroundPlate;
  unlockWear?: boolean;
  /** Visual StatTrak counter. Omit / false = off. */
  stattrak?: boolean;
  /** Kill count shown on the StatTrak plate (default 0). */
  kills?: number;
  /** Nametag text. Empty / omit = no plate. */
  nametag?: string;
  capture: boolean;
  fixed: boolean;
};

export type ParsedShareQuery = ShareState & {
  rejected: string[];
  official: OfficialKit;
  view: InspectView;
  bg: BackgroundPlate;
  unlockWear: boolean;
  stattrak: boolean;
  kills: number;
  nametag: string;
};

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

export function parseShareQuery(params: URLSearchParams): ParsedShareQuery {
  const rejected: string[] = [];

  const weaponRaw = params.get("weapon");
  let weapon: ViewerWeapon = WEAPON_AK47;
  if (weaponRaw != null && weaponRaw.trim() !== "") {
    const resolved = resolveViewerWeapon(weaponRaw);
    if (resolved) {
      weapon = resolved;
    } else {
      rejected.push("weapon");
      weapon = WEAPON_AK47;
    }
  }

  const kitRaw = params.get("kit");
  let kit: ViewerKit | null;
  let official: OfficialKit;
  if (weapon === WEAPON_GLOCK) {
    kit = KIT_FADE;
    official = officialGlockKit(38);
    if (kitRaw != null && kitRaw.trim() !== "") {
      if (isGlockViewerKitQuery(kitRaw)) {
        kit = resolveGlockKit(kitRaw);
        official = officialGlockKit(kit.paintIndex);
      } else if (isOfficialGlockKitQuery(kitRaw)) {
        official = resolveOfficialGlockKit(kitRaw) ?? officialGlockKit(38);
        kit = viewerKitForWeapon(WEAPON_GLOCK, official);
      } else {
        rejected.push("kit");
        kit = KIT_FADE;
        official = officialGlockKit(38);
      }
    }
  } else {
    kit = KIT_CASE_HARDENED;
    official = officialKit(44);
    if (kitRaw != null && kitRaw.trim() !== "") {
      // ViewerKit slugs (casehardened / junglespray / …) first so M4 aliases keep working.
      if (isViewerKitQuery(kitRaw)) {
        kit = resolveKit(kitRaw);
        official = officialKit(kit.paintIndex);
      } else if (isOfficialAk47KitQuery(kitRaw)) {
        official = resolveOfficialAk47Kit(kitRaw) ?? officialKit(44);
        kit = viewerKitFor(official);
      } else {
        rejected.push("kit");
        kit = KIT_CASE_HARDENED;
        official = officialKit(44);
      }
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

  const bgResolved = resolveEnvLook(params.get("bg"));
  const bg: BackgroundPlate = bgResolved.id;
  if (bgResolved.rejected) rejected.push("bg");

  const stickers = parseStickerQuery(params);
  rejected.push(...stickers.rejected);

  const st = parseStatTrak(params);
  rejected.push(...st.rejected);
  const named = parseNametag(params);
  rejected.push(...named.rejected);
  if (params.has("charm")) rejected.push("charm");

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
    stattrak: st.on,
    kills: st.kills,
    nametag: named.nametag,
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
  if (state.stattrak) {
    const kills = clampKills(state.kills ?? 0);
    params.set("st", kills > 0 ? String(kills) : "1");
  }
  const nametag = clampNametag(state.nametag ?? "");
  if (nametag) params.set("name", nametag);
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
    stattrak: parsed.stattrak,
    kills: parsed.kills,
    nametag: parsed.nametag,
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
  if (Boolean(a.stattrak) !== Boolean(b.stattrak)) return false;
  if (Boolean(a.stattrak) && clampKills(a.kills ?? 0) !== clampKills(b.kills ?? 0)) return false;
  if (clampNametag(a.nametag ?? "") !== clampNametag(b.nametag ?? "")) return false;
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
