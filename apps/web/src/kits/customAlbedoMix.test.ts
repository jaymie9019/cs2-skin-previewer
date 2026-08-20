import { describe, expect, it } from "vitest";
import { luma } from "../patina/patinaWearMix";
import { customWearOff, mixCustomAlbedo } from "./customAlbedoMix";

const WHITE: [number, number, number] = [1, 1, 1];
const RED: [number, number, number] = [0.72, 0.08, 0.1];
const DARK: [number, number, number] = [0.2, 0.2, 0.2];

describe("mixCustomAlbedo (styles 7 / 9)", () => {
  it("float 0 + white grunge returns the albedo unchanged", () => {
    const out = mixCustomAlbedo({
      albedo: RED,
      wearTex: 1,
      grunge: WHITE,
      floatAmt: 0,
    });
    expect(out[0]).toBeCloseTo(RED[0], 8);
    expect(out[1]).toBeCloseTo(RED[1], 8);
    expect(out[2]).toBeCloseTo(RED[2], 8);
  });

  it("does not nest-mix toward other colors (not a Fade / RGB kit)", () => {
    const out = mixCustomAlbedo({
      albedo: [0.1, 0.1, 0.1],
      wearTex: 0,
      grunge: WHITE,
      floatAmt: 0,
    });
    expect(out[0]).toBeCloseTo(0.1, 8);
    expect(out[1]).toBeCloseTo(0.1, 8);
    expect(out[2]).toBeCloseTo(0.1, 8);
  });

  it("high float + dark grunge drops luma", () => {
    const clean = mixCustomAlbedo({
      albedo: RED,
      wearTex: 0,
      grunge: DARK,
      floatAmt: 0,
    });
    const dirty = mixCustomAlbedo({
      albedo: RED,
      wearTex: 0,
      grunge: DARK,
      floatAmt: 1,
    });
    expect(luma(dirty)).toBeLessThan(luma(clean));
  });

  it("wearTex is not applied inside the albedo sample (mask-side)", () => {
    const a = mixCustomAlbedo({ albedo: RED, wearTex: 0, grunge: WHITE, floatAmt: 1 });
    const b = mixCustomAlbedo({ albedo: RED, wearTex: 1, grunge: WHITE, floatAmt: 1 });
    expect(a).toEqual(b);
  });
});

describe("customWearOff (paint mask fade)", () => {
  it("float 0 keeps full coverage", () => {
    expect(customWearOff(1, 0)).toBeCloseTo(0, 8);
  });
  it("high wear * float fades coverage", () => {
    expect(customWearOff(1, 1)).toBeCloseTo(1, 8);
    expect(customWearOff(0.55, 1)).toBeGreaterThan(0.3);
    expect(customWearOff(0.55, 1)).toBeLessThan(1);
  });
});
