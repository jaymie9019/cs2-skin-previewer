/**
 * Custom Paint Job (style 7) and Gunsmith (style 9) albedo sample.
 *
 * Workshop: a full-color image applied via the weapon's original UVs.
 * Not nested RGB. Wears directly to the substrate (caller fades the
 * paint mask with the wear map). Grunge still multiplies.
 *
 * Gunsmith officially combines patina + custom; this mix is the custom
 * half (the albedo). Patina-on-metal split is out of scope for M8.
 *
 *   https://www.counter-strike.net/workshop/workshopfinishes/
 *   local cu_ak47_cobra.vmat / gs_ak47_supercharged.vmat / gs_ak47_bloodsport.vmat
 */

import {
  clamp01,
  clampFloat,
  grungeMixAmount,
  lerp,
  mul3,
  type Rgb,
  type RgbMut,
} from "../patina/patinaWearMix";

export type CustomMixInput = {
  albedo: Rgb;
  wearTex: number;
  grunge: Rgb;
  floatAmt: number;
  cavity?: number;
};

/**
 * Painted albedo for styles 7 / 9 (linear). Wear does not recolor the
 * sample here — the caller fades cs2PaintMask with wearTex * float.
 */
export function mixCustomAlbedo(input: CustomMixInput): RgbMut {
  const f = clampFloat(input.floatAmt);
  const cavity = input.cavity ?? 1;
  const gAmt = grungeMixAmount(cavity, f);
  const cGrunge: RgbMut = [
    lerp(1, input.grunge[0], gAmt),
    lerp(1, input.grunge[1], gAmt),
    lerp(1, input.grunge[2], gAmt),
  ];
  const painted = mul3(input.albedo, cGrunge);
  return [clamp01(painted[0]), clamp01(painted[1]), clamp01(painted[2])];
}

/** Custom / hydro / anodized: fade paint coverage as wear * float rises. */
export function customWearOff(wearTex: number, floatAmt: number): number {
  const x = clamp01(wearTex) * clampFloat(floatAmt);
  // GLSL smoothstep(0.2, 0.9, x)
  const t = clamp01((x - 0.2) / 0.7);
  return t * t * (3 - 2 * t);
}
