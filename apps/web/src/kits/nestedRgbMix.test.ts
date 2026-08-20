import { describe, expect, it } from "vitest";
import { luma } from "../patina/patinaWearMix";
import { KIT_RED_LAMINATE } from "./catalog";
import {
  ANODIZED_CHROME,
  anodizedChromeAmt,
  hydroMaskOverride,
  mixAnodizedCandy,
  mixNestedAlbedo,
  nestedRgbColorize,
  remapWear,
  sprayWearPattern,
} from "./nestedRgbMix";

const C0: [number, number, number] = [0.2, 0.2, 0.2];
const C1: [number, number, number] = [1, 0.7, 0.3];
const C2: [number, number, number] = [0.95, 0.3, 0.45];
const C3: [number, number, number] = [0.4, 0.5, 0.85];
const COLORS = [C0, C1, C2, C3] as const;
const WHITE: [number, number, number] = [1, 1, 1];

describe("nestedRgbColorize (pattern.wiki styles 2/3)", () => {
  it("black pattern stays Color0", () => {
    const c = nestedRgbColorize([0, 0, 0], C0, C1, C2, C3);
    expect(c).toEqual([...C0]);
  });
  it("red channel mixes toward Color1", () => {
    const c = nestedRgbColorize([1, 0, 0], C0, C1, C2, C3);
    expect(c[0]).toBeCloseTo(C1[0], 8);
    expect(c[1]).toBeCloseTo(C1[1], 8);
    expect(c[2]).toBeCloseTo(C1[2], 8);
  });
  it("blue channel wins last (nested lerp)", () => {
    const c = nestedRgbColorize([1, 1, 1], C0, C1, C2, C3);
    expect(c).toEqual([...C3]);
  });
});

describe("style 2 hydrographic mask overrides", () => {
  it("mask.g forces Color2", () => {
    const base = nestedRgbColorize([0, 0, 0], C0, C1, C2, C3);
    const out = hydroMaskOverride(base, 1, 0, C2, C3);
    expect(out).toEqual([...C2]);
  });
  it("style 2 mix applies the override", () => {
    const out = mixNestedAlbedo({
      style: 2,
      pattern: [0, 0, 0],
      wearTex: 0,
      grunge: WHITE,
      floatAmt: 0,
      colors: COLORS,
      maskG: 1,
      maskB: 0,
    });
    expect(out[0]).toBeCloseTo(C2[0], 5);
    expect(out[1]).toBeCloseTo(C2[1], 5);
    expect(out[2]).toBeCloseTo(C2[2], 5);
  });
});

describe("style 3 spray wear (pattern *= 1 - wear*float)", () => {
  it("float 0 leaves the pattern alone", () => {
    expect(sprayWearPattern([0.8, 0.4, 0.2], 1, 0)).toEqual([0.8, 0.4, 0.2]);
  });
  it("float 1 + white wear zeros the pattern (falls back to Color0 after mix)", () => {
    expect(sprayWearPattern([0.8, 0.4, 0.2], 1, 1)).toEqual([0, 0, 0]);
    const worn = mixNestedAlbedo({
      style: 3,
      pattern: [1, 0, 0],
      wearTex: 1,
      grunge: WHITE,
      floatAmt: 1,
      colors: COLORS,
    });
    expect(worn[0]).toBeCloseTo(C0[0], 5);
    expect(worn[1]).toBeCloseTo(C0[1], 5);
    expect(worn[2]).toBeCloseTo(C0[2], 5);
  });
});

describe("wear remap (inspect float → visual)", () => {
  it("identity remap 0–1", () => {
    expect(remapWear(0.38, 0, 1)).toBeCloseTo(0.38, 8);
  });
});

describe("grunge still darkens nested styles", () => {
  it("high float + dark grunge drops luma (style 2)", () => {
    const clean = mixNestedAlbedo({
      style: 2,
      pattern: [1, 0, 0],
      wearTex: 0,
      grunge: [0.2, 0.2, 0.2],
      floatAmt: 0,
      colors: COLORS,
    });
    const dirty = mixNestedAlbedo({
      style: 2,
      pattern: [1, 0, 0],
      wearTex: 0,
      grunge: [0.2, 0.2, 0.2],
      floatAmt: 1,
      colors: COLORS,
    });
    expect(luma(dirty)).toBeLessThan(luma(clean));
  });
});

describe("kit 14 nested RGB must not crush plywood to Color1", () => {
  const colors = KIT_RED_LAMINATE.colors;
  const white: [number, number, number] = [1, 1, 1];

  it("black bands stay Color0 (charcoal), not flattened toward the red", () => {
    const dark = mixNestedAlbedo({
      style: 2,
      pattern: [0, 0, 0],
      wearTex: 0,
      grunge: white,
      floatAmt: 0,
      colors,
    });
    expect(dark[0]).toBeCloseTo(colors[0][0], 5);
    expect(dark[1]).toBeCloseTo(colors[0][1], 5);
    expect(dark[2]).toBeCloseTo(colors[0][2], 5);
  });

  it("high-contrast R channel keeps a luma split (wavy grain)", () => {
    const dark = mixNestedAlbedo({
      style: 2,
      pattern: [0, 0, 0],
      wearTex: 0,
      grunge: white,
      floatAmt: 0,
      colors,
    });
    const redBand = mixNestedAlbedo({
      style: 2,
      pattern: [1, 0, 0],
      wearTex: 0,
      grunge: white,
      floatAmt: 0,
      colors,
    });
    expect(luma(redBand)).toBeGreaterThan(luma(dark) + 0.12);
    expect(redBand[0]).toBeGreaterThan(redBand[1] + 0.4);
  });
});

describe("style 5 anodized uses hydrographic mix + mask override", () => {
  it("applies mask.g → Color2 like style 2", () => {
    const out = mixNestedAlbedo({
      style: 5,
      pattern: [0, 0, 0],
      wearTex: 0,
      grunge: WHITE,
      floatAmt: 0,
      colors: COLORS,
      maskG: 1,
      maskB: 0,
    });
    expect(out[0]).toBeCloseTo(C2[0], 5);
    expect(out[1]).toBeCloseTo(C2[1], 5);
    expect(out[2]).toBeCloseTo(C2[2], 5);
  });

  it("does not multiply pattern by spray wear", () => {
    const worn = mixNestedAlbedo({
      style: 5,
      pattern: [1, 0, 0],
      wearTex: 1,
      grunge: WHITE,
      floatAmt: 1,
      colors: COLORS,
    });
    expect(worn[0]).toBeCloseTo(C1[0], 5);
    expect(worn[1]).toBeCloseTo(C1[1], 5);
    expect(worn[2]).toBeCloseTo(C1[2], 5);
  });
});

describe("style 5 anodized chrome undercoat (Hydroponic)", () => {
  it("float 0 keeps the candy color", () => {
    const c = mixAnodizedCandy(C1, 1, 0);
    expect(c[0]).toBeCloseTo(C1[0], 8);
    expect(anodizedChromeAmt(1, 0)).toBeCloseTo(0, 8);
  });
  it("high wear * float mixes toward chrome, not Color1 flatten", () => {
    const worn = mixAnodizedCandy(C3, 1, 1);
    expect(anodizedChromeAmt(1, 1)).toBeGreaterThan(0.3);
    expect(Math.abs(worn[0] - ANODIZED_CHROME[0])).toBeLessThan(Math.abs(C3[0] - ANODIZED_CHROME[0]));
  });
  it("style 2 mixNestedAlbedo is unchanged by the chrome helper", () => {
    const out = mixNestedAlbedo({
      style: 2,
      pattern: [1, 0, 0],
      wearTex: 1,
      grunge: WHITE,
      floatAmt: 1,
      colors: COLORS,
    });
    expect(out[0]).toBeCloseTo(C1[0], 5);
  });
});
