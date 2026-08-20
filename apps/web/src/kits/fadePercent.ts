/**
 * Glock Fade (kit 38 / aa_fade / style 6) fade-percent + 1D LUT sample.
 *
 * Fade % is a community metric, not an engine value. Classic Fade skins
 * keep X/Y offsets constant and only rotate the 1D/airbrush pattern; that
 * rotation is ranked 80% (worst) … 100% (best).
 *
 * Formula we implement (original, using this repo's Valve RNG):
 *   1. CUniformRandomStream(seed) — same generator as seedToPatternUv
 *   2. Draw X, then Y, then rotation in the aa_fade ranges
 *      (vmat offset is constant, so X/Y do not change the rank)
 *   3. Across seeds 0–999, best = max(rotation), worst = min(rotation)
 *      (Glock-18 is not a reversed Fade weapon)
 *   4. fadePct = 80 + 20 * (rot - worst) / (best - worst)
 *
 * Local aa_fade.vmat (Source2Viewer-CLI 20.0):
 *   g_vPatternTexCoordOffset  [-0.7, -0.7]
 *   g_flPatternTexCoordRotation  -55
 *   g_nPatternTextureHorizontalSampling / VerticalSampling  2
 *   g_tPattern  paints/anodized_air/fade.png (wavy RGB mix-mask)
 *   g_vColor0..3  silver / gold / pink / purple
 *   g_flPearlescentScale  0
 *
 * Community rotate *end* of -65 and the 80–100% rank are documented at:
 *   https://www.counter-strike.net/workshop/workshopfinishes/
 *   https://skinport.com/blog/csgo-fade-percentage-update
 *   https://github.com/chescos/csgo-fade-percentage-calculator  (README only)
 *   https://csgoskins.gg/blog/glock-18-fade-percentage-values-seed-patterns
 *   https://pattern.wiki/wiki/pattern_colors
 *
 * Do not copy that calculator's JS/TS. We re-derive from the published
 * description plus the local vmat and our existing UniformRandomStream.
 */

import { UniformRandomStream } from "../seed/uniformRandom";
import { clampSeed, SEED_MAX, SEED_MIN } from "../seed/seedToPatternUv";
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
import { nestedRgbColorize } from "./nestedRgbMix";

/** aa_fade.vmat g_vPatternTexCoordOffset — constant for every seed. */
export const FADE_OFFSET_X = -0.7;
export const FADE_OFFSET_Y = -0.7;
/** aa_fade.vmat g_flPatternTexCoordRotation (start of community range). */
export const FADE_ROTATE_START = -55;
/**
 * Community classic-Fade rotate end (Skinport + fade-calculator README).
 * items_game aa_fade has no rotate keys; the vmat only stores the start.
 */
export const FADE_ROTATE_END = -65;
export const FADE_PERCENT_MIN = 80;
export const FADE_PERCENT_MAX = 100;

export type FadeRotation = {
  seed: number;
  offsetX: number;
  offsetY: number;
  rotationDeg: number;
};

/**
 * Seed → Fade placement draws. X/Y stay at the vmat constant; rotation
 * walks the documented -55…-65 band. Draw order matches Valve (X, Y, rot).
 */
export function fadeRotationForSeed(seed: number): FadeRotation {
  const clamped = clampSeed(seed);
  const rng = new UniformRandomStream();
  rng.setSeed(clamped);
  const offsetX = rng.randomFloat(FADE_OFFSET_X, FADE_OFFSET_X);
  const offsetY = rng.randomFloat(FADE_OFFSET_Y, FADE_OFFSET_Y);
  const rotationDeg = rng.randomFloat(FADE_ROTATE_START, FADE_ROTATE_END);
  return { seed: clamped, offsetX, offsetY, rotationDeg };
}

let cachedRange: { worst: number; best: number } | null = null;

/** Rank extrema over seeds 0–999. Glock is not reversed: max rot = 100%. */
export function fadeRotationRange(): { worst: number; best: number } {
  if (cachedRange) return cachedRange;
  let worst = Number.POSITIVE_INFINITY;
  let best = Number.NEGATIVE_INFINITY;
  for (let seed = SEED_MIN; seed <= SEED_MAX; seed++) {
    const rot = fadeRotationForSeed(seed).rotationDeg;
    if (rot < worst) worst = rot;
    if (rot > best) best = rot;
  }
  cachedRange = { worst, best };
  return cachedRange;
}

/** Community fade percentage in [80, 100]. */
export function fadePercent(seed: number): number {
  const { worst, best } = fadeRotationRange();
  const rot = fadeRotationForSeed(seed).rotationDeg;
  const span = best - worst;
  const t = span === 0 ? 1 : (rot - worst) / span;
  return FADE_PERCENT_MIN + clamp01(t) * (FADE_PERCENT_MAX - FADE_PERCENT_MIN);
}

export function fadePercent01(seed: number): number {
  return (fadePercent(seed) - FADE_PERCENT_MIN) / (FADE_PERCENT_MAX - FADE_PERCENT_MIN);
}

/**
 * 1D LUT coordinate along fade.png. Higher fade % shifts the window
 * toward the purple/pink (right) end of the ramp so a 100% Fade covers
 * more of the gun; 80% keeps more gold/silver.
 *
 * Workshop: "the pattern is applied as a gradient along the length of
 * the weapon" (Anodized Airbrushed / triplanar). We sample the official
 * 1D/wavy LUT along weapon UV.x — not Skincraft.
 */
export function fadeLutT(uvX: number, fadePct: number): number {
  const t = clamp01((fadePct - FADE_PERCENT_MIN) / (FADE_PERCENT_MAX - FADE_PERCENT_MIN));
  const origin = lerp(0.04, 0.20, t);
  const span = lerp(0.52, 0.74, t);
  return clamp01(origin + clamp01(uvX) * span);
}

/** Chrome undercoat the airbrush wears to before the substrate. */
export const FADE_CHROME: Rgb = [0.85, 0.86, 0.88];

export type FadeMixInput = {
  pattern: Rgb;
  colors: readonly [Rgb, Rgb, Rgb, Rgb];
  wearTex: number;
  grunge: Rgb;
  floatAmt: number;
  cavity?: number;
};

/**
 * Style-6 painted albedo (linear). Caller still fades the paint mask
 * toward the substrate after the chrome undercoat.
 */
export function mixFadeAlbedo(input: FadeMixInput): RgbMut {
  const [c0, c1, c2, c3] = input.colors;
  const f = clampFloat(input.floatAmt);
  const cavity = input.cavity ?? 1;
  let color = nestedRgbColorize(input.pattern, c0, c1, c2, c3);
  const chromeAmt = smooth01((f * clamp01(input.wearTex) - 0.12) / 0.43);
  color = lerp3(color, FADE_CHROME, chromeAmt * 0.55);
  const gAmt = grungeMixAmount(cavity, f);
  const cGrunge: RgbMut = [
    lerp(1, input.grunge[0], gAmt),
    lerp(1, input.grunge[1], gAmt),
    lerp(1, input.grunge[2], gAmt),
  ];
  const painted = mul3(color, cGrunge);
  return [clamp01(painted[0]), clamp01(painted[1]), clamp01(painted[2])];
}

function smooth01(x: number): number {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
}
