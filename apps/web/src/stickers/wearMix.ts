/**
 * Approximate CS2 sticker wear. Not pixel-identical.
 *
 * Workshop (https://www.counter-strike.net/workshop/workshopstickers/):
 *   "You don't have to put any scratches or grime in the sticker texture —
 *    wear effects are added automatically."
 *   $UnWearStrength (default 0.1): alpha > 30/255 resists wear so important
 *   art stays readable. Engine also samples g_tStickerScratches plus
 *   g_flStickerNWear / g_vWearBiasStickerN / TextureWearMaskStickerN.
 *
 * This lerp/erode is a stand-in: coverage from the wear mask, scratches
 * from the shared engine map, UnWear reduces the scrape amount.
 */
export const UNWEAR_STRENGTH = 0.1;

export function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.min(1, Math.max(0, v));
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

/** Wear-mask luma → binary-ish coverage (extracted -A.png is a dark silhouette). */
export function stickerCoverage(mask: number): number {
  return smoothstep(0.02, 0.08, mask);
}

/**
 * Remaining sticker alpha after engine-applied wear.
 * coverage / unwear typically come from TextureWearMask (extracted -A.png).
 */
export function stickerWearAlpha(
  coverage: number,
  unwear: number,
  scratches: number,
  wear: number,
): number {
  const w = clamp01(wear);
  const worn = clamp01(w * (0.35 + 0.65 * clamp01(scratches)) - clamp01(unwear) * UNWEAR_STRENGTH);
  const remain = 1 - smoothstep(0.05, 0.92, worn);
  return clamp01(coverage) * remain;
}

/** Paper backing mix: worn paper shows as the printed layer erodes. */
export function paperBackingMix(printRgb: readonly [number, number, number], wear: number): [number, number, number] {
  const paper: [number, number, number] = [0.78, 0.72, 0.62];
  const t = clamp01(wear) * 0.45;
  return [
    printRgb[0] * (1 - t) + paper[0] * t,
    printRgb[1] * (1 - t) + paper[1] * t,
    printRgb[2] * (1 - t) + paper[2] * t,
  ];
}
