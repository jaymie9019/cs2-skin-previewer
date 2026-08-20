import { describe, expect, it } from "vitest";
import {
  KITS,
  OFFICIAL_AK47_KITS,
  clampFloatToKit,
  filterOfficialKits,
  hasPaintPreview,
  isOfficialAk47KitQuery,
  officialKit,
  resolveOfficialAk47Kit,
  viewerKitFor,
} from "./catalog";

describe("official AK-47 catalog search / wear (M7)", () => {
  it("has 61 official kits and no Fade / 渐变之色", () => {
    expect(OFFICIAL_AK47_KITS).toHaveLength(61);
    expect(OFFICIAL_AK47_KITS.some((k) => k.name_en.toLowerCase() === "fade")).toBe(false);
    expect(OFFICIAL_AK47_KITS.some((k) => k.name_zh === "渐变之色")).toBe(false);
    expect(KITS).toHaveLength(3);
  });

  it("filterOfficialKits matches en / zh / index / internal", () => {
    const jungle = filterOfficialKits(OFFICIAL_AK47_KITS, "丛林");
    expect(jungle).toHaveLength(1);
    expect(jungle[0].name_en).toBe("Jungle Spray");
    expect(jungle[0].name_zh).toBe("丛林涂装");

    const blue = filterOfficialKits(OFFICIAL_AK47_KITS, "226");
    expect(blue).toHaveLength(1);
    expect(blue[0].name_en).toBe("Blue Laminate");

    const redline = filterOfficialKits(OFFICIAL_AK47_KITS, "redline");
    expect(redline).toHaveLength(1);
    expect(redline[0].paint_index).toBe(282);

    expect(filterOfficialKits(OFFICIAL_AK47_KITS, "渐变之色")).toEqual([]);
  });

  it("clampFloatToKit respects Blue Laminate / Redline remaps and unlock", () => {
    const blue = officialKit(226);
    expect(blue.wear_remap_min_effective).toBeCloseTo(0.02, 8);
    expect(blue.wear_remap_max_effective).toBeCloseTo(0.4, 8);
    expect(clampFloatToKit(0.9, blue, false)).toBeCloseTo(0.4, 8);
    expect(clampFloatToKit(0.01, blue, false)).toBeCloseTo(0.02, 8);
    expect(clampFloatToKit(0.2, blue, false)).toBeCloseTo(0.2, 8);
    expect(clampFloatToKit(0.9, blue, true)).toBeCloseTo(0.9, 8);
    expect(clampFloatToKit(-0.1, blue, true)).toBe(0);

    const redline = officialKit(282);
    expect(redline.wear_remap_min_effective).toBeCloseTo(0.1, 8);
    expect(redline.wear_remap_max_effective).toBeCloseTo(0.7, 8);
    expect(clampFloatToKit(0.05, redline, false)).toBeCloseTo(0.1, 8);
    expect(clampFloatToKit(0.95, redline, false)).toBeCloseTo(0.7, 8);
    expect(clampFloatToKit(0.95, redline, true)).toBeCloseTo(0.95, 8);

    const bloodsport = officialKit(639);
    expect(clampFloatToKit(0.8, bloodsport, false)).toBeCloseTo(0.45, 8);
  });

  it("hasPaintPreview / viewerKitFor only for 14 / 44 / 122", () => {
    expect(hasPaintPreview(14)).toBe(true);
    expect(hasPaintPreview(44)).toBe(true);
    expect(hasPaintPreview(122)).toBe(true);
    expect(hasPaintPreview(72)).toBe(false);
    expect(hasPaintPreview(226)).toBe(false);
    expect(viewerKitFor(officialKit(44))?.paintIndex).toBe(44);
    expect(viewerKitFor(officialKit(72))).toBeNull();
  });

  it("isOfficialAk47KitQuery accepts listed kits and rejects Fade", () => {
    expect(isOfficialAk47KitQuery("72")).toBe(true);
    expect(isOfficialAk47KitQuery("Safari Mesh")).toBe(true);
    expect(isOfficialAk47KitQuery("狩猎网格")).toBe(true);
    expect(isOfficialAk47KitQuery("226")).toBe(true);
    expect(isOfficialAk47KitQuery("fade")).toBe(false);
    expect(isOfficialAk47KitQuery("38")).toBe(false);
    expect(isOfficialAk47KitQuery("999")).toBe(false);
    expect(resolveOfficialAk47Kit("72")?.name_en).toBe("Safari Mesh");
    expect(resolveOfficialAk47Kit("fade")).toBeUndefined();
  });
});
