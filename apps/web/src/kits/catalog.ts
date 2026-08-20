/**
 * AK-47 viewer kits (M4 + M8). Official records come from
 * data/ak47_paint_kits.json (items_game [kit]weapon_ak47).
 * Do not invent kits (there is no AK-47 Fade / 渐变之色).
 *
 * Viewer extras (pattern path, vmat colors, per-kit mask) are
 * keyed by paint_index and must exist in that JSON.
 *
 *   https://www.counter-strike.net/workshop/workshopfinishes/
 *   https://pattern.wiki/wiki/pattern_colors
 *   local items_game + decompiled vmats (Source2Viewer-CLI 20.0)
 */

import officialKits from "../../../../data/ak47_paint_kits.json";
import officialGlockKits from "../../../../data/glock_paint_kits.json";
import type { ViewerWeapon } from "../share/weapons";
import { WEAPON_GLOCK } from "../share/weapons";
import {
  PATINA_COLOR0,
  PATINA_COLOR1,
  PATINA_COLOR2,
  PATINA_COLOR3,
  PATINA_PAINT_METALNESS,
  PATINA_PAINT_ROUGHNESS,
  PATINA_PATTERN_GAIN,
  type Rgb,
} from "../patina/patinaWearMix";
import type { SeedUvOptions } from "../seed/seedToPatternUv";

/** Same items_game row shape for any weapon catalog. */
export type OfficialKit = OfficialAk47Kit;

export type OfficialAk47Kit = {
  paint_index: number;
  name: string;
  name_en: string;
  name_zh: string;
  name_zht?: string;
  style: number;
  style_name: string;
  wear_remap_min_effective: number;
  wear_remap_max_effective: number;
  wear_default: number | null;
  rarity: string;
};

export type MaskMode = "metal" | "spray" | "furniture";

/**
 * Style-2 hydrographic film window. laminate_ak47.png is a UV atlas
 * authored for the legacy AK; HD TEXCOORD_0 misses those islands
 * (~13% hit → nested mix of black → Color0, which the old 0.42 mix
 * toward Color1 crushed to a flat dull red). Sample this dense
 * plywood-grain rectangle instead and tile it across weapon UVs.
 * Coordinates are PNG-space (flipY = false), 0–1.
 */
export type GrainWindow = {
  origin: readonly [number, number];
  size: readonly [number, number];
  tile: number;
};

export type ViewerKit = {
  paintIndex: number;
  internalName: string;
  nameEn: string;
  nameZh: string;
  style: number;
  styleName: string;
  wearRemapMin: number;
  wearRemapMax: number;
  slug: string;
  patternPath: string;
  wearPath: string;
  grungePath: string;
  patternScale: number;
  ignoreWeaponSizeScale: boolean;
  /** UV-authored wrap (custom / gunsmith). Pattern matrix stays identity. */
  uvAligned: boolean;
  /** Pattern is a full-color albedo (styles 7 / 9), not nested-RGB weights. */
  patternAsAlbedo: boolean;
  colors: readonly [Rgb, Rgb, Rgb, Rgb];
  patternGain: number;
  paintRoughness: number;
  paintMetalness: number;
  maskMode: MaskMode;
  grainWindow: GrainWindow | null;
  /** UV-aligned extra roughness (Redline F_ROUGHNESS_TEXTURE). */
  roughnessPath: string | null;
  /** UV-aligned extra normal (Fuel Injector F_OVERRIDE_NORMAL). */
  normalPath: string | null;
  aliases: readonly string[];
};

const SHARED_WEAR = "/assets/paints/aq_oiled/paint_wear.png";
const SHARED_GRUNGE = "/assets/paints/aq_oiled/gun_grunge.png";

/** Same plywood island as kit 14 — Blue Laminate's official film is the same file. */
const LAMINATE_GRAIN: GrainWindow = {
  origin: [1040 / 2048, 1440 / 2048],
  size: [512 / 2048, 256 / 2048],
  tile: 2,
};

/** Official 61-kit catalog. Source of truth for names / style / wear. */
export const OFFICIAL_AK47_KITS: readonly OfficialAk47Kit[] = officialKits as OfficialAk47Kit[];

const officialByIndex = new Map(OFFICIAL_AK47_KITS.map((k) => [k.paint_index, k]));

export function officialKit(paintIndex: number): OfficialAk47Kit {
  const row = officialByIndex.get(paintIndex);
  if (!row) {
    throw new Error(`paint index ${paintIndex} is not an official AK-47 kit in data/ak47_paint_kits.json`);
  }
  return row;
}

/** Official 59-kit Glock-18 catalog. Pairing is [kit]weapon_glock. Includes Fade 38. */
export const OFFICIAL_GLOCK_KITS: readonly OfficialKit[] = officialGlockKits as OfficialKit[];

const officialGlockByIndex = new Map(OFFICIAL_GLOCK_KITS.map((k) => [k.paint_index, k]));

export function officialGlockKit(paintIndex: number): OfficialKit {
  const row = officialGlockByIndex.get(paintIndex);
  if (!row) {
    throw new Error(`paint index ${paintIndex} is not an official Glock-18 kit in data/glock_paint_kits.json`);
  }
  return row;
}

export function officialCatalogFor(weapon: ViewerWeapon): readonly OfficialKit[] {
  return weapon === WEAPON_GLOCK ? OFFICIAL_GLOCK_KITS : OFFICIAL_AK47_KITS;
}

export function officialKitFor(weapon: ViewerWeapon, paintIndex: number): OfficialKit {
  return weapon === WEAPON_GLOCK ? officialGlockKit(paintIndex) : officialKit(paintIndex);
}

type ViewerKitExtras = {
  slug: string;
  patternPath: string;
  patternScale: number;
  ignoreWeaponSizeScale: boolean;
  colors: readonly [Rgb, Rgb, Rgb, Rgb];
  patternGain: number;
  paintRoughness: number;
  paintMetalness: number;
  maskMode: MaskMode;
  grainWindow?: GrainWindow | null;
  uvAligned?: boolean;
  patternAsAlbedo?: boolean;
  roughnessPath?: string | null;
  normalPath?: string | null;
  aliases: readonly string[];
};

function viewerKitFromRow(row: OfficialKit, extras: ViewerKitExtras): ViewerKit {
  return {
    paintIndex: row.paint_index,
    internalName: row.name,
    nameEn: row.name_en,
    nameZh: row.name_zh,
    style: row.style,
    styleName: row.style_name,
    wearRemapMin: row.wear_remap_min_effective,
    wearRemapMax: row.wear_remap_max_effective,
    slug: extras.slug,
    patternPath: extras.patternPath,
    wearPath: SHARED_WEAR,
    grungePath: SHARED_GRUNGE,
    patternScale: extras.patternScale,
    ignoreWeaponSizeScale: extras.ignoreWeaponSizeScale,
    uvAligned: extras.uvAligned ?? false,
    patternAsAlbedo: extras.patternAsAlbedo ?? false,
    colors: extras.colors,
    patternGain: extras.patternGain,
    paintRoughness: extras.paintRoughness,
    paintMetalness: extras.paintMetalness,
    maskMode: extras.maskMode,
    grainWindow: extras.grainWindow ?? null,
    roughnessPath: extras.roughnessPath ?? null,
    normalPath: extras.normalPath ?? null,
    aliases: extras.aliases,
  };
}

function viewerKit(paintIndex: number, extras: ViewerKitExtras): ViewerKit {
  return viewerKitFromRow(officialKit(paintIndex), extras);
}

/** Kit 44 / aq_oiled / style 8 Patina. Metal-only mask (M3). */
export const KIT_CASE_HARDENED: ViewerKit = viewerKit(44, {
  slug: "casehardened",
  patternPath: "/assets/paints/aq_oiled/oiled.png",
  patternScale: 1,
  ignoreWeaponSizeScale: false,
  colors: [PATINA_COLOR0, PATINA_COLOR1, PATINA_COLOR2, PATINA_COLOR3],
  patternGain: PATINA_PATTERN_GAIN,
  paintRoughness: PATINA_PAINT_ROUGHNESS,
  paintMetalness: PATINA_PAINT_METALNESS,
  maskMode: "metal",
  aliases: ["44", "ch", "casehardened", "case-hardened", "aq_oiled", "oiled", "表面淬火"],
});

/**
 * Kit 122 / sp_spray_jungle / style 3 Spray-Paint.
 * Nested RGB of camo_daubs.png. Paints furniture + receiver + mag
 * (not the Case Hardened metal-only mask). Matte, not patina.
 * Colors + scale from sp_spray_jungle.vmat.
 */
export const KIT_JUNGLE_SPRAY: ViewerKit = viewerKit(122, {
  slug: "junglespray",
  patternPath: "/assets/paints/sp_spray_jungle/camo_daubs.png",
  patternScale: 1.65,
  ignoreWeaponSizeScale: false,
  colors: [
    [0.309804, 0.290196, 0.25098],
    [0.227451, 0.34902, 0.266667],
    [0.458824, 0.466667, 0.290196],
    [0.196078, 0.176471, 0.145098],
  ],
  patternGain: 1,
  paintRoughness: 0.6,
  paintMetalness: 0.12,
  maskMode: "spray",
  aliases: ["122", "jungle", "junglespray", "jungle-spray", "sp_spray_jungle", "丛林涂装"],
});

/**
 * Kit 14 / hy_ak47lam / style 2 Hydrographic.
 * Official film is a UV-atlas RGB *mask* (not a flat color and not a
 * pre-colored photo). Nested RGB of g_vColor0..3 from hy_ak47lam.vmat
 * already produces the wavy red/charcoal plywood — do not flatten
 * toward Color1. g_bIgnoreWeaponSizeScale = 1 (scale = patternScale).
 * HD UVs miss the atlas; grainWindow is the densest plywood rectangle
 * in laminate_ak47.png (512×256 @ 1040,1440, ~91% fill).
 */
export const KIT_RED_LAMINATE: ViewerKit = viewerKit(14, {
  slug: "redlaminate",
  patternPath: "/assets/paints/hy_ak47lam/laminate_ak47.png",
  patternScale: 1,
  ignoreWeaponSizeScale: true,
  colors: [
    [0.211765, 0.196078, 0.184314],
    [0.870588, 0.090196, 0.129412],
    [0.466667, 0.423529, 0.368627],
    [0.94902, 0.333333, 0.164706],
  ],
  patternGain: 1,
  paintRoughness: 0.45,
  paintMetalness: 0.08,
  maskMode: "furniture",
  grainWindow: LAMINATE_GRAIN,
  aliases: ["14", "redlam", "redlaminate", "red-laminate", "hy_ak47lam", "红色层压板"],
});

/**
 * Kit 72 / sp_mesh_tan / style 3 Spray-Paint.
 * Nested RGB of chainlink.png. Same spray mask as Jungle (wood +
 * receiver + mag). Tan / charcoal mesh from sp_mesh_tan.vmat.
 * F_PAINT_STYLE 2 (= items_game style 3), g_flPatternTexCoordScale 1.75.
 */
export const KIT_SAFARI_MESH: ViewerKit = viewerKit(72, {
  slug: "safarimesh",
  patternPath: "/assets/paints/sp_mesh_tan/chainlink.png",
  patternScale: 1.75,
  ignoreWeaponSizeScale: false,
  colors: [
    [0.42745, 0.411764, 0.329411],
    [0.074509, 0.078431, 0.082352],
    [0.30196, 0.313725, 0.262745],
    [0.286274, 0.278431, 0.219607],
  ],
  patternGain: 1,
  paintRoughness: 0.6,
  paintMetalness: 0.12,
  maskMode: "spray",
  aliases: ["72", "safari", "safarimesh", "safari-mesh", "sp_mesh_tan", "狩猎网格"],
});

/**
 * Kit 226 / hy_ak47lam_blue / style 2 Hydrographic.
 * Same official film as Red Laminate (laminate_ak47_psd_2ce8f5f0.vtex)
 * extracted from hy_ak47lam_blue.vmat — blue g_vColor0..3, not a
 * recolor of kit 14's ViewerKit. Furniture plywood, metal gunmetal.
 * Wear remap 0.02–0.4. Same grainWindow (same atlas).
 */
export const KIT_BLUE_LAMINATE: ViewerKit = viewerKit(226, {
  slug: "bluelaminate",
  patternPath: "/assets/paints/hy_ak47lam_blue/laminate_ak47.png",
  patternScale: 1,
  ignoreWeaponSizeScale: true,
  colors: [
    [0.207843, 0.196078, 0.192157],
    [0.133333, 0.337255, 0.745098],
    [0.592157, 0.537255, 0.498039],
    [0.352941, 0.701961, 0.921569],
  ],
  patternGain: 1,
  paintRoughness: 0.45,
  paintMetalness: 0.08,
  maskMode: "furniture",
  grainWindow: LAMINATE_GRAIN,
  aliases: ["226", "bluelam", "bluelaminate", "blue-laminate", "hy_ak47lam_blue", "蓝色层压板"],
});

/**
 * Kit 282 / cu_ak47_cobra / style 7 Custom Paint Job.
 * UV-authored full-color wrap (elegantredv1_1.png). Not nested RGB.
 * Receiver / metal only — furniture stays wood (Redline in-game intent).
 * F_PAINT_STYLE 6, F_ROUGHNESS_TEXTURE 1 (elegantredv1_1_rough.png),
 * g_bIgnoreWeaponSizeScale 1, g_flPaintMetalness 1.
 */
export const KIT_REDLINE: ViewerKit = viewerKit(282, {
  slug: "redline",
  patternPath: "/assets/paints/cu_ak47_cobra/elegantredv1_1.png",
  patternScale: 1,
  ignoreWeaponSizeScale: true,
  uvAligned: true,
  patternAsAlbedo: true,
  colors: [
    [1, 1, 1],
    [1, 1, 1],
    [1, 1, 1],
    [1, 1, 1],
  ],
  patternGain: 1,
  paintRoughness: 0.4,
  paintMetalness: 1,
  maskMode: "metal",
  roughnessPath: "/assets/paints/cu_ak47_cobra/elegantredv1_1_rough.png",
  aliases: ["282", "redline", "cobra", "cu_ak47_cobra", "红线"],
});

/**
 * Kit 456 / am_bamboo_jungle / style 5 Anodized Multicolored.
 * Nested RGB of bamboo_jungle.png + mask G/B overrides (same formula
 * as hydrographic). Anodized candy coat on metal (masks.r), not furniture.
 * F_PAINT_STYLE 4, g_bIgnoreWeaponSizeScale 1, scale 1.4, roughness 0.6,
 * g_flPearlescentScale 0 — chrome undercoat on wear, no pearlescence.
 */
export const KIT_HYDROPONIC: ViewerKit = viewerKit(456, {
  slug: "hydroponic",
  patternPath: "/assets/paints/am_bamboo_jungle/bamboo_jungle.png",
  patternScale: 1.4,
  ignoreWeaponSizeScale: true,
  colors: [
    [0.921569, 0.945098, 0.87451],
    [0.847059, 0.282353, 0.282353],
    [0.462745, 0.439216, 0.415686],
    [0.564706, 0.713726, 0.164706],
  ],
  patternGain: 1,
  paintRoughness: 0.6,
  paintMetalness: 0.88,
  maskMode: "metal",
  aliases: ["456", "hydroponic", "bamboo", "am_bamboo_jungle", "水栽竹"],
});

/**
 * Kit 524 / gs_ak47_supercharged / style 9 Gunsmith.
 * Custom-like albedo (ak47_supercharged.png) on all paintable parts.
 * F_OVERRIDE_NORMAL 1 wires ak47_supercharged_normal.png (real extra map).
 * Kit masks exist but are a decal/layout sheet, not a patina split — unused.
 * F_PAINT_STYLE 8, metalness 0, roughness 0.4. PearlescentScale 0.
 */
export const KIT_FUEL_INJECTOR: ViewerKit = viewerKit(524, {
  slug: "fuelinjector",
  patternPath: "/assets/paints/gs_ak47_supercharged/ak47_supercharged.png",
  patternScale: 1,
  ignoreWeaponSizeScale: true,
  uvAligned: true,
  patternAsAlbedo: true,
  colors: [
    [0.890196, 0.792157, 0.717647],
    [1, 1, 1],
    [1, 1, 1],
    [0.831373, 0.831373, 0.831373],
  ],
  patternGain: 1,
  paintRoughness: 0.4,
  paintMetalness: 0,
  maskMode: "spray",
  normalPath: "/assets/paints/gs_ak47_supercharged/ak47_supercharged_normal.png",
  aliases: ["524", "fuel", "fuelinjector", "fuel-injector", "gs_ak47_supercharged", "燃料喷射器"],
});

/**
 * Kit 639 / gs_ak47_bloodsport / style 9 Gunsmith.
 * Custom-like albedo (ak47_bloodsport.png) on all paintable parts.
 * F_PAINT_STYLE 8, g_flPaintMetalness 1, roughness 0.4, wear 0–0.45.
 */
export const KIT_BLOODSPORT: ViewerKit = viewerKit(639, {
  slug: "bloodsport",
  patternPath: "/assets/paints/gs_ak47_bloodsport/ak47_bloodsport.png",
  patternScale: 1,
  ignoreWeaponSizeScale: true,
  uvAligned: true,
  patternAsAlbedo: true,
  colors: [
    [1, 1, 1],
    [1, 1, 1],
    [0.843137, 0.827451, 0.827451],
    [0.698039, 0.756863, 0.917647],
  ],
  patternGain: 1,
  paintRoughness: 0.4,
  paintMetalness: 1,
  maskMode: "spray",
  aliases: ["639", "bloodsport", "gs_ak47_bloodsport", "血腥运动"],
});

/** M8 representative set: existing 3 + Safari / Blue Lam / Redline / Hydroponic / two gunsmiths. */
export const KITS: readonly ViewerKit[] = [
  KIT_CASE_HARDENED,
  KIT_JUNGLE_SPRAY,
  KIT_RED_LAMINATE,
  KIT_SAFARI_MESH,
  KIT_BLUE_LAMINATE,
  KIT_REDLINE,
  KIT_HYDROPONIC,
  KIT_FUEL_INJECTOR,
  KIT_BLOODSPORT,
];

export function kitLabel(kit: ViewerKit): string {
  return `${kit.nameEn} / ${kit.nameZh}`;
}

export function kitSeedOptions(kit: ViewerKit): SeedUvOptions {
  return {
    paintStyle: kit.style,
    patternScale: kit.patternScale,
    ignoreWeaponSizeScale: kit.ignoreWeaponSizeScale,
  };
}

/** True when the token names a viewer kit (index, slug, alias). Empty is not a match. */
export function isViewerKitQuery(query: string | null | undefined): boolean {
  if (query == null || query.trim() === "") return false;
  const q = query.trim().toLowerCase();
  return KITS.some(
    (k) =>
      k.slug === q ||
      String(k.paintIndex) === q ||
      k.internalName.toLowerCase() === q ||
      k.aliases.some((a) => a.toLowerCase() === q),
  );
}

export function resolveKit(query: string | null | undefined): ViewerKit {
  if (!isViewerKitQuery(query)) return KIT_CASE_HARDENED;
  const q = (query ?? "").trim().toLowerCase();
  return (
    KITS.find(
      (k) =>
        k.slug === q ||
        String(k.paintIndex) === q ||
        k.internalName.toLowerCase() === q ||
        k.aliases.some((a) => a.toLowerCase() === q),
    ) ?? KIT_CASE_HARDENED
  );
}

export function hasPaintPreview(paintIndex: number): boolean {
  return KITS.some((k) => k.paintIndex === paintIndex);
}

export function viewerKitFor(official: OfficialAk47Kit): ViewerKit | null {
  return KITS.find((k) => k.paintIndex === official.paint_index) ?? null;
}

export function officialKitLabel(kit: OfficialAk47Kit): string {
  return `${kit.name_en} / ${kit.name_zh}`;
}

function officialSearchHaystack(kit: OfficialAk47Kit): string {
  return [String(kit.paint_index), kit.name, kit.name_en, kit.name_zh, kit.name_zht ?? ""]
    .join("\n")
    .toLowerCase();
}

function officialExactTokens(kit: OfficialAk47Kit): string[] {
  return [String(kit.paint_index), kit.name, kit.name_en, kit.name_zh, kit.name_zht ?? ""]
    .filter((t) => t.length > 0)
    .map((t) => t.toLowerCase());
}

/** True when the token names an official AK-47 kit (index / internal / en / zh / zht). */
export function isOfficialAk47KitQuery(query: string | null | undefined): boolean {
  if (query == null || query.trim() === "") return false;
  const q = query.trim().toLowerCase();
  return OFFICIAL_AK47_KITS.some((k) => officialExactTokens(k).includes(q));
}

export function resolveOfficialAk47Kit(query: string | null | undefined): OfficialAk47Kit | undefined {
  if (!isOfficialAk47KitQuery(query)) return undefined;
  const q = (query ?? "").trim().toLowerCase();
  return OFFICIAL_AK47_KITS.find((k) => officialExactTokens(k).includes(q));
}

/** Case-insensitive substring match on paint index / internal name / en / zh / zht. */
export function filterOfficialKits(kits: readonly OfficialAk47Kit[], query: string): OfficialAk47Kit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...kits];
  return kits.filter((k) => officialSearchHaystack(k).includes(q));
}

/**
 * Clamp inspect float to the kit wear remap, unless unlock (then 0–1).
 * Wear remap is the visual band from items_game (not a new paint formula).
 *   https://www.counter-strike.net/workshop/workshopfinishes/
 */
export function clampFloatToKit(value: number, official: OfficialAk47Kit, unlock: boolean): number {
  const n = Number.isFinite(value) ? value : 0;
  const lo = unlock ? 0 : official.wear_remap_min_effective;
  const hi = unlock ? 1 : official.wear_remap_max_effective;
  return Math.min(hi, Math.max(lo, n));
}

export function formatWearRange(kit: OfficialAk47Kit): string {
  const fmt = (n: number): string => {
    if (n === 0) return "0";
    if (n === 1) return "1";
    const rounded = Math.round(n * 1e4) / 1e4;
    return String(rounded);
  };
  return `${fmt(kit.wear_remap_min_effective)}–${fmt(kit.wear_remap_max_effective)}`;
}

/**
 * Kit 38 / aa_fade / style 6 Anodized Airbrushed. Glock-18 only.
 * vmat F_PAINT_STYLE 5, g_tPattern fade.png (wavy 1D color ramp),
 * g_vColor0..3 silver / gold / pink / purple, ignoreWeaponSizeScale,
 * roughness 0.25, offset [-0.7,-0.7], rotation -55, pearlescent 0.
 * Workshop: gradient along the weapon. M12: community fade % 80–100
 * from seed rotation (not a Skincraft LUT).
 *   https://www.counter-strike.net/workshop/workshopfinishes/
 *   https://skinport.com/blog/csgo-fade-percentage-update
 * Do not add this row to KITS / AK catalog.
 */
export const KIT_FADE: ViewerKit = viewerKitFromRow(officialGlockKit(38), {
  slug: "fade",
  patternPath: "/assets/paints/aa_fade/fade.png",
  patternScale: 1,
  ignoreWeaponSizeScale: true,
  colors: [
    [0.862745, 0.827451, 0.807843],
    [0.988235, 0.701961, 0.396078],
    [0.945098, 0.337255, 0.458824],
    [0.435294, 0.482353, 0.854902],
  ],
  patternGain: 1,
  paintRoughness: 0.25,
  paintMetalness: 0.92,
  maskMode: "metal",
  aliases: ["38", "fade", "aa_fade", "渐变之色", "漸層彩虹"],
});

/**
 * Kit 3 / so_red / style 1 Solid Color. Glock-18 Candy Apple / 红苹果.
 * so_red.vmat has no g_tPattern, no F_PAINT_STYLE (solid default),
 * g_flPearlescentScale 0 — truly solid Color1, not anodized/pearl.
 * Deepen Hydroponic (style 5) for candy-over-chrome instead.
 */
export const KIT_CANDY_APPLE: ViewerKit = viewerKitFromRow(officialGlockKit(3), {
  slug: "candyapple",
  patternPath: "/assets/paints/so_red/solid.png",
  patternScale: 1,
  ignoreWeaponSizeScale: true,
  colors: [
    [0.290196, 0.290196, 0.290196],
    [0.741176, 0.168627, 0.168627],
    [0.290196, 0.290196, 0.290196],
    [0.290196, 0.290196, 0.290196],
  ],
  patternGain: 1,
  paintRoughness: 0.4,
  paintMetalness: 0.22,
  maskMode: "metal",
  aliases: ["3", "candy", "candyapple", "candy-apple", "so_red", "红苹果"],
});

/** Glock live set (M11). Not merged into KITS — kit=38 on AK must stay rejected. */
export const GLOCK_KITS: readonly ViewerKit[] = [KIT_FADE, KIT_CANDY_APPLE];

export function liveKitsFor(weapon: ViewerWeapon): readonly ViewerKit[] {
  return weapon === WEAPON_GLOCK ? GLOCK_KITS : KITS;
}

export function hasPaintPreviewOn(weapon: ViewerWeapon, paintIndex: number): boolean {
  return liveKitsFor(weapon).some((k) => k.paintIndex === paintIndex);
}

export function viewerKitForWeapon(weapon: ViewerWeapon, official: OfficialKit): ViewerKit | null {
  return liveKitsFor(weapon).find((k) => k.paintIndex === official.paint_index) ?? null;
}

function officialExactTokensOn(kit: OfficialKit): string[] {
  return [String(kit.paint_index), kit.name, kit.name_en, kit.name_zh, kit.name_zht ?? ""]
    .filter((t) => t.length > 0)
    .map((t) => t.toLowerCase());
}

export function isOfficialGlockKitQuery(query: string | null | undefined): boolean {
  if (query == null || query.trim() === "") return false;
  const q = query.trim().toLowerCase();
  return OFFICIAL_GLOCK_KITS.some((k) => officialExactTokensOn(k).includes(q));
}

export function resolveOfficialGlockKit(query: string | null | undefined): OfficialKit | undefined {
  if (!isOfficialGlockKitQuery(query)) return undefined;
  const q = (query ?? "").trim().toLowerCase();
  return OFFICIAL_GLOCK_KITS.find((k) => officialExactTokensOn(k).includes(q));
}

export function isOfficialKitQueryOn(weapon: ViewerWeapon, query: string | null | undefined): boolean {
  return weapon === WEAPON_GLOCK ? isOfficialGlockKitQuery(query) : isOfficialAk47KitQuery(query);
}

export function resolveOfficialKitOn(weapon: ViewerWeapon, query: string | null | undefined): OfficialKit | undefined {
  return weapon === WEAPON_GLOCK ? resolveOfficialGlockKit(query) : resolveOfficialAk47Kit(query);
}

export function isGlockViewerKitQuery(query: string | null | undefined): boolean {
  if (query == null || query.trim() === "") return false;
  const q = query.trim().toLowerCase();
  return GLOCK_KITS.some(
    (k) =>
      k.slug === q ||
      String(k.paintIndex) === q ||
      k.internalName.toLowerCase() === q ||
      k.aliases.some((a) => a.toLowerCase() === q),
  );
}

export function resolveGlockKit(query: string | null | undefined): ViewerKit {
  if (!isGlockViewerKitQuery(query)) return KIT_FADE;
  const q = (query ?? "").trim().toLowerCase();
  return (
    GLOCK_KITS.find(
      (k) =>
        k.slug === q ||
        String(k.paintIndex) === q ||
        k.internalName.toLowerCase() === q ||
        k.aliases.some((a) => a.toLowerCase() === q),
    ) ?? KIT_FADE
  );
}

export function defaultOfficialFor(weapon: ViewerWeapon): OfficialKit {
  return weapon === WEAPON_GLOCK ? officialGlockKit(38) : officialKit(44);
}
