import { describe, expect, it } from "vitest";
import { paperBackingMix, stickerCoverage, stickerWearAlpha } from "./wearMix";

describe("sticker wear (approximate engine-applied)", () => {
  it("dark wear-mask silhouette still counts as coverage", () => {
    expect(stickerCoverage(0)).toBe(0);
    expect(stickerCoverage(0.2)).toBeGreaterThan(0.9);
  });

  it("wear 0 keeps full coverage (UnWear unused)", () => {
    expect(stickerWearAlpha(1, 0.2, 0.8, 0)).toBeCloseTo(1, 8);
    expect(stickerWearAlpha(0.4, 1, 1, 0)).toBeCloseTo(0.4, 8);
  });

  it("wear 1 erodes alpha; UnWear protects", () => {
    const exposed = stickerWearAlpha(1, 0, 1, 1);
    const protectedArea = stickerWearAlpha(1, 1, 1, 1);
    expect(exposed).toBeLessThan(0.15);
    expect(protectedArea).toBeGreaterThan(exposed);
  });

  it("same inputs are bit-identical", () => {
    const a = stickerWearAlpha(0.85, 0.4, 0.55, 0.62);
    const b = stickerWearAlpha(0.85, 0.4, 0.55, 0.62);
    expect(a).toBe(b);
  });

  it("paper backing tints toward beige as wear rises", () => {
    const print: [number, number, number] = [0.1, 0.2, 0.9];
    const fn = paperBackingMix(print, 0);
    const bs = paperBackingMix(print, 1);
    expect(fn).toEqual(print);
    expect(bs[0]).toBeGreaterThan(fn[0]);
    expect(bs[2]).toBeLessThan(fn[2]);
  });
});
