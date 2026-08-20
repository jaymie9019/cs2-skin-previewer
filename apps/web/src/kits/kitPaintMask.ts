/**
 * Per-kit paint coverage. Not a global wood-vs-metal split.
 *
 *   metal     — style 8 Case Hardened: HD masks.r (patina/anodized)
 *   spray     — style 3 Jungle Spray: all paintable (1 - TextureNoPaint),
 *               so camo covers receiver AND furniture. Do not reuse metal-only.
 *   furniture — style 2 Red Laminate: inverse of masks.r (wood stock /
 *               handguard / grip). Factory metal stays the glTF albedo.
 *
 *   https://www.counter-strike.net/workshop/workshopfinishes/
 *   local weapon_rif_ak47_composite_inputs.vmat
 */

import { clamp01, paintMask } from "../patina/patinaWearMix";
import type { MaskMode } from "./catalog";

export function step04(x: number): number {
  return x >= 0.4 ? 1 : 0;
}

export function kitPaintMask(mode: MaskMode, masksR: number, noPaint = 0): number {
  const np = 1 - clamp01(noPaint);
  if (mode === "metal") return paintMask(masksR, noPaint);
  if (mode === "furniture") return (1 - step04(masksR)) * np;
  // spray: furniture + metal, only TextureNoPaint is excluded
  return np;
}
