import { describe, expect, it } from "vitest";
import {
  GLOCK_KITS,
  KIT_CANDY_APPLE,
  KIT_FADE,
  KITS,
  OFFICIAL_AK47_KITS,
  OFFICIAL_GLOCK_KITS,
  hasPaintPreview,
  hasPaintPreviewOn,
  isOfficialAk47KitQuery,
  isOfficialGlockKitQuery,
  officialGlockKit,
  officialKit,
} from "./catalog";

describe("official Glock-18 catalog (items_game JSON)", () => {
  it("includes kit 38 Fade / 渐变之色 and is not empty", () => {
    expect(OFFICIAL_GLOCK_KITS.length).toBeGreaterThanOrEqual(40);
    const fade = OFFICIAL_GLOCK_KITS.find((k) => k.paint_index === 38);
    expect(fade).toBeDefined();
    expect(fade?.name).toBe("aa_fade");
    expect(fade?.name_en).toBe("Fade");
    expect(fade?.name_zh).toBe("渐变之色");
    expect(fade?.style).toBe(6);
    expect(fade?.style_name).toBe("Anodized Airbrushed");
    expect(officialGlockKit(38).name_en).toBe("Fade");
  });

  it("does not require AK-47 to gain Fade", () => {
    expect(OFFICIAL_AK47_KITS).toHaveLength(61);
    expect(OFFICIAL_AK47_KITS.some((k) => k.paint_index === 38)).toBe(false);
    expect(OFFICIAL_AK47_KITS.some((k) => k.name_en.toLowerCase() === "fade")).toBe(false);
    expect(OFFICIAL_AK47_KITS.some((k) => k.name_zh === "渐变之色")).toBe(false);
    expect(KITS.some((k) => k.paintIndex === 38)).toBe(false);
    expect(hasPaintPreview(38)).toBe(false);
    expect(isOfficialAk47KitQuery("38")).toBe(false);
    expect(isOfficialAk47KitQuery("fade")).toBe(false);
  });

  it("Case Hardened 44 is not an official Glock pairing", () => {
    expect(OFFICIAL_GLOCK_KITS.some((k) => k.paint_index === 44)).toBe(false);
    expect(isOfficialGlockKitQuery("44")).toBe(false);
    expect(() => officialKit(38)).toThrow();
  });
});

describe("Glock live kits (Fade + Candy Apple)", () => {
  it("has at least two live kits including Fade", () => {
    expect(GLOCK_KITS.length).toBeGreaterThanOrEqual(2);
    expect(KIT_FADE.paintIndex).toBe(38);
    expect(KIT_FADE.style).toBe(6);
    expect(KIT_FADE.maskMode).toBe("metal");
    expect(KIT_CANDY_APPLE.paintIndex).toBe(3);
    expect(KIT_CANDY_APPLE.style).toBe(1);
    expect(hasPaintPreviewOn("glock", 38)).toBe(true);
    expect(hasPaintPreviewOn("glock", 3)).toBe(true);
    expect(hasPaintPreviewOn("ak47", 38)).toBe(false);
    expect(hasPaintPreviewOn("glock", 44)).toBe(false);
  });

  it("Fade wear remap is 0–0.08 from items_game", () => {
    expect(KIT_FADE.wearRemapMin).toBeCloseTo(0, 8);
    expect(KIT_FADE.wearRemapMax).toBeCloseTo(0.08, 8);
  });
});
