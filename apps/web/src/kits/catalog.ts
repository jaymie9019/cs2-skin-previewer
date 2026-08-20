/**
 * AK-47 viewer kits (M4). Official records come from
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

export type OfficialAk47Kit = {
  paint_index: number;
  name: string;
  name_en: string;
  name_zh: string;
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
  colors: readonly [Rgb, Rgb, Rgb, Rgb];
  patternGain: number;
  paintRoughness: number;
  paintMetalness: number;
  maskMode: MaskMode;
  grainWindow: GrainWindow | null;
  aliases: readonly string[];
};

const SHARED_WEAR = "/assets/paints/aq_oiled/paint_wear.png";
const SHARED_GRUNGE = "/assets/paints/aq_oiled/gun_grunge.png";

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

function viewerKit(
  paintIndex: number,
  extras: {
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
    aliases: readonly string[];
  },
): ViewerKit {
  const row = officialKit(paintIndex);
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
    colors: extras.colors,
    patternGain: extras.patternGain,
    paintRoughness: extras.paintRoughness,
    paintMetalness: extras.paintMetalness,
    maskMode: extras.maskMode,
    grainWindow: extras.grainWindow ?? null,
    aliases: extras.aliases,
  };
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
  grainWindow: {
    origin: [1040 / 2048, 1440 / 2048],
    size: [512 / 2048, 256 / 2048],
    tile: 2,
  },
  aliases: ["14", "redlam", "redlaminate", "red-laminate", "hy_ak47lam", "红色层压板"],
});

/** Exactly the three M4 viewer kits, all from the official AK-47 catalog. */
export const KITS: readonly ViewerKit[] = [KIT_CASE_HARDENED, KIT_JUNGLE_SPRAY, KIT_RED_LAMINATE];

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
