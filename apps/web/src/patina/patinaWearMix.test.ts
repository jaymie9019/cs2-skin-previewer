import { describe, expect, it } from "vitest";
import {
  PATINA_COLOR0,
  clampFloat,
  grungeMixAmount,
  luma,
  mixFinishAlbedo,
  mixPatinaAlbedo,
  paintMask,
  patinaScratchBlend,
} from "./patinaWearMix";

const BLUE: [number, number, number] = [0.1, 0.25, 0.85];
const WHITE_GRUNGE: [number, number, number] = [1, 1, 1];
const DARK_GRUNGE: [number, number, number] = [0.2, 0.2, 0.2];
const WOOD: [number, number, number] = [0.25, 0.14, 0.07];

describe("clampFloat", () => {
  it("clamps to 0–1", () => {
    expect(clampFloat(-0.2)).toBe(0);
    expect(clampFloat(0)).toBe(0);
    expect(clampFloat(0.38)).toBe(0.38);
    expect(clampFloat(1)).toBe(1);
    expect(clampFloat(2)).toBe(1);
    expect(clampFloat(Number.NaN)).toBe(0);
  });
});

describe("paintMask (HD AK composite inputs)", () => {
  it("wood (masks.r = 0) is unpainted", () => {
    expect(paintMask(0, 0)).toBe(0);
  });
  it("metal (masks.r = 1) is painted", () => {
    expect(paintMask(1, 0)).toBe(1);
  });
  it("no-paint (barrel interior) knocks out the patina", () => {
    expect(paintMask(1, 1)).toBe(0);
    expect(paintMask(1, 0.5)).toBeCloseTo(0.5, 10);
  });
});

describe("patinaScratchBlend (wear map vs float, style 8)", () => {
  it("float 0 → no scratch contribution at any wear texel", () => {
    expect(patinaScratchBlend(0, 0)).toBe(0);
    expect(patinaScratchBlend(1, 0)).toBe(0);
    expect(patinaScratchBlend(0.5, 0, 1, 1)).toBe(0);
  });

  it("higher float lets more of the wear mask pass", () => {
    const wear = 0.5;
    const lo = patinaScratchBlend(wear, 0.15);
    const hi = patinaScratchBlend(wear, 0.75);
    expect(hi).toBeGreaterThan(lo);
    expect(patinaScratchBlend(wear, 1)).toBeGreaterThan(patinaScratchBlend(wear, 0.38));
  });

  it("black wear never scratches even at float 1", () => {
    expect(patinaScratchBlend(0, 1)).toBe(0);
  });

  it("white wear at float 1 fully scratches (smoothstep 0.1–0.2 of 1)", () => {
    expect(patinaScratchBlend(1, 1)).toBe(1);
  });
});

describe("grungeMixAmount", () => {
  it("exposed surfaces (cavity 1) contribute 0 grunge at float 0", () => {
    expect(grungeMixAmount(1, 0)).toBe(0);
  });
  it("rises with float", () => {
    expect(grungeMixAmount(1, 0.75)).toBeGreaterThan(grungeMixAmount(1, 0.15));
    expect(grungeMixAmount(1, 1)).toBeCloseTo(0.75, 10);
  });
});

describe("mixPatinaAlbedo (style 8, not nested RGB colorize)", () => {
  it("float 0 returns the pattern at full strength (no color1 crush, no scratches)", () => {
    const clean = mixPatinaAlbedo({
      pattern: BLUE,
      wearTex: 1,
      grunge: WHITE_GRUNGE,
      floatAmt: 0,
      ao: 1,
      cavity: 1,
    });
    expect(clean[0]).toBeCloseTo(BLUE[0], 5);
    expect(clean[1]).toBeCloseTo(BLUE[1], 5);
    expect(clean[2]).toBeCloseTo(BLUE[2], 5);
    expect(luma(clean)).toBeCloseTo(luma(BLUE), 5);
  });

  it("high float + white wear darkens toward base-metal * pattern luma", () => {
    const worn = mixPatinaAlbedo({
      pattern: BLUE,
      wearTex: 1,
      grunge: WHITE_GRUNGE,
      floatAmt: 1,
      ao: 1,
      cavity: 1,
    });
    const expected = luma(BLUE);
    expect(worn[0]).toBeCloseTo(PATINA_COLOR0[0] * expected, 5);
    expect(worn[1]).toBeCloseTo(PATINA_COLOR0[1] * expected, 5);
    expect(worn[2]).toBeCloseTo(PATINA_COLOR0[2] * expected, 5);
  });

  it("grunge darkens at high float", () => {
    const cleanish = mixPatinaAlbedo({
      pattern: BLUE,
      wearTex: 0,
      grunge: DARK_GRUNGE,
      floatAmt: 0,
      ao: 1,
      cavity: 1,
    });
    const dirty = mixPatinaAlbedo({
      pattern: BLUE,
      wearTex: 0,
      grunge: DARK_GRUNGE,
      floatAmt: 1,
      ao: 1,
      cavity: 1,
    });
    expect(luma(dirty)).toBeLessThan(luma(cleanish));
  });
});

describe("mixFinishAlbedo (wood stays wood)", () => {
  it("paintMask 0 returns the original albedo", () => {
    const patina = mixPatinaAlbedo({
      pattern: BLUE,
      wearTex: 1,
      grunge: WHITE_GRUNGE,
      floatAmt: 0.75,
    });
    const out = mixFinishAlbedo(WOOD, patina, 0);
    expect(out).toEqual([...WOOD]);
  });

  it("paintMask 1 returns the patina mix", () => {
    const patina = mixPatinaAlbedo({
      pattern: BLUE,
      wearTex: 0,
      grunge: WHITE_GRUNGE,
      floatAmt: 0,
      ao: 1,
      cavity: 1,
    });
    const out = mixFinishAlbedo(WOOD, patina, 1);
    expect(out[0]).toBeCloseTo(patina[0], 10);
    expect(out[1]).toBeCloseTo(patina[1], 10);
    expect(out[2]).toBeCloseTo(patina[2], 10);
  });
});
