# CS2 skin previewer

Local-only 3D preview of CS2 AK-47 and Glock-18 (glTF) using Vite + TypeScript + Three.js.

Official Valve assets stay on this machine. Do not publish VPKs, extracted textures, or packed glbs.
This repo is local-dev only.

## What works if you clone without CS2
In git: Vite viewer, shareable URLs, catalog JSON, tests, assets/ak47.glb + assets/glock.glb (mesh only).
Not in git (needed to texture the inspect): sidecar PNGs next to the glb, assets/paints/, assets/composite/, assets/stickers/.
Extract commands: docs/paths.md, assets/paints/README.md, assets/stickers/README.md, scripts/extract_items_game.py (see docs/ITEMS_GAME.md).

## How to run

Install dependencies at the repo root, then start the Vite dev server (workspace script `dev`, or the same script inside `apps/web`).

The page is http://127.0.0.1:5173/ — left catalog of official AK-47 or Glock-18 kits, drag to orbit. Switch weapon in the HUD or via `weapon=`.

The viewer loads `assets/ak47.glb` via a `apps/web/public/assets` symlink so GLTFLoader can resolve the sibling official PNGs. Those PNGs are gitignored.
Changing Kit / Seed / Float / stickers / view / background updates the query string with history.replaceState.

Static catalog tables: http://127.0.0.1:5173/catalog/ak47.html and http://127.0.0.1:5173/catalog/glock.html

## Shareable URL (M6–M12)
Opening a URL restores the same inspect. Grammar: weapon=ak47|glock (aliases: ak-47, weapon_ak47, ak / glock-18, glock18, weapon_glock), kit=<official paint index or slug for that weapon>, seed=0-999, float (clamped to that kit’s wear remap unless unlock=1), sN=id,x,y,rot,wear (N=0..3), view=inspect|front|back, bg=studio|warm|cool|sun, st=1 or st=<kills>, name=<text>. Unknown weapon (awp) rejected. Kit must be official for the selected weapon: kit=38 Fade is accepted on Glock and rejected on AK; kit=44 Case Hardened is accepted on AK and rejected on Glock (falls back to Fade). Official listed kits without a shader show vanilla glTF + “尚未做涂装”. Live AK: 14 / 44 / 72 / 122 / 226 / 282 / 456 / 524 / 639. Live Glock: 38 Fade / 3 Candy Apple. Full grammar: docs/MILESTONE_11.md. M12 deepens Fade / Hydroponic / extra maps: docs/MILESTONE_12.md.
Example: ?weapon=ak47&kit=44&seed=923&float=0.056&s0=259,0.02,-0.01,15,0.4
Example: ?weapon=glock&kit=38
Example: ?weapon=ak47&kit=44&st=1&name=jaymie

## Compliance

- Local assets only. The `assets/ak47.glb` export and sidecar PNGs are a local-dev convenience.
- `.gitignore` excludes `node_modules/`, `assets/**/*.png`, `assets/*.packed.glb`, VPKs, and the CS2 install.
- Do not copy `/workspace/cs2` or any `*.vpk` into a public-looking tree or git remote.
- Also gitignored: data/raw/ (Valve items_game dump) and docs/reference/ (in-game inspects). Do not commit official textures.

Typical commands from the repo root: `npm install` then `npm run dev`.
From `apps/web`: `npm install` then `npm run dev`.

## Kits + seed + float (M4)

The left catalog lists official kits for the current weapon (`data/ak47_paint_kits.json` = 61, no Fade; `data/glock_paint_kits.json` includes kit 38 Fade / 渐变之色). Nine have a live paint shader. Labels are English + 中文. Query `kit=44` / `kit=122` / `kit=14` / `kit=72` / `kit=226` / `kit=282` (or slug). Seed (0-999) and Float (clamped to the kit remap) still update live. `capture=1` or `fixed=1` locks the camera.

- Case Hardened / 表面淬火 (44, style 8) — metal-only Patina
- Jungle Spray / 丛林涂装 (122, style 3) — matte camo on receiver + furniture
- Red Laminate / 红色层压板 (14, style 2) — hydrographic on wood furniture
- Safari Mesh / 狩猎网格 (72, style 3) — tan spray mesh
- Blue Laminate / 蓝色层压板 (226, style 2) — furniture plywood, blue palette
- Redline / 红线 (282, style 7) — custom wrap on metal
- Hydroponic / 水栽竹 (456, style 5) — anodized metal
- Fuel Injector / 燃料喷射器 (524, style 9) — gunsmith albedo
- Bloodsport / 血腥运动 (639, style 9) — gunsmith albedo

Official PNGs are gitignored; see `assets/paints/README.md`.

Tests: from `apps/web`, `npx vitest run` (or `apps/web/run-tests.sh`). Notes: `docs/MILESTONE_4.md`.

## Stickers (M5 + M10)

Up to **4** layers on the AK via mesh `TEXCOORD_1` + `StickerMarkup` offsets (not world-space quads). Query `s0=id,x,y,rot,wear` (s1–s3). `s4` is rejected. Empty slot / id `0` is a no-op. UI: searchable picker over `data/stickers.json` (en / 中文 / id). Extracted subset (Dinked 259, Aces High, Aces High Holo, Lucky 13, Firestarter Holo) applies real textures; catalog-only ids store the slot and show “not extracted / 未导出” without borrowing another sticker’s art. Wear is an approximation of engine-applied scrape + UnWear (https://www.counter-strike.net/workshop/workshopstickers/). Official sticker PNGs are gitignored; see `assets/stickers/README.md`. Notes: `docs/MILESTONE_5.md`, `docs/MILESTONE_10.md`.

## Inspect extras (M10)

StatTrak toggle (`st=1` / `st=<kills>`) draws an authored LCD plate on the receiver (not a CS2 mesh). Nametag (`name=`, 20 chars, 中文 ok) draws a small plate. Charm / keychain is stubbed — no clean local extract; HUD says “coming later / 未接入” and `charm=` is rejected. Notes: `docs/MILESTONE_10.md`.

## Lighting (M6 + M9)

`bg=` selects an environment (PMREM IBL) plus a matching plate. Default `studio` is the M6 RoomEnvironment bake (same lights) so Case Hardened / Red Laminate stay in class. `warm` / `cool` / `sun` are authored Three scenes — dusty courtyard, overcast, high-sun key — not ripped map cubemaps or Skincraft videos. Metal reads reflections; still approximate. Notes: docs/MILESTONE_6.md, docs/MILESTONE_9.md.

## Glock-18 (M11) + shader fidelity (M12)

Second weapon from the same pipeline. `weapon=glock` loads `assets/glock.glb` + the official Glock catalog. Live kits: Fade / 渐变之色 (38, community fade-percent 80–100 + official 1D LUT) and Candy Apple / 红苹果 (3, solid Color1 — `so_red.vmat` has no pearl). Hydroponic gets a chrome undercoat; Redline wires its roughness map; Fuel Injector wires its normal. Still WebGL2, not WebGPU. Notes: `docs/MILESTONE_11.md`, `docs/MILESTONE_12.md`.

## Catalog HUD (M7)

All 61 official AK-47 kits from `data/ak47_paint_kits.json` are listed (en + 中文). Search filters the left panel. Click a row to inspect. Wear slider is clamped to that kit’s remap (Blue Laminate 0.02–0.4, Redline 0.1–0.7, …); check Unlock 0–1 to ignore it. View: Inspect / Front / Back. Background / lighting: Studio / Warm / Cool / Sun (`bg=` selects IBL, not just a plate). Nine kits have a live paint shader (14 / 44 / 72 / 122 / 226 / 282 / 456 / 524 / 639); the other 52 fall back to the unpainted AK plus a “preview not implemented / 尚未做涂装” badge. Static table: `/catalog/ak47.html`. Notes: `docs/MILESTONE_7.md`, `docs/MILESTONE_8.md`.

## Paint styles (M8)

Representative live set — not all 61. Styles covered: Hydrographic, Spray-Paint, Anodized Multicolored, Custom Paint Job, Patina, Gunsmith. Official PNGs stay gitignored. Notes: `docs/MILESTONE_8.md`.

## Environment lighting (M9)

Authored IBL looks. `bg=studio|warm|cool|sun`. Default studio. Official CS2 cubemaps were found locally and are not committed. Notes: `docs/MILESTONE_9.md`, `assets/env/README.md`.
