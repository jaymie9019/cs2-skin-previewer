# Milestone 8 — paint-style coverage on AK

Representative set of official AK-47 kits that actually look like themselves.
Not all 61. No Fade. No map IBL (M9). No Skincraft/Skinshotter source.

## Checklist

- [x] ≥8 interactive ViewerKits (existing 3 stay; new ones added).
- [x] ≥4 workshop styles: Hydrographic (2), Spray-Paint (3), Anodized Multicolored (5), Custom Paint Job (7), Patina (8), Gunsmith (9).
- [x] Priority kits: Safari Mesh 72, Blue Laminate 226, Redline 282, Hydroponic 456, Fuel Injector 524, Bloodsport 639.
- [x] Existing calibrated kits stay: Case Hardened 44 (metal-only), Jungle Spray 122 (spray mask), Red Laminate 14 (furniture + grainWindow).
- [x] Official PNGs extracted with Source2Viewer-CLI 20.0; gitignored. Commands in `assets/paints/README.md`.
- [x] `docs/MILESTONE_8.md` + baselines under `tests/baselines/` + tag `milestone-8`.
- [x] Existing vitest suite stays green. Catalog / query / custom-albedo tests updated.

## Viewer kits

| paint index | internal | English | 中文 | style | mask | notes |
| ---: | --- | --- | --- | --- | --- | --- |
| 44 | `aq_oiled` | Case Hardened | 表面淬火 | 8 Patina | metal | keep; FN seed 923 float 0.0558851957321166 |
| 122 | `sp_spray_jungle` | Jungle Spray | 丛林涂装 | 3 Spray-Paint | spray | keep |
| 14 | `hy_ak47lam` | Red Laminate | 红色层压板 | 2 Hydrographic | furniture | keep; MW seed 796 float 0.1412112265825271 |
| 72 | `sp_mesh_tan` | Safari Mesh | 狩猎网格 | 3 Spray-Paint | spray | tan mesh camo; scale 1.75 |
| 226 | `hy_ak47lam_blue` | Blue Laminate | 蓝色层压板 | 2 Hydrographic | furniture | same official film as 14, blue `g_vColor0..3`; wear 0.02–0.4 |
| 282 | `cu_ak47_cobra` | Redline | 红线 | 7 Custom Paint Job | metal | UV-aligned albedo; wood furniture stays |
| 456 | `am_bamboo_jungle` | Hydroponic | 水栽竹 | 5 Anodized Multicolored | metal | nested RGB + candy metalness |
| 524 | `gs_ak47_supercharged` | Fuel Injector | 燃料喷射器 | 9 Gunsmith | spray | custom-like albedo (no patina split) |
| 639 | `gs_ak47_bloodsport` | Bloodsport | 血腥运动 | 9 Gunsmith | spray | custom-like albedo; wear 0–0.45 |

Leftover listed kits (Fire Serpent 180, …) stay vanilla + “preview not implemented / 尚未做涂装”.

## vmat citations

All decompiled with `--game /workspace/cs2/game/csgo/gameinfo.gi` from `pak01_dir.vpk`.
`F_PAINT_STYLE` is 0-indexed vs items_game style (`items_game = F_PAINT_STYLE + 1`).

| kit | vmat | F_PAINT_STYLE | ignore size | scale | roughness | metalness | `g_tPattern` |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 72 | `sp_mesh_tan.vmat` | 2 | 0 | 1.75 | *(omit → 0.6 spray default)* | *(omit → 0.12)* | `paints/spray/chainlink.png` |
| 226 | `hy_ak47lam_blue.vmat` | 1 | 1 | 1 | 0.45 | *(omit → 0.08)* | `paints/hydrographic/laminate_ak47.png` (same `…psd_2ce8f5f0.vtex` as kit 14) |
| 282 | `cu_ak47_cobra.vmat` | 6 | 1 | 1 | *(omit → 0.4)* | 1 | `paints/custom/workshop/elegantredv1_1.png` |
| 456 | `am_bamboo_jungle.vmat` | 4 | 1 | 1.4 | 0.6 | *(omit → 0.88 anodized)* | `paints/anodized_multi/bamboo_jungle.png` |
| 524 | `gs_ak47_supercharged.vmat` | 8 | 1 | 1 | 0.4 | 0 | `paints/gunsmith/workshop/ak47_supercharged.png` |
| 639 | `gs_ak47_bloodsport.vmat` | 8 | 1 | 1 | 0.4 | 1 | `paints/gunsmith/workshop/ak47_bloodsport.png` |

## Formula implemented

- Styles 2 / 3: existing nested RGB (`pattern.wiki`). Style 5 uses the same nested lerp + mask G/B; wear to substrate; metal mask.
- Style 7 / 9: sample the pattern as sRGB albedo in weapon UV (`uvAligned`). Wear fades the paint mask (same smoothstep as hydrographic). Grunge still multiplies. Not a nested-RGB Fade.
- Per-kit mask unchanged: metal / spray / furniture from HD `weapon_rif_ak47_masks.png` + cavity A.
- `ignoreWeaponSizeScale` still drives seed *scale* only. UV identity is `uvAligned` or `grainWindow` (so Hydroponic can tile at scale 1.4).
- Lighting stays M6 RoomEnvironment.

Sources:

- https://www.counter-strike.net/workshop/workshopfinishes/
- https://pattern.wiki/wiki/pattern_colors
- Local vmats listed above + `weapon_rif_ak47_composite_inputs.vmat`

## How to run

From the repo root install deps then start the workspace dev server.
The page is http://127.0.0.1:5173/ — left catalog, Live badges on the nine kits.
Query `kit=72` / `kit=226` / `kit=282` / `kit=456` / `kit=524` / `kit=639`.
Official PNGs are gitignored. Extract as in `assets/paints/README.md` if missing.
Tests: from `apps/web`, `npx vitest run`.

## Tests

From `apps/web`: `npx vitest run`.

- `KITS.length >= 8`, distinct styles ≥ 4
- New kits exist in official JSON; names en/zh match
- `hasPaintPreview` true for 14 / 44 / 72 / 122 / 226 / 282 / 456 / 524 / 639; false for 180 Fire Serpent
- Share URL: `kit=72` / `226` / `282` resolve to ViewerKits; `kit=38` / fade still rejected
- Wear clamp for 226 still 0.02–0.4
- Nested RGB / patina tests unchanged
- `mixCustomAlbedo` + style-5 nested tests

## Screenshots

Fixed camera when `capture=1`, 1280×720, headless Chrome + SwiftShader. Hold `/m8-hold.png` + POST `/m8-release`.

- tests/baselines/m8_kit72_safari_mesh.png
- tests/baselines/m8_kit226_blue_laminate.png — float 0.15 (inside 0.02–0.4)
- tests/baselines/m8_kit282_redline.png
- tests/baselines/m8_kit639_bloodsport.png
- tests/baselines/m8_kit44_case_hardened.png — seed 923 float 0.056
- tests/baselines/m8_kit14_redlam_796.png — seed 796 float 0.1412

## What was built

- `apps/web/src/kits/catalog.ts` — six new ViewerKits
- `apps/web/src/kits/customAlbedoMix.ts` — style 7 / 9 albedo × grunge
- `apps/web/src/patternMaterial.ts` — style 5 / 7 / 9 branches
- `apps/web/src/main.ts` — `uvAligned` pattern matrix; `/m8-release`
- `docs/MILESTONE_8.md` + `assets/paints/README.md`

Official textures are not committed.

## Not in this milestone

- Remaining 52 listed kits (Fire Serpent, Asiimov, …)
- Gunsmith patina-on-metal split / extra PBR maps
- Pattern-alpha durability masking
- Map IBL / cubemaps (M9)
- More weapons, charms, nametag, StatTrak
- AK Fade / 渐变之色 (does not exist)
