/**
 * Nested RGB colorization for styles 2 / 3
 * (hydrographic, spray-paint).
 *
 *   color = Color0
 *   color = mix(color, Color1, pattern.r)
 *   color = mix(color, Color2, pattern.g)
 *   color = mix(color, Color3, pattern.b)
 *
 * Style 2 also applies paint-by-number overrides:
 *   color = mix(color, Color2, mask.g)
 *   color = mix(color, Color3, mask.b)
 *
 * Do not mix toward Color1 afterwards — that crushes plywood grain to a
 * flat red (kit 14 / hy_ak47lam). The official film is an RGB mix-mask;
 * Color0 charcoal + Color1 red *is* the laminate.
 *
 * Style 3 spray: wear multiplies pattern RGB *before* the nested mix.
 * Style 2 hydrographic: wears directly to the substrate (caller fades
 * the paint mask with the wear map); this function still applies grunge.
 *
 *   https://pattern.wiki/wiki/pattern_colors
 *   https://www.counter-strike.net/workshop/workshopfinishes/
 */

import {
  clamp01,
  clampFloat,
  grungeMixAmount,
  lerp,
  lerp3,
  mul3,
  type Rgb,
  type RgbMut,
} from "../patina/patinaWearMix";

export function nestedRgbColorize(pattern: Rgb, c0: Rgb, c1: Rgb, c2: Rgb, c3: Rgb): RgbMut {
  let c = lerp3(c0, c1, clamp01(pattern[0]));
  c = lerp3(c, c2, clamp01(pattern[1]));
  c = lerp3(c, c3, clamp01(pattern[2]));
  return c;
}

export function hydroMaskOverride(color: Rgb, maskG: number, maskB: number, c2: Rgb, c3: Rgb): RgbMut {
  let c = lerp3(color, c2, clamp01(maskG));
  c = lerp3(c, c3, clamp01(maskB));
  return c;
}

export function remapWear(floatAmt: number, remapMin: number, remapMax: number): number {
  return lerp(remapMin, remapMax, clampFloat(floatAmt));
}

/** Style 3: wear layers multiply pattern RGB before color mixing. */
export function sprayWearPattern(pattern: Rgb, wearTex: number, floatAmt: number): RgbMut {
  const k = 1 - clamp01(wearTex) * clampFloat(floatAmt);
  return [pattern[0] * k, pattern[1] * k, pattern[2] * k];
}

export type NestedMixInput = {
  style: number;
  pattern: Rgb;
  wearTex: number;
  grunge: Rgb;
  floatAmt: number;
  colors: readonly [Rgb, Rgb, Rgb, Rgb];
  wearRemapMin?: number;
  wearRemapMax?: number;
  maskG?: number;
  maskB?: number;
  cavity?: number;
};

/**
 * Painted albedo for styles 2/3 (linear). Caller still lerps with the
 * original glTF albedo using the per-kit paint mask.
 */
export function mixNestedAlbedo(input: NestedMixInput): RgbMut {
  const [c0, c1, c2, c3] = input.colors;
  const f = clampFloat(input.floatAmt);
  const cavity = input.cavity ?? 1;
  const style = input.style;

  let pattern: Rgb = input.pattern;
  if (style === 3) {
    pattern = sprayWearPattern(input.pattern, input.wearTex, f);
  }

  let color: RgbMut = nestedRgbColorize(pattern, c0, c1, c2, c3);

  if (style === 2) {
    color = hydroMaskOverride(color, input.maskG ?? 0, input.maskB ?? 0, c2, c3);
  }

  const gAmt = grungeMixAmount(cavity, f);
  const cGrunge: RgbMut = [
    lerp(1, input.grunge[0], gAmt),
    lerp(1, input.grunge[1], gAmt),
    lerp(1, input.grunge[2], gAmt),
  ];
  const painted = mul3(color, cGrunge);
  return [clamp01(painted[0]), clamp01(painted[1]), clamp01(painted[2])];
}
