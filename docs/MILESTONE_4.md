# Milestone 4 — multi paint-kit switch (official AK-47 kits only)

Acceptance for M4 only. Three official kits from `data/ak47_paint_kits.json`.
**No Fade / 渐变之色** (not an AK-47 pairing). No stickers (M5). No lighting/IBL (M6 deferred).

## Checklist

- [x] Kit catalog in code imported from `data/ak47_paint_kits.json` (61 official rows). Viewer uses three of those indexes.
- [x] UI labels English + 中文 from `name_en` / `name_zh`. Query `kit=44` / `kit=122` / `kit=14` / slug.
- [x] Seed + float still work; switching kit changes the finish live.
- [x] Style 8 Patina (Case Hardened) kept, metal-only mask.
- [x] Style 3 spray (Jungle Spray) nested RGB; paints furniture + receiver; matte; not the CH metal-only mask.
- [x] Style 2 hydrographic (Red Laminate) nested RGB from pattern.wiki; furniture mask.
- [x] Textures extracted with Source2Viewer-CLI 20.0; official PNGs gitignored; commands in `assets/paints/README.md`.
- [x] Per-kit wood-vs-metal mask (not global).
- [x] Fixed-camera baselines under `tests/baselines/`.
- [x] `docs/MILESTONE_4.md`. Local git commit + tag `milestone-4` (no push).

## Viewer kits (from items_game)

| paint index | internal | English | 中文 | style | wear min | wear max | mask |
| ---: | --- | --- | --- | ---: | ---: | ---: | --- |
| 44 | `aq_oiled` | Case Hardened | 表面淬火 | 8 Patina | 0 | 1 | metal only (`masks.r`) |
| 122 | `sp_spray_jungle` | Jungle Spray | 丛林涂装 | 3 Spray-Paint | *(omit → 0)* | *(omit → 1)* | spray (`1 - TextureNoPaint`) |
| 14 | `hy_ak47lam` | Red Laminate | 红色层压板 | 2 Hydrographic | *(omit → 0)* | *(omit → 1)* | furniture (`1 - masks.r`) |

Wear omit → 0/1 is the catalog effective default (`wear_remap_min_effective` / `max_effective`).


## How to run

From the repo root install dependencies then start the workspace dev server.
The page is http://127.0.0.1:5173/ — Kit dropdown, Seed 0-999, Float 0-1.
Query kit= (index or slug), seed=, float=. capture=1 or fixed=1 locks the M1 camera.
Official PNGs are gitignored. Extract as in assets/paints/README.md if missing.
Tests: from apps/web, npx vitest run (or apps/web/run-tests.sh).

## Formula implemented

### Catalog

apps/web/src/kits/catalog.ts imports data/ak47_paint_kits.json. officialKit(index) throws if the index is not an official AK-47 pairing. Viewer extras (pattern path, vmat colors, mask mode) are keyed by that index. No hardcoded Fade kit.

### Seed to UV (M2 RNG, style-correct scale)

Same 11-float Valve draw. Base scale:
- Style 8: AK UVScale 0.549
- Style 3: weapon_length / 36 * patternScale (1.65 from sp_spray_jungle.vmat)
- g_bIgnoreWeaponSizeScale (Red Laminate): scale = patternScale = 1. Pattern UV is identity so the UV-authored film stays on furniture islands; seed still drives wear/grunge.

### Color mix

- Style 8: existing Patina mix (mixPatinaAlbedo). oiled.png is already colour-ramped.
- Styles 2 / 3: nested RGB from https://pattern.wiki/wiki/pattern_colors
  color = mix(mix(mix(C0, C1, R), C2, G), C3, B)
- Style 2: plus mask.g to C2, mask.b to C3. Wear to substrate via wear-map x float on the paint mask.
- Style 3: wear multiplies pattern RGB before the nested mix. Matte (roughness 0.6, metalness 0.12).

Style 3 officially uses triplanar projection (workshop). This viewer uses 2D UV with the documented style-3 scale. Colorization is the same formula.

### Per-kit mask

HD composite weapon_rif_ak47_masks.png + cavity A (TextureNoPaint).

| Kit | Mode | Coverage |
| --- | --- | --- |
| 44 Case Hardened | metal | step(0.4, masks.r) * (1 - noPaint) — receiver / mag / barrel; wood stays glTF |
| 122 Jungle Spray | spray | 1 - noPaint — camo on receiver AND furniture (stock + handguard + grip) + magazine. Not the CH metal-only mask. |
| 14 Red Laminate | furniture | (1 - step(0.4, masks.r)) * (1 - noPaint) — red laminate on wood only |

### Formula source URLs

- https://www.counter-strike.net/workshop/workshopfinishes/
- https://www.counter-strike.net/workshop/wf_patina
- https://pattern.wiki/wiki/pattern_colors
- https://www.isitabluegem.com/insights
- Local data/ak47_paint_kits.json (61 official AK kits)
- Local aq_oiled.vmat, sp_spray_jungle.vmat, hy_ak47lam.vmat
- Local weapon_rif_ak47_composite_inputs.vmat

## User in-game calibration

Jungle Spray reference: docs/reference/ingame_ak47_jungle_spray.png (gitignored).
Wavy olive / lime / brown camo on receiver and wood furniture (stock + handguard), magazine too. Barrel / front sight read as dark metal in that inspect (Dust 2 lighting). Matte, not metallic patina.
Case Hardened still matches the M3 inspect pair (seed 923 FN / seed 673 BS).

## Tests

From apps/web: npx vitest run.
Result on 2026-08-20: 48 passed (5 files). M2 seed tests and M3 patina tests kept green.
Assertions: 61 official kits, no Fade; viewer kits exist in the JSON; kit= index/slug; three distinct styles + masks; CH seed 661 regression; Jungle style-3 scale; Laminate ignoreWeaponSizeScale; nested RGB + spray wear + hydro override; per-kit mask wood/metal/spray.

## Screenshots

Fixed camera (M1 pose), 1280x720, headless Chrome + SwiftShader. Hold /m4-hold.png + POST /m4-release.

- tests/baselines/m4_kit44_case_hardened.png — kit=44&seed=923&float=0.056&capture=1
- tests/baselines/m4_kit122_jungle_spray.png — kit=122&seed=923&float=0.056&capture=1
- tests/baselines/m4_kit14_red_laminate.png — kit=14&seed=0&float=0.05&capture=1

## What was built

- apps/web/src/kits/catalog.ts — import official JSON, three viewer kits
- apps/web/src/kits/nestedRgbMix.ts — style 2/3 colorize
- apps/web/src/kits/kitPaintMask.ts — per-kit coverage
- apps/web/src/patternMaterial.ts — multi-style shader + live setKit
- apps/web/src/main.ts — kit dropdown, query kit=
- apps/web/src/seed/seedToPatternUv.ts — ignoreWeaponSizeScale
- Extracts (gitignored): assets/paints/sp_spray_jungle/camo_daubs.png, assets/paints/hy_ak47lam/laminate_ak47.png

body_legacy stays hidden. Sticker materials skipped. Official textures/VPKs/node_modules not committed.

## Not started (later milestones)

- Stickers (M5)
- Lighting / IBL / brightness (M6, user deferred)
- Shareable URLs as a product feature
