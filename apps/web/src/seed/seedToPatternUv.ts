/**
 * Paint seed (0–999) → pattern / wear / grunge UV transform.
 *
 * RNG draw order and ranges (pattern, then wear, then grunge) from:
 *   https://www.isitabluegem.com/insights
 *   https://www.isitabluegem.com/zh-CN/insights
 *   https://www.reddit.com/r/GlobalOffensiveTrade/comments/b7g538/psa_how_paint_seed_actually_works_technical/
 *
 * Affine chain applied to weapon UVs before sampling the tiled pattern:
 *   A = T₂ × R × S × T₁
 *     T₁: translate(offsetX - 0.5, offsetY - 0.5)
 *     S:  uniform scale around origin
 *     R:  rotate counterclockwise around origin
 *     T₂: extra offset that compensates corner-based rotation
 *   uv_final = fract(A × uv)
 *
 * Extra-offset formula (invScale = 0.5/scale, angle = −rotationDeg):
 *   extraX = invScale*cos − invScale*sin
 *   extraY = extraX*sin + invScale*cos
 * is published by both pattern.wiki and isitabluegem. We follow
 * isitabluegem's finalized matrix order (T₂ R S T₁, all about origin)
 * when the two descriptions of pivot disagree.
 *   https://pattern.wiki/wiki/pattern_offsets
 *   https://pattern.wiki/wiki/pattern_offsets/transforms
 *
 * Official finish docs (tiling vs triplanar, 36-inch pattern sheet,
 * per-application random offset/rotation/wear):
 *   https://www.counter-strike.net/workshop/workshopfinishes/
 *
 * AK-47 Case Hardened (paint kit 44 / aq_oiled, style 8 = Patina) is
 * a UV-mapped style, so base scale is the weapon UVScale — not
 * weapon_length/36 (that path is paint_style 3 or 6, spray / airbrush).
 * Values from local items_game.txt and pattern.wiki:
 *   WeaponLength = 37.746201, UVScale = 0.549, PatternScale = 1
 */

import { UniformRandomStream } from "./uniformRandom";

export const SEED_MIN = 0;
export const SEED_MAX = 999;

/** AK-47 paint_data.PaintableMaterial0 from items_game.txt */
export const AK47_WEAPON_LENGTH = 37.746201;
export const AK47_UV_SCALE = 0.549;

/** aq_oiled / Case Hardened — items_game style 8, vmat F_PAINT_STYLE 7 (Patina). */
export const AQ_OILED_PAINT_STYLE = 8;
export const AQ_OILED_PATTERN_SCALE = 1;

/** Wear / grunge scale multipliers. Source: isitabluegem insights. */
export const WEAR_SCALE_MULT_MIN = 1.6;
export const WEAR_SCALE_MULT_MAX = 1.8;

export type Affine2D = {
  /** [ a b tx ; c d ty ] so (x',y') = (a x + b y + tx, c x + d y + ty) */
  a: number;
  b: number;
  tx: number;
  c: number;
  d: number;
  ty: number;
};

export type LayerUv = {
  translateX: number;
  translateY: number;
  rotationDeg: number;
  scale: number;
  extraX: number;
  extraY: number;
  matrix: Affine2D;
};

export type SeedPatternUv = {
  seed: number;
  baseScale: number;
  pattern: LayerUv;
  wear: LayerUv;
  grunge: LayerUv;
};

export type SeedUvOptions = {
  /** items_game paint_data UVScale. Default: AK-47. */
  uvScale?: number;
  /** items_game paint_data WeaponLength. Used only for styles 3 and 6. */
  weaponLength?: number;
  /**
   * items_game paint kit "style". Spray-paint (3) and anodized airbrush (6)
   * use weapon_length * (1/36). Every other documented style uses uvScale.
   * Official: https://www.counter-strike.net/workshop/workshopfinishes/
   * Community: https://www.isitabluegem.com/insights
   */
  paintStyle?: number;
  patternScale?: number;
};

/** 1/36 inch — official pattern-sheet size for triplanar styles. */
const INV_PATTERN_SHEET_INCHES = 1 / 36;

export function clampSeed(seed: number): number {
  if (!Number.isFinite(seed)) return SEED_MIN;
  return Math.min(SEED_MAX, Math.max(SEED_MIN, Math.trunc(seed)));
}

export function baseScaleForStyle(options: SeedUvOptions = {}): number {
  const paintStyle = options.paintStyle ?? AQ_OILED_PAINT_STYLE;
  const uvScale = options.uvScale ?? AK47_UV_SCALE;
  const weaponLength = options.weaponLength ?? AK47_WEAPON_LENGTH;
  const patternScale = options.patternScale ?? AQ_OILED_PATTERN_SCALE;
  // isitabluegem: if (paint_style == 3 || paint_style == 6) scale = weapon_length * 0.027777778
  if (paintStyle === 3 || paintStyle === 6) {
    return weaponLength * INV_PATTERN_SHEET_INCHES * patternScale;
  }
  return uvScale * patternScale;
}

/**
 * Extra translation after R×S. Copied from pattern.wiki's published snippet
 * (and the same equations on isitabluegem). Note extraY uses extraX, not a
 * standard 2D rotation of (invScale, invScale).
 */
export function extraOffset(scale: number, rotationDeg: number): { extraX: number; extraY: number } {
  const invScale = 0.5 / scale;
  const angle = -rotationDeg * (Math.PI / 180);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const extraX = invScale * cos - invScale * sin;
  const extraY = extraX * sin + invScale * cos;
  return { extraX, extraY };
}

/** Build A = T₂ × R × S × T₁ (column-vector, multiply on the left). */
export function composePatternMatrix(
  translateX: number,
  translateY: number,
  rotationDeg: number,
  scale: number,
): LayerUv {
  const t1x = translateX - 0.5;
  const t1y = translateY - 0.5;
  const { extraX, extraY } = extraOffset(scale, rotationDeg);

  const theta = rotationDeg * (Math.PI / 180);
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);

  // R * S
  const a = scale * cos;
  const b = -scale * sin;
  const c = scale * sin;
  const d = scale * cos;

  // R * S * T₁ translation, then + T₂
  const preX = scale * t1x;
  const preY = scale * t1y;
  const tx = cos * preX - sin * preY + extraX;
  const ty = sin * preX + cos * preY + extraY;

  return {
    translateX,
    translateY,
    rotationDeg,
    scale,
    extraX,
    extraY,
    matrix: { a, b, tx, c, d, ty },
  };
}

export function applyAffine(m: Affine2D, x: number, y: number): { x: number; y: number } {
  return { x: m.a * x + m.b * y + m.tx, y: m.c * x + m.d * y + m.ty };
}

function layerFromRng(
  rng: UniformRandomStream,
  scale: number,
  scaleMultRange: readonly [number, number] | null,
): LayerUv {
  const scaleMult = scaleMultRange
    ? rng.randomFloat(scaleMultRange[0], scaleMultRange[1])
    : 1;
  const translateX = rng.randomFloat(0, 1);
  const translateY = rng.randomFloat(0, 1);
  const rotationDeg = rng.randomFloat(0, 360);
  return composePatternMatrix(translateX, translateY, rotationDeg, scale * scaleMult);
}

/**
 * Deterministic seed → UV. Same integer seed always returns bit-identical
 * floats (Object.is on every matrix component).
 */
export function seedToPatternUv(seed: number, options: SeedUvOptions = {}): SeedPatternUv {
  const clamped = clampSeed(seed);
  const baseScale = baseScaleForStyle(options);
  const rng = new UniformRandomStream();
  rng.setSeed(clamped);

  // Pattern: translateX, translateY, rotate — scale is NOT drawn from the RNG.
  // Wear / grunge: scaleMult, translateX, translateY, rotate.
  // Draw order from isitabluegem "Generate Random Values" table.
  const pattern = layerFromRng(rng, baseScale, null);
  const wear = layerFromRng(rng, baseScale, [WEAR_SCALE_MULT_MIN, WEAR_SCALE_MULT_MAX]);
  const grunge = layerFromRng(rng, baseScale, [WEAR_SCALE_MULT_MIN, WEAR_SCALE_MULT_MAX]);

  return { seed: clamped, baseScale, pattern, wear, grunge };
}

export function affineEquals(a: Affine2D, b: Affine2D): boolean {
  return (
    Object.is(a.a, b.a) &&
    Object.is(a.b, b.b) &&
    Object.is(a.tx, b.tx) &&
    Object.is(a.c, b.c) &&
    Object.is(a.d, b.d) &&
    Object.is(a.ty, b.ty)
  );
}
