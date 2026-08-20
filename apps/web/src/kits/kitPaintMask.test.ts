import { describe, expect, it } from "vitest";
import { kitPaintMask } from "./kitPaintMask";

describe("per-kit paint mask (not global)", () => {
  it("Case Hardened metal-only: wood off, metal on", () => {
    expect(kitPaintMask("metal", 0, 0)).toBe(0);
    expect(kitPaintMask("metal", 1, 0)).toBe(1);
    expect(kitPaintMask("metal", 1, 1)).toBe(0);
  });

  it("Jungle Spray paints furniture AND metal (not the CH mask)", () => {
    expect(kitPaintMask("spray", 0, 0)).toBe(1);
    expect(kitPaintMask("spray", 1, 0)).toBe(1);
    expect(kitPaintMask("spray", 1, 1)).toBe(0);
    expect(kitPaintMask("spray", 0, 0)).not.toBe(kitPaintMask("metal", 0, 0));
  });

  it("Red Laminate paints furniture only", () => {
    expect(kitPaintMask("furniture", 0, 0)).toBe(1);
    expect(kitPaintMask("furniture", 1, 0)).toBe(0);
    expect(kitPaintMask("furniture", 0, 1)).toBe(0);
  });
});
