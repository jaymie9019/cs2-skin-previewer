import { describe, expect, it } from "vitest";
import { luma } from "../patina/patinaWearMix";
import { KIT_FADE } from "./catalog";
import { nestedRgbColorize } from "./nestedRgbMix";
import {
  FADE_CHROME,
  FADE_OFFSET_X,
  FADE_OFFSET_Y,
  FADE_PERCENT_MAX,
  FADE_PERCENT_MIN,
  FADE_ROTATE_END,
  FADE_ROTATE_START,
  fadeLutT,
  fadePercent,
  fadePercent01,
  fadeRotationForSeed,
  fadeRotationRange,
  mixFadeAlbedo,
} from "./fadePercent";

describe("fadeRotationForSeed (aa_fade vmat + community range)", () => {
  it("keeps X/Y at the vmat constant and rotation inside -55…-65", () => {
    for (const seed of [0, 38, 412, 575, 763, 897, 999]) {
      const d = fadeRotationForSeed(seed);
      expect(d.offsetX).toBeCloseTo(FADE_OFFSET_X, 8);
      expect(d.offsetY).toBeCloseTo(FADE_OFFSET_Y, 8);
      const lo = Math.min(FADE_ROTATE_START, FADE_ROTATE_END);
      const hi = Math.max(FADE_ROTATE_START, FADE_ROTATE_END);
      expect(d.rotationDeg).toBeGreaterThanOrEqual(lo);
      expect(d.rotationDeg).toBeLessThanOrEqual(hi);
    }
  });

  it("same seed is bit-identical", () => {
    expect(fadeRotationForSeed(763).rotationDeg).toBe(fadeRotationForSeed(763).rotationDeg);
  });
});

describe("fadePercent (community 80–100 from rotation rank)", () => {
  it("stays in 80–100 and ranks the extrema", () => {
    const { worst, best } = fadeRotationRange();
    expect(best).toBeGreaterThan(worst);
    let minPct = 101;
    let maxPct = -1;
    let minSeed = 0;
    let maxSeed = 0;
    for (let s = 0; s <= 999; s++) {
      const p = fadePercent(s);
      expect(p).toBeGreaterThanOrEqual(FADE_PERCENT_MIN - 1e-9);
      expect(p).toBeLessThanOrEqual(FADE_PERCENT_MAX + 1e-9);
      if (p < minPct) {
        minPct = p;
        minSeed = s;
      }
      if (p > maxPct) {
        maxPct = p;
        maxSeed = s;
      }
    }
    expect(minPct).toBeCloseTo(80, 5);
    expect(maxPct).toBeCloseTo(100, 5);
    expect(fadeRotationForSeed(maxSeed).rotationDeg).toBeCloseTo(best, 8);
    expect(fadeRotationForSeed(minSeed).rotationDeg).toBeCloseTo(worst, 8);
  });

  it("seed 763 is a high-end Glock Fade (community 100% class)", () => {
    // https://csgoskins.gg/blog/glock-18-fade-percentage-values-seed-patterns
    // https://skinport.com/blog/csgo-fade-percentage-update
    expect(fadePercent(763)).toBeGreaterThan(99);
    expect(fadePercent01(763)).toBeGreaterThan(0.95);
  });

  it("different seeds can differ (not a flat 80)", () => {
    expect(Math.abs(fadePercent(763) - fadePercent(0))).toBeGreaterThan(1);
  });
});

describe("fadeLutT (1D window into fade.png)", () => {
  it("100% samples further toward purple than 80%", () => {
    expect(fadeLutT(0.5, 100)).toBeGreaterThan(fadeLutT(0.5, 80));
    expect(fadeLutT(0, 80)).toBeLessThan(fadeLutT(0, 100));
    expect(fadeLutT(1, 80)).toBeLessThanOrEqual(1);
    expect(fadeLutT(1, 100)).toBeLessThanOrEqual(1);
  });

  it("is monotonic in uv.x", () => {
    expect(fadeLutT(0.2, 90)).toBeLessThan(fadeLutT(0.8, 90));
  });
});

describe("mixFadeAlbedo (nested RGB + chrome undercoat)", () => {
  const colors = KIT_FADE.colors;
  const white: [number, number, number] = [1, 1, 1];

  it("black pattern stays Color0 (silver) at float 0", () => {
    const out = mixFadeAlbedo({
      pattern: [0, 0, 0],
      colors,
      wearTex: 0,
      grunge: white,
      floatAmt: 0,
    });
    expect(out[0]).toBeCloseTo(colors[0][0], 5);
    expect(out[1]).toBeCloseTo(colors[0][1], 5);
    expect(out[2]).toBeCloseTo(colors[0][2], 5);
  });

  it("blue channel wins last (purple)", () => {
    const out = mixFadeAlbedo({
      pattern: [1, 1, 1],
      colors,
      wearTex: 0,
      grunge: white,
      floatAmt: 0,
    });
    expect(out[0]).toBeCloseTo(colors[3][0], 5);
    expect(out[1]).toBeCloseTo(colors[3][1], 5);
    expect(out[2]).toBeCloseTo(colors[3][2], 5);
  });

  it("wear pulls toward chrome, not toward Color1 flatten", () => {
    const clean = mixFadeAlbedo({
      pattern: [0, 0, 1],
      colors,
      wearTex: 0,
      grunge: white,
      floatAmt: 0,
    });
    const worn = mixFadeAlbedo({
      pattern: [0, 0, 1],
      colors,
      wearTex: 1,
      grunge: white,
      floatAmt: 1,
    });
    const chrome = nestedRgbColorize([0, 0, 0], FADE_CHROME, FADE_CHROME, FADE_CHROME, FADE_CHROME);
    expect(Math.abs(worn[0] - chrome[0])).toBeLessThan(Math.abs(clean[0] - chrome[0]) + 0.05);
    expect(luma(worn)).toBeGreaterThan(0.4);
  });
});
