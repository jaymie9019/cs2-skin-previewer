/**
 * Extracted sticker subset + id lookup against data/stickers.json.
 * Official PNGs stay gitignored; see assets/stickers/README.md.
 */
import subset from "../../../../data/sticker_subset.json";

export type StickerStyle = "paper" | "holo";

export type ExtractedSticker = {
  id: number;
  name: string;
  nameEn: string;
  nameZh: string;
  stickerMaterial: string;
  style: StickerStyle;
  colorPath: string;
  wearPath: string;
  holoMaskPath?: string;
  spectrumPath?: string;
};

export type StickerLookupRow = {
  id: number;
  name: string;
  name_en: string;
  name_zh: string;
  sticker_material: string | null;
};

type SubsetRow = {
  id: number;
  name: string;
  name_en: string;
  name_zh: string;
  sticker_material: string;
  style: StickerStyle;
  colorPath: string;
  wearPath: string;
  holoMaskPath?: string;
  spectrumPath?: string;
};

function fromRow(row: SubsetRow): ExtractedSticker {
  return {
    id: row.id,
    name: row.name,
    nameEn: row.name_en,
    nameZh: row.name_zh,
    stickerMaterial: row.sticker_material,
    style: row.style,
    colorPath: row.colorPath,
    wearPath: row.wearPath,
    holoMaskPath: row.holoMaskPath,
    spectrumPath: row.spectrumPath,
  };
}

export const EXTRACTED_STICKERS: readonly ExtractedSticker[] = (subset as SubsetRow[]).map(fromRow);

const extractedById = new Map(EXTRACTED_STICKERS.map((s) => [s.id, s]));

export function extractedSticker(id: number): ExtractedSticker | undefined {
  return extractedById.get(id);
}

export function stickerLabel(row: { nameEn?: string; name_en?: string; nameZh?: string; name_zh?: string; id: number }): string {
  const en = row.nameEn ?? row.name_en ?? "";
  const zh = row.nameZh ?? row.name_zh ?? "";
  if (en && zh) return `${en} / ${zh}`;
  return en || zh || `id ${row.id}`;
}

export function lookupStickerRow(catalog: readonly StickerLookupRow[], id: number): StickerLookupRow | undefined {
  return catalog.find((r) => r.id === id);
}

function stickerHaystack(row: StickerLookupRow): string {
  return [String(row.id), row.name, row.name_en, row.name_zh, row.sticker_material ?? ""]
    .join("\n")
    .toLowerCase();
}

/**
 * Case-insensitive substring match on id / internal name / en / 中文 / material.
 * id 0 (items_game default placeholder) is never returned.
 * Empty query returns the full usable catalog (UI shows the extracted subset).
 */
export function filterStickers(rows: readonly StickerLookupRow[], query: string): StickerLookupRow[] {
  const usable = rows.filter((r) => r.id > 0);
  const q = query.trim().toLowerCase();
  if (!q) return [...usable];
  return usable.filter((r) => stickerHaystack(r).includes(q));
}

export function isExtractedStickerId(id: number): boolean {
  return extractedSticker(id) != null;
}

