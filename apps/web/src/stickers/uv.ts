/**
 * AK-47 sticker UV: mesh TEXCOORD_1 + StickerMarkup / g_vStickerNOffset+Scale.
 *
 * Slot centers live at uv1 = (0.5, 0.5) + offset so a scale of ~14 maps a
 * small island on the receiver unwrap to the 0–1 sticker texture.
 * body_hd StickerMarkup (Index 0–3); slot 4 is unused (scale 0).
 * sticker_gaps.vmat carries the same four offsets.
 *
 *   stickerUv = rotate((uv1 - 0.5 - offset) * scale) + 0.5
 *
 * Approximate — not pixel-identical CS2. Source:
 *   local weapon_rif_ak47.vmdl StickerMarkup + weapon_rif_ak47.vmat extras
 *   https://www.counter-strike.net/workshop/workshopstickers/
 */
import type { StickerSlot } from "./slots";

export type StickerSlotMarkup = {
  offset: readonly [number, number];
  scale: number;
};

/** HD AK-47 body_hd / weapon_rif_ak47.vmat / sticker_gaps.vmat slots 0–3. */
export const AK47_STICKER_MARKUP: readonly StickerSlotMarkup[] = [
  { offset: [0.148, -0.434], scale: 14.1 },
  { offset: [0.061, -0.434], scale: 14.1 },
  { offset: [-0.025, -0.435], scale: 14.6 },
  { offset: [-0.164, -0.444], scale: 14.7 },
];

export function slotCenterUv1(slotIndex: number): [number, number] {
  const slot = AK47_STICKER_MARKUP[slotIndex];
  return [0.5 + slot.offset[0], 0.5 + slot.offset[1]];
}

export function stickerUv(
  uv1: readonly [number, number],
  slotIndex: number,
  user: Pick<StickerSlot, "offsetX" | "offsetY" | "rotationDeg">,
): [number, number] {
  const slot = AK47_STICKER_MARKUP[slotIndex];
  const ox = slot.offset[0] + user.offsetX;
  const oy = slot.offset[1] + user.offsetY;
  let x = (uv1[0] - 0.5 - ox) * slot.scale;
  let y = (uv1[1] - 0.5 - oy) * slot.scale;
  const r = (user.rotationDeg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  const rx = c * x - s * y;
  const ry = s * x + c * y;
  return [rx + 0.5, ry + 0.5];
}

export function stickerUvInside(uv: readonly [number, number], eps = 1e-5): boolean {
  return uv[0] >= -eps && uv[0] <= 1 + eps && uv[1] >= -eps && uv[1] <= 1 + eps;
}
