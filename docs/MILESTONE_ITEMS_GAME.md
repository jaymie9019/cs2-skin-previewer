# Milestone — items_game.txt extract + study

Not kit-switch UI. Not Fade/Jungle shaders. Not sticker rendering. M3 Case Hardened viewer is unchanged.

## Checklist

- [x] `scripts/items/items_game.txt` extracted from `/workspace/cs2/game/csgo/pak01_dir.vpk` (CRC `00da1564c5`, 8.0M text). No `items_game_cdn` / split files under `scripts/items/`.
- [x] Localization: `resource/csgo_english.txt`, `csgo_schinese.txt`, `csgo_tchinese.txt` from the same VPK.
- [x] Raw dumps in `data/raw/` (**gitignored**). Repeatable commands in `docs/paths.md` and `docs/ITEMS_GAME.md`.
- [x] Schema studied from the real file (merged DLC blocks): `docs/ITEMS_GAME.md`.
- [x] AK-47 official skins: **61** `[kit]weapon_ak47` pairs. Full table + JSON. **Fade / 渐变之色 is not on AK-47.**
- [x] Wear: inspect float 0-1 vs `wear_remap_min`/`max`; FN/MW/FT/WW/BS bands documented.
- [x] Stickers: schema + `data/stickers.json` (11789) + 20-row sample in the study.
- [x] Derived catalogs committed (not Valve text): `data/ak47_paint_kits.json`, `data/stickers.json`, `data/paint_kits_all.json`.
- [x] Optional static page `apps/web/public/catalog/ak47.html` + screenshot `tests/baselines/items_game_ak47_catalog.png`.
- [x] Leftover M4 Fade selector **not** left in the live app (working tree restored to M3 Case Hardened).
- [x] Local git commit + tag `milestone-items-game` (no push).

## How to regenerate

Extract commands: `docs/paths.md`. Then `python3 scripts/extract_items_game.py`.

Catalog page (with Vite running): http://127.0.0.1:5173/catalog/ak47.html

## Findings (short)

| Question | Answer |
| --- | --- |
| Allowed AK kits | `[paint_kit_name]weapon_ak47` keys in `item_sets` / `client_loot_lists`. Not a field on item 7 / `weapon_ak47_prefab`. |
| `used_by_classes` | T-side only (`terrorists`). Not a skin filter. |
| AK kit count | 61 |
| Fade on AK | **No.** `aa_fade` → Glock + MAC-10. See study Fade section. |
| Stickers | `sticker_kits` by id; item 1209 is the tool; slots via attributes. 11789 kits. |
| Loc | Strip `#` from `#PaintKit_*_Tag` / `#StickerKit_*`; lookup `Tokens` in `csgo_english.txt` / `csgo_schinese.txt`. |

## Not started (later)

- Multi-kit switcher (must use this catalog; do not invent AK Fade)
- Extra paint shaders (Fade / Jungle / nested RGB)
- Sticker rendering
- Share URLs
