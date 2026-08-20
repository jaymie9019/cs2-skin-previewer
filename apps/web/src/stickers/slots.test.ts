import { describe, expect, it } from "vitest";
import {
  EMPTY_SLOT,
  MAX_STICKER_LAYERS,
  emptySlots,
  isEmptySlot,
  parseSlotValue,
  parseStickerQuery,
  sameSlots,
  serializeSlot,
} from "./slots";
import { stickerWearAlpha } from "./wearMix";
import { AK47_STICKER_MARKUP, slotCenterUv1, stickerUv, stickerUvInside } from "./uv";
import { EXTRACTED_STICKERS, extractedSticker, lookupStickerRow, stickerLabel } from "./catalog";
import allStickers from "../../../../data/stickers.json";

describe("MAX_STICKER_LAYERS (product = 4, not items_game 5)", () => {
  it("caps at 4 and rejects s4 / s5", () => {
    expect(MAX_STICKER_LAYERS).toBe(4);
    const q = parseStickerQuery(new URLSearchParams("s0=259&s1=14&s2=15&s3=13&s4=278&s5=1"));
    expect(q.slots).toHaveLength(4);
    expect(q.slots.map((s) => s.id)).toEqual([259, 14, 15, 13]);
    expect(q.rejected.sort()).toEqual(["s4", "s5"]);
  });
});

describe("empty slot is a no-op", () => {
  it("id 0 / omit / invalid parse to EMPTY_SLOT", () => {
    expect(parseSlotValue(null)).toEqual(EMPTY_SLOT);
    expect(parseSlotValue("")).toEqual(EMPTY_SLOT);
    expect(parseSlotValue("0")).toEqual(EMPTY_SLOT);
    expect(parseSlotValue("nope")).toEqual(EMPTY_SLOT);
    expect(isEmptySlot(EMPTY_SLOT)).toBe(true);
    expect(serializeSlot(EMPTY_SLOT)).toBeNull();
  });

  it("empty slots do not change UV or wear", () => {
    const slots = emptySlots();
    expect(slots.every(isEmptySlot)).toBe(true);
    const a = stickerWearAlpha(1, 1, 0.2, slots[0].wear);
    const b = stickerWearAlpha(1, 1, 0.2, 0);
    expect(a).toBe(b);
  });
});

describe("query sN=id,x,y,rot,wear", () => {
  it("accepts id-only and the full 5-tuple", () => {
    expect(parseSlotValue("259")).toEqual({
      id: 259,
      offsetX: 0,
      offsetY: 0,
      rotationDeg: 0,
      wear: 0,
    });
    const full = parseSlotValue("14,0.02,-0.01,15,0.4");
    expect(full.id).toBe(14);
    expect(full.offsetX).toBeCloseTo(0.02, 8);
    expect(full.offsetY).toBeCloseTo(-0.01, 8);
    expect(full.rotationDeg).toBeCloseTo(15, 8);
    expect(full.wear).toBeCloseTo(0.4, 8);
  });

  it("same sticker+transform is bit-identical (parse + UV + wear)", () => {
    const raw = "s0=259,0.03,-0.02,25,0.35&s1=14,0,0,0,0";
    const a = parseStickerQuery(new URLSearchParams(raw));
    const b = parseStickerQuery(new URLSearchParams(raw));
    expect(sameSlots(a.slots, b.slots)).toBe(true);
    const uvA = stickerUv([0.65, 0.07], 0, a.slots[0]);
    const uvB = stickerUv([0.65, 0.07], 0, b.slots[0]);
    expect(uvA).toEqual(uvB);
    expect(stickerWearAlpha(0.9, 0.8, 0.3, a.slots[0].wear)).toBe(
      stickerWearAlpha(0.9, 0.8, 0.3, b.slots[0].wear),
    );
  });

  it("serializes id-only when transforms are zero", () => {
    expect(serializeSlot(parseSlotValue("259"))).toBe("259");
  });
});

describe("AK sticker UV (TEXCOORD_1 + StickerMarkup)", () => {
  it("has four HD slots; slot 0 Autograph offset matches vmat", () => {
    expect(AK47_STICKER_MARKUP).toHaveLength(4);
    expect(AK47_STICKER_MARKUP[0].offset[0]).toBeCloseTo(0.148, 5);
    expect(AK47_STICKER_MARKUP[0].offset[1]).toBeCloseTo(-0.434, 5);
    expect(AK47_STICKER_MARKUP[3].scale).toBeCloseTo(14.7, 5);
  });

  it("slot center maps to sticker UV 0.5, 0.5", () => {
    for (let i = 0; i < 4; i++) {
      const c = slotCenterUv1(i);
      const uv = stickerUv(c, i, { offsetX: 0, offsetY: 0, rotationDeg: 0 });
      expect(uv[0]).toBeCloseTo(0.5, 8);
      expect(uv[1]).toBeCloseTo(0.5, 8);
      expect(stickerUvInside(uv)).toBe(true);
    }
  });

  it("user offset shifts UV; rotation 180 flips around center", () => {
    const c = slotCenterUv1(0);
    const shifted = stickerUv(c, 0, { offsetX: 0.01, offsetY: 0, rotationDeg: 0 });
    expect(shifted[0]).not.toBeCloseTo(0.5, 3);
    const flipped = stickerUv([c[0] + 0.01, c[1]], 0, { offsetX: 0, offsetY: 0, rotationDeg: 180 });
    const unflipped = stickerUv([c[0] + 0.01, c[1]], 0, { offsetX: 0, offsetY: 0, rotationDeg: 0 });
    expect(flipped[0]).toBeCloseTo(1 - unflipped[0], 6);
    expect(flipped[1]).toBeCloseTo(1 - unflipped[1], 6);
  });
});

describe("extracted subset + stickers.json lookup", () => {
  it("includes Dinked 259 and a holo", () => {
    expect(extractedSticker(259)?.nameEn).toBe("Dinked");
    expect(extractedSticker(259)?.nameZh).toBe("射穿啦");
    expect(EXTRACTED_STICKERS.some((s) => s.style === "holo")).toBe(true);
    expect(stickerLabel(extractedSticker(259)!)).toBe("Dinked / 射穿啦");
  });

  it("looks up any kit id against the full catalog", () => {
    const rows = allStickers as Array<{
      id: number;
      name: string;
      name_en: string;
      name_zh: string;
      sticker_material: string | null;
    }>;
    expect(rows.length).toBeGreaterThan(10000);
    const dinked = lookupStickerRow(rows, 259);
    expect(dinked?.name_en).toBe("Dinked");
    expect(dinked?.sticker_material).toBe("community02/dinked");
    expect(lookupStickerRow(rows, 14)?.name_en).toBe("Aces High");
  });
});
