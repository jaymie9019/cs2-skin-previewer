/**
 * Patina / antiqued (items_game style 8, vmat F_PAINT_STYLE 7) wear mix.
 *
 * Port of CS:GO `customweapon_ps20b.fxc` PAINTSTYLE==8, which is the same
 * compositing the workshop finish docs describe for Patina and that
 * isitabluegem documents for Case Hardened aging:
 *   scratches come from a threshold/remap of the wear map vs float
 *   (not a generic lerp of the whole albedo toward dirt);
 *   Case Hardened ages by tint + grime, and only reveals "base metal"
 *   where the wear map passes the float threshold.
 *
 * Sources:
 *   https://www.counter-strike.net/workshop/workshopfinishes/
 *   https://www.counter-strike.net/workshop/wf_patina
 *   https://www.isitabluegem.com/insights
 *   https://www.isitabluegem.com/zh-CN/insights
 *   https://pattern.wiki/wiki/pattern_colors  (nested RGB mix is styles 1–6, not 8)
 *   local aq_oiled.vmat (g_vColor0..3, g_flPaintRoughness)
 *   local weapon_rif_ak47_composite_inputs.vmat (HD paint mask / cavity)
 *
 * Color roles (workshop Patina):
 *   color0 Base Metal — revealed through scratches
 *   color1 Patina Tint — newly applied patina
 *   color2 Patina Wear — aged patina
 *   color3 Grime — oil / oxide in cavities
 *
 * Kit 44 (aq_oiled) has no color0–3 in items_game.txt; these are the
 * vmat defaults, used as tints on the already colour-ramped oiled.png.
 */

export type Rgb = readonly [number, number, number];
export type RgbMut = [number, number, number];

/** aq_oiled.vmat g_vColor0 — Base Metal */
export const PATINA_COLOR0: Rgb = [0.945098, 0.901961, 0.866667];
/** aq_oiled.vmat g_vColor1 — Patina Tint */
export const PATINA_COLOR1: Rgb = [0.756863, 0.733333, 0.698039];
/** aq_oiled.vmat g_vColor2 — Patina Wear */
export const PATINA_COLOR2: Rgb = [0.752941, 0.694118, 0.631373];
/** aq_oiled.vmat g_vColor3 — Grime */
export const PATINA_COLOR3: Rgb = [0.105882, 0.105882, 0.113725];

/** Painted-metal roughness. vmat g_flPaintRoughness is 0.4; slightly
 *  smoother so FN Case Hardened reads as shiny metal, not gray plastic. */
export const PATINA_PAINT_ROUGHNESS = 0.28;
/** Metallic response on painted (patina) pixels. Wood keeps the glTF ORM. */
export const PATINA_PAINT_METALNESS = 0.92;
/** aq_oiled.vmat g_flColorBrightness — keep FN pattern from going muddy in PBR. */
export const PATINA_PATTERN_GAIN = 1.8;

export function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.min(1, Math.max(0, x));
}

export function clampFloat(x: number): number {
  return clamp01(x);
}

/** GLSL smoothstep. */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerp3(a: Rgb, b: Rgb, t: number): RgbMut {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

export function mul3(a: Rgb, b: Rgb): RgbMut {
  return [a[0] * b[0], a[1] * b[1], a[2] * b[2]];
}

export function scale3(a: Rgb, s: number): RgbMut {
  return [a[0] * s, a[1] * s, a[2] * s];
}

/** Rec.601 luma used in customweapon_ps20b.fxc. */
export function luma(rgb: Rgb): number {
  return 0.3 * rgb[0] + 0.59 * rgb[1] + 0.11 * rgb[2];
}

/**
 * Paint-by-number × no-paint.
 * HD AK: masks.r is the Patina/anodized region (metal). cavity.a is
 * TextureNoPaint (barrel interior etc.). Wood is masks.r ≈ 0.
 *
 * Style 8 albedo mix in the shader is `lerp(paint, base, 1-masks.r)`,
 * i.e. paint where R is white. We also knock out no-paint.
 */
export function paintMask(masksR: number, noPaint = 0): number {
  return clamp01(masksR) * (1 - clamp01(noPaint));
}

/**
 * Wear-map vs float threshold. White in paint_wear wears first.
 * `smoothstep(0.1, 0.2, wear * ao * cavity^2 * float)`
 * Float 0 → 0 (no scratches). Higher float → more of the mask passes.
 */
export function patinaScratchBlend(wearTex: number, floatAmt: number, ao = 1, cavity = 1): number {
  return smoothstep(0.1, 0.2, wearTex * ao * cavity * cavity * floatAmt);
}

/**
 * How strongly tiled gun_grunge is mixed in.
 * `pow(1-cavity,4)*0.25 + 0.75*float` — crevices get a little dirt even
 * at low float; the 0.75*float term is the obvious wear darkening.
 */
export function grungeMixAmount(cavity: number, floatAmt: number): number {
  const c = clamp01(cavity);
  const f = clampFloat(floatAmt);
  return (1 - c) ** 4 * 0.25 + 0.75 * f;
}

export function oilRubBlend(cavity: number, ao: number, floatAmt: number, grungeLum: number): number {
  const x = clamp01(cavity * ao - floatAmt * 0.1) - grungeLum;
  return smoothstep(0, 0.15, x + 0.08);
}

export type PatinaMixInput = {
  pattern: Rgb;
  wearTex: number;
  grunge: Rgb;
  floatAmt: number;
  ao?: number;
  cavity?: number;
  color0?: Rgb;
  color1?: Rgb;
  color2?: Rgb;
  color3?: Rgb;
};

/**
 * Style-8 painted-metal albedo (linear). Does not apply the paint mask —
 * callers lerp this with the original glTF albedo using `paintMask()`.
 *
 * oiled.png is already the colour-ramped Case Hardened sheet, so float 0
 * returns the pattern at full strength (isitabluegem: FN = clean pattern).
 * The vmat color1–3 multiply would crush FN to gray; we scale that tint
 * and the grime/scratch terms by float instead. Do not multiply by AO
 * here — the glTF aoMap is applied later by Three.js.
 */
export function mixPatinaAlbedo(input: PatinaMixInput): RgbMut {
  const ao = input.ao ?? 1;
  const cavity = input.cavity ?? 1;
  const f = clampFloat(input.floatAmt);
  const c0 = input.color0 ?? PATINA_COLOR0;
  const c1 = input.color1 ?? PATINA_COLOR1;
  const c2 = input.color2 ?? PATINA_COLOR2;
  const c3 = input.color3 ?? PATINA_COLOR3;

  const flGrunge = input.grunge[0] * input.grunge[1] * input.grunge[2];
  const gAmt = grungeMixAmount(cavity, f);
  const cGrunge: RgbMut = [
    lerp(1, input.grunge[0], gAmt),
    lerp(1, input.grunge[1], gAmt),
    lerp(1, input.grunge[2], gAmt),
  ];

  const flPatinaBlend = patinaScratchBlend(input.wearTex, f, ao, cavity);
  const flOil = oilRubBlend(cavity, ao, f, flGrunge);

  const agedTint = lerp3(c1, c2, f);
  let cPatina = lerp3(input.pattern, mul3(input.pattern, agedTint), f);
  const grimeTint = lerp3(c1, c3, Math.pow(f, 0.5));
  cPatina = lerp3(cPatina, mul3(input.pattern, grimeTint), (1 - flOil) * f);

  const cScratches = scale3(c0, luma(input.pattern));
  cPatina = lerp3(cPatina, cScratches, flPatinaBlend);

  const cPaint = mul3(cPatina, cGrunge);
  return [clamp01(cPaint[0]), clamp01(cPaint[1]), clamp01(cPaint[2])];
}

/** Composite: wood/original where the engine mask says so, patina elsewhere. */
export function mixFinishAlbedo(base: Rgb, patina: Rgb, mask: number): RgbMut {
  return lerp3(base, patina, clamp01(mask));
}
