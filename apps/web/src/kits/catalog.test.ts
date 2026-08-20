import { describe, expect, it } from "vitest";
import {
  KIT_CASE_HARDENED,
  KIT_JUNGLE_SPRAY,
  KIT_RED_LAMINATE,
  KITS,
  OFFICIAL_AK47_KITS,
  kitLabel,
  kitSeedOptions,
  officialKit,
  isViewerKitQuery,
  resolveKit,
} from "./catalog";
import { AK47_WEAPON_LENGTH, baseScaleForStyle, seedToPatternUv } from "../seed/seedToPatternUv";

describe("official AK-47 catalog (items_game JSON)", () => {
  it("imports 61 official kits and has no Fade / 渐变之色", () => {
    expect(OFFICIAL_AK47_KITS).toHaveLength(61);
    const names = OFFICIAL_AK47_KITS.map((k) => k.name_en.toLowerCase());
    expect(names).not.toContain("fade");
    expect(OFFICIAL_AK47_KITS.some((k) => k.name_zh === "渐变之色")).toBe(false);
    expect(OFFICIAL_AK47_KITS.some((k) => k.paint_index === 38)).toBe(false);
    expect(OFFICIAL_AK47_KITS.some((k) => k.name === "aa_fade")).toBe(false);
  });

  it("viewer kits must exist in the official JSON", () => {
    for (const kit of KITS) {
      const row = officialKit(kit.paintIndex);
      expect(row.name_en).toBe(kit.nameEn);
      expect(row.name_zh).toBe(kit.nameZh);
      expect(row.style).toBe(kit.style);
      expect(row.name).toBe(kit.internalName);
    }
  });
});

describe("resolveKit (query kit=)", () => {
  it("defaults to Case Hardened", () => {
    expect(resolveKit(undefined)).toBe(KIT_CASE_HARDENED);
    expect(resolveKit("")).toBe(KIT_CASE_HARDENED);
    expect(resolveKit("nope")).toBe(KIT_CASE_HARDENED);
    expect(resolveKit("fade")).toBe(KIT_CASE_HARDENED);
    expect(resolveKit("38")).toBe(KIT_CASE_HARDENED);
  });

  it("accepts paint index, slug, and loc aliases", () => {
    expect(resolveKit("44")).toBe(KIT_CASE_HARDENED);
    expect(resolveKit("casehardened")).toBe(KIT_CASE_HARDENED);
    expect(resolveKit("122")).toBe(KIT_JUNGLE_SPRAY);
    expect(resolveKit("junglespray")).toBe(KIT_JUNGLE_SPRAY);
    expect(resolveKit("sp_spray_jungle")).toBe(KIT_JUNGLE_SPRAY);
    expect(resolveKit("14")).toBe(KIT_RED_LAMINATE);
    expect(resolveKit("redlaminate")).toBe(KIT_RED_LAMINATE);
    expect(resolveKit("hy_ak47lam")).toBe(KIT_RED_LAMINATE);
  });
});

describe("M4 kit catalog (three official AK kits, distinct styles)", () => {
  it("has exactly three official kits with distinct styles", () => {
    expect(KITS).toHaveLength(3);
    expect(new Set(KITS.map((k) => k.style)).size).toBe(3);
    expect(KIT_CASE_HARDENED.style).toBe(8);
    expect(KIT_JUNGLE_SPRAY.style).toBe(3);
    expect(KIT_RED_LAMINATE.style).toBe(2);
    expect(KIT_CASE_HARDENED.maskMode).toBe("metal");
    expect(KIT_JUNGLE_SPRAY.maskMode).toBe("spray");
    expect(KIT_RED_LAMINATE.maskMode).toBe("furniture");
  });

  it("labels use English + 中文 from the JSON", () => {
    expect(kitLabel(KIT_CASE_HARDENED)).toBe("Case Hardened / 表面淬火");
    expect(kitLabel(KIT_JUNGLE_SPRAY)).toBe("Jungle Spray / 丛林涂装");
    expect(kitLabel(KIT_RED_LAMINATE)).toBe("Red Laminate / 红色层压板");
  });

  it("switching kit changes style, pattern path, colors, and mask", () => {
    expect(KIT_JUNGLE_SPRAY.patternPath).not.toBe(KIT_CASE_HARDENED.patternPath);
    expect(KIT_RED_LAMINATE.patternPath).not.toBe(KIT_CASE_HARDENED.patternPath);
    expect(KIT_JUNGLE_SPRAY.colors[0]).not.toEqual(KIT_CASE_HARDENED.colors[0]);
    expect(KIT_RED_LAMINATE.colors[1]).not.toEqual(KIT_JUNGLE_SPRAY.colors[1]);
    expect(KIT_JUNGLE_SPRAY.maskMode).not.toBe(KIT_CASE_HARDENED.maskMode);
    expect(KIT_RED_LAMINATE.maskMode).not.toBe(KIT_JUNGLE_SPRAY.maskMode);
  });
});

describe("kit seed UV (reuse M2 RNG, style-correct scale)", () => {
  it("Case Hardened still uses AK UVScale (regression)", () => {
    const uv = seedToPatternUv(661, kitSeedOptions(KIT_CASE_HARDENED));
    expect(uv.pattern.translateX).toBeCloseTo(0.316, 2);
    expect(uv.pattern.translateY).toBeCloseTo(0.487, 2);
    expect(uv.pattern.rotationDeg).toBeCloseTo(105.373, 2);
    expect(uv.baseScale).toBeCloseTo(0.549, 5);
  });

  it("Jungle Spray (style 3) uses weapon_length/36 * patternScale", () => {
    const expected = (AK47_WEAPON_LENGTH / 36) * KIT_JUNGLE_SPRAY.patternScale;
    expect(baseScaleForStyle(kitSeedOptions(KIT_JUNGLE_SPRAY))).toBeCloseTo(expected, 8);
    const a = seedToPatternUv(923, kitSeedOptions(KIT_JUNGLE_SPRAY));
    const b = seedToPatternUv(923, kitSeedOptions(KIT_CASE_HARDENED));
    expect(a.pattern.scale).not.toBeCloseTo(b.pattern.scale, 5);
  });

  it("Red Laminate ignoreWeaponSizeScale uses patternScale 1", () => {
    expect(baseScaleForStyle(kitSeedOptions(KIT_RED_LAMINATE))).toBe(1);
    const uv = seedToPatternUv(14, kitSeedOptions(KIT_RED_LAMINATE));
    expect(uv.baseScale).toBe(1);
  });

  it("same seed stays bit-identical per kit", () => {
    const a = seedToPatternUv(412, kitSeedOptions(KIT_JUNGLE_SPRAY));
    const b = seedToPatternUv(412, kitSeedOptions(KIT_JUNGLE_SPRAY));
    expect(a.pattern.rotationDeg).toBe(b.pattern.rotationDeg);
    expect(a.wear.scale).toBe(b.wear.scale);
  });
});

describe("kit 14 Red Laminate extras (vmat + grain window)", () => {
  it("keeps official vmat colors / scale / ignoreWeaponSizeScale", () => {
    expect(KIT_RED_LAMINATE.patternScale).toBe(1);
    expect(KIT_RED_LAMINATE.ignoreWeaponSizeScale).toBe(true);
    expect(KIT_RED_LAMINATE.colors[0][0]).toBeCloseTo(0.211765, 5);
    expect(KIT_RED_LAMINATE.colors[1][0]).toBeCloseTo(0.870588, 5);
    expect(KIT_RED_LAMINATE.colors[1][1]).toBeCloseTo(0.090196, 5);
    expect(KIT_RED_LAMINATE.maskMode).toBe("furniture");
  });

  it("samples a dense plywood window, not the empty UV-atlas border", () => {
    const w = KIT_RED_LAMINATE.grainWindow;
    expect(w).not.toBeNull();
    expect(w!.size[0]).toBeGreaterThan(0.1);
    expect(w!.size[1]).toBeGreaterThan(0.05);
    expect(w!.origin[0] + w!.size[0]).toBeLessThanOrEqual(1);
    expect(w!.origin[1] + w!.size[1]).toBeLessThanOrEqual(1);
    expect(w!.tile).toBeGreaterThanOrEqual(1);
    expect(KIT_CASE_HARDENED.grainWindow).toBeNull();
    expect(KIT_JUNGLE_SPRAY.grainWindow).toBeNull();
  });
});

describe("kit 14 seed 796 (ignoreWeaponSizeScale)", () => {
  it("is bit-identical and uses patternScale 1", () => {
    const a = seedToPatternUv(796, kitSeedOptions(KIT_RED_LAMINATE));
    const b = seedToPatternUv(796, kitSeedOptions(KIT_RED_LAMINATE));
    expect(a.baseScale).toBe(1);
    expect(a.pattern.translateX).toBe(b.pattern.translateX);
    expect(a.pattern.rotationDeg).toBe(b.pattern.rotationDeg);
    expect(a.wear.matrix.tx).toBe(b.wear.matrix.tx);
    expect(a.wear.matrix.ty).toBe(b.wear.matrix.ty);
  });

  it("seed 796 wear offset differs from seed 0 (grain shift source)", () => {
    const a = seedToPatternUv(796, kitSeedOptions(KIT_RED_LAMINATE));
    const b = seedToPatternUv(0, kitSeedOptions(KIT_RED_LAMINATE));
    expect(a.wear.matrix.tx === b.wear.matrix.tx && a.wear.matrix.ty === b.wear.matrix.ty).toBe(false);
  });
});

describe("isViewerKitQuery", () => {
  it("accepts viewer kits and rejects Fade / unknown", () => {
    expect(isViewerKitQuery("44")).toBe(true);
    expect(isViewerKitQuery("redlaminate")).toBe(true);
    expect(isViewerKitQuery("")).toBe(false);
    expect(isViewerKitQuery("fade")).toBe(false);
    expect(isViewerKitQuery("38")).toBe(false);
  });
});
