/**
 * M5 sticker slots. items_game game_info.max_num_stickers is 5, but this
 * viewer is capped at 4 layers (product requirement). Slot 4 on the AK
 * vmat has scale 0 / unused.
 *
 * Query: s0=id,x,y,rot,wear  (s1 / s2 / s3). Extra keys s4+ are rejected.
 *   id   sticker_kits id from data/stickers.json (0 / omit = empty)
 *   x,y  inspect-style UV offset added to StickerMarkup / g_vStickerNOffset
 *   rot  degrees, added to g_flStickerNRotation
 *   wear 0–1 scrape amount (engine-applied; see wearMix.ts)
 *
 *   https://www.counter-strike.net/workshop/workshopstickers/
 */
export const MAX_STICKER_LAYERS = 4;

export type StickerSlot = {
  id: number;
  offsetX: number;
  offsetY: number;
  rotationDeg: number;
  wear: number;
};

export const EMPTY_SLOT: StickerSlot = {
  id: 0,
  offsetX: 0,
  offsetY: 0,
  rotationDeg: 0,
  wear: 0,
};

export function emptySlots(): StickerSlot[] {
  return [0, 1, 2, 3].map(() => ({ ...EMPTY_SLOT }));
}

export function clampWear(wear: number): number {
  if (!Number.isFinite(wear)) return 0;
  return Math.min(1, Math.max(0, wear));
}

export function clampOffset(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(0.5, Math.max(-0.5, value));
}

export function clampRotation(deg: number): number {
  if (!Number.isFinite(deg)) return 0;
  let d = deg % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

export function isEmptySlot(slot: StickerSlot): boolean {
  return slot.id === 0;
}

export function parseSlotValue(raw: string | null | undefined): StickerSlot {
  if (raw == null || raw.trim() === "") return { ...EMPTY_SLOT };
  const parts = raw.split(",").map((p) => p.trim());
  const id = Number(parts[0]);
  if (!Number.isFinite(id) || id <= 0) return { ...EMPTY_SLOT };
  return {
    id: Math.floor(id),
    offsetX: clampOffset(parts[1] === undefined || parts[1] === "" ? 0 : Number(parts[1])),
    offsetY: clampOffset(parts[2] === undefined || parts[2] === "" ? 0 : Number(parts[2])),
    rotationDeg: clampRotation(parts[3] === undefined || parts[3] === "" ? 0 : Number(parts[3])),
    wear: clampWear(parts[4] === undefined || parts[4] === "" ? 0 : Number(parts[4])),
  };
}

export function serializeSlot(slot: StickerSlot): string | null {
  if (isEmptySlot(slot)) return null;
  const x = slot.offsetX;
  const y = slot.offsetY;
  const r = slot.rotationDeg;
  const w = slot.wear;
  if (x === 0 && y === 0 && r === 0 && w === 0) return String(slot.id);
  return `${slot.id},${x},${y},${r},${w}`;
}

export type ParsedStickerQuery = {
  slots: StickerSlot[];
  rejected: string[];
};

export function parseStickerQuery(params: URLSearchParams): ParsedStickerQuery {
  const slots = emptySlots();
  const rejected: string[] = [];
  for (const key of params.keys()) {
    const m = /^s(\d+)$/i.exec(key);
    if (!m) continue;
    const index = Number(m[1]);
    if (index < 0 || index >= MAX_STICKER_LAYERS) {
      rejected.push(key.toLowerCase());
      continue;
    }
    slots[index] = parseSlotValue(params.get(key));
  }
  return { slots, rejected };
}

export function sameSlots(a: readonly StickerSlot[], b: readonly StickerSlot[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (
      x.id !== y.id ||
      x.offsetX !== y.offsetX ||
      x.offsetY !== y.offsetY ||
      x.rotationDeg !== y.rotationDeg ||
      x.wear !== y.wear
    ) {
      return false;
    }
  }
  return true;
}
