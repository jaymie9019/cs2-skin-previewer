import { describe, expect, it } from "vitest";
import allStickers from "../../../../data/stickers.json";
import {
  EXTRACTED_STICKERS,
  extractedSticker,
  filterStickers,
  isExtractedStickerId,
  type StickerLookupRow,
} from "./catalog";

const rows = allStickers as StickerLookupRow[];

describe("filterStickers (M10 catalog picker)", () => {
  it("matches English / 中文 / id / internal name", () => {
    const byEn = filterStickers(rows, "dinked");
    expect(byEn.some((r) => r.id === 259)).toBe(true);
    expect(byEn.find((r) => r.id === 259)?.name_en).toBe("Dinked");
    expect(byEn.find((r) => r.id === 259)?.name_zh).toBe("射穿啦");

    const byZh = filterStickers(rows, "射穿");
    expect(byZh).toHaveLength(1);
    expect(byZh[0].id).toBe(259);

    const byId = filterStickers(rows, "259");
    expect(byId.some((r) => r.id === 259)).toBe(true);

    const byInternal = filterStickers(rows, "community02/dinked");
    expect(byInternal.some((r) => r.id === 259)).toBe(true);
  });

  it("matches Aces High en + 中文 and Lucky 13", () => {
    const aces = filterStickers(rows, "aces high");
    expect(aces.some((r) => r.id === 14)).toBe(true);
    expect(aces.some((r) => r.id === 15)).toBe(true);

    const zh = filterStickers(rows, "黑桃");
    expect(zh.some((r) => r.id === 14)).toBe(true);

    const lucky = filterStickers(rows, "幸运十三");
    expect(lucky.some((r) => r.id === 13)).toBe(true);
  });

  it("excludes id 0 and returns the catalog on an empty query", () => {
    const empty = filterStickers(rows, "");
    expect(empty.every((r) => r.id > 0)).toBe(true);
    expect(empty.length).toBeGreaterThan(10000);
    expect(empty.length).toBe(rows.filter((r) => r.id > 0).length);
    expect(filterStickers(rows, "   ").length).toBe(empty.length);
  });

  it("does not invent an extracted texture for catalog-only ids", () => {
    const shooter = filterStickers(rows, "射手");
    expect(shooter.some((r) => r.id === 1)).toBe(true);
    expect(extractedSticker(1)).toBeUndefined();
    expect(isExtractedStickerId(1)).toBe(false);
    expect(isExtractedStickerId(259)).toBe(true);
    expect(EXTRACTED_STICKERS.map((s) => s.id).sort()).toEqual([13, 14, 15, 259, 278]);
  });
});
