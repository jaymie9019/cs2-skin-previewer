import { describe, expect, it } from "vitest";
import { UniformRandomStream } from "./uniformRandom";
import {
  AK47_UV_SCALE,
  affineEquals,
  applyAffine,
  composePatternMatrix,
  extraOffset,
  seedToPatternUv,
} from "./seedToPatternUv";

describe("UniformRandomStream (Valve CUniformRandomStream)", () => {
  it("matches Step7750's published float sequence for seed 72", () => {
    // https://github.com/Step7750/UniformRandom/blob/master/random_test.go
    const rng = new UniformRandomStream();
    rng.setSeed(72);
    expect(rng.randomFloat(0, 1)).toBeCloseTo(0.5430998, 5);
    expect(rng.randomFloat(0, 1)).toBeCloseTo(0.40631828, 5);
    expect(rng.randomFloat(0, 100)).toBeCloseTo(62.147213, 5);
    expect(rng.randomFloat(0, 1)).toBeCloseTo(0.058990162, 5);
  });
});

describe("seed → pattern offsets (pattern.wiki / isitabluegem)", () => {
  // https://pattern.wiki/skin/aq_oiled/weapon_ak47/?order=asc&sort=seed
  // https://www.isitabluegem.com/insights  (Karambit CH #387 / #633)
  const published: Record<number, [number, number, number]> = {
    0: [0.416, 0.092, 272.308],
    1: [0.416, 0.092, 272.308],
    2: [0.342, 0.402, 110.822],
    44: [0.282, 0.054, 218.032],
    387: [0.067, 0.731, 264.532],
    633: [0.471, 0.624, 96.7],
    661: [0.316, 0.487, 105.373],
  };

  it("seed 0 and seed 1 are the same Valve draw (idum collapse)", () => {
    const a = seedToPatternUv(0);
    const b = seedToPatternUv(1);
    expect(a.pattern.translateX).toBe(b.pattern.translateX);
    expect(a.pattern.translateY).toBe(b.pattern.translateY);
    expect(a.pattern.rotationDeg).toBe(b.pattern.rotationDeg);
    expect(affineEquals(a.pattern.matrix, b.pattern.matrix)).toBe(true);
  });

  it("matches published AK / Case Hardened offsets for several seeds", () => {
    for (const seed of [0, 1, 2, 44, 387, 633, 661]) {
      const uv = seedToPatternUv(seed);
      const [x, y, r] = published[seed];
      expect(uv.pattern.translateX).toBeCloseTo(x, 2);
      expect(uv.pattern.translateY).toBeCloseTo(y, 2);
      expect(uv.pattern.rotationDeg).toBeCloseTo(r, 2);
    }
  });

  it("uses AK-47 UVScale as Patina (style 8) base scale", () => {
    expect(seedToPatternUv(0).baseScale).toBe(AK47_UV_SCALE);
    expect(seedToPatternUv(0).pattern.scale).toBe(AK47_UV_SCALE);
  });

  it("same seed is bit-identical (Object.is on every matrix component)", () => {
    const a = seedToPatternUv(661);
    const b = seedToPatternUv(661);
    expect(affineEquals(a.pattern.matrix, b.pattern.matrix)).toBe(true);
    expect(affineEquals(a.wear.matrix, b.wear.matrix)).toBe(true);
    expect(affineEquals(a.grunge.matrix, b.grunge.matrix)).toBe(true);
    expect(Object.is(a.pattern.translateX, b.pattern.translateX)).toBe(true);
    expect(Object.is(a.pattern.rotationDeg, b.pattern.rotationDeg)).toBe(true);
    expect(Object.is(a.wear.scale, b.wear.scale)).toBe(true);
    expect(Object.is(a.grunge.scale, b.grunge.scale)).toBe(true);
  });

  it("different seeds produce different pattern matrices", () => {
    const a = seedToPatternUv(0);
    const b = seedToPatternUv(661);
    expect(affineEquals(a.pattern.matrix, b.pattern.matrix)).toBe(false);
  });

  it("clamps to 0–999", () => {
    expect(seedToPatternUv(-12).seed).toBe(0);
    expect(seedToPatternUv(1000).seed).toBe(999);
    expect(seedToPatternUv(661.9).seed).toBe(661);
  });

  it("draws 11 floats: pattern(3) + wear(4) + grunge(4)", () => {
    const uv = seedToPatternUv(72);
    expect(uv.wear.scale).toBeGreaterThan(uv.baseScale * 1.6 - 1e-9);
    expect(uv.wear.scale).toBeLessThan(uv.baseScale * 1.8 + 1e-9);
    expect(uv.grunge.scale).toBeGreaterThan(uv.baseScale * 1.6 - 1e-9);
    expect(uv.grunge.scale).toBeLessThan(uv.baseScale * 1.8 + 1e-9);
    expect(uv.wear.rotationDeg).toBeGreaterThanOrEqual(0);
    expect(uv.wear.rotationDeg).toBeLessThan(360);
    expect(uv.grunge.translateX).not.toBe(uv.pattern.translateX);
  });
});

describe("extra offset + matrix (pattern.wiki transforms page)", () => {
  // https://pattern.wiki/wiki/pattern_offsets/transforms
  // Displayed inputs: offset 0.07 / 0.73, rotation 264.53, scale 0.44
  // extraOffsetX = -1.2395122, extraOffsetY = -1.342191
  it("matches the published extra-offset snippet", () => {
    const { extraX, extraY } = extraOffset(0.44, 264.53);
    expect(extraX).toBeCloseTo(-1.2395122, 5);
    expect(extraY).toBeCloseTo(-1.342191, 5);
  });

  it("composePatternMatrix applies T2 R S T1 to a point", () => {
    const layer = composePatternMatrix(0.07, 0.73, 264.53, 0.44);
    const t1x = 0.07 - 0.5;
    const t1y = 0.73 - 0.5;
    const theta = 264.53 * (Math.PI / 180);
    const px = 0.25;
    const py = 0.1;
    const p1x = px + t1x;
    const p1y = py + t1y;
    const p2x = p1x * 0.44;
    const p2y = p1y * 0.44;
    const p3x = Math.cos(theta) * p2x - Math.sin(theta) * p2y;
    const p3y = Math.sin(theta) * p2x + Math.cos(theta) * p2y;
    const expectedX = p3x + layer.extraX;
    const expectedY = p3y + layer.extraY;
    const got = applyAffine(layer.matrix, px, py);
    expect(got.x).toBeCloseTo(expectedX, 10);
    expect(got.y).toBeCloseTo(expectedY, 10);
  });
});
