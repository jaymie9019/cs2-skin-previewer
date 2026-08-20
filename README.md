# CS2 skin previewer

Local-only 3D preview of a CS2 AK-47 (glTF) using Vite + TypeScript + Three.js.

Official Valve assets stay on this machine. Do not publish VPKs, extracted textures, or packed glbs.
This repo is local-dev only.

## What works if you clone without CS2
In git: Vite viewer, shareable URLs, catalog JSON, tests, assets/ak47.glb (mesh only).
Not in git (needed to texture the inspect): sidecar PNGs next to the glb, assets/paints/, assets/composite/, assets/stickers/.
Extract commands: docs/paths.md, assets/paints/README.md, assets/stickers/README.md, scripts/extract_items_game.py (see docs/ITEMS_GAME.md).

## How to run

Install dependencies at the repo root, then start the Vite dev server (workspace script `dev`, or the same script inside `apps/web`).

The page is http://127.0.0.1:5173/ — left catalog of 61 official AK-47 kits, drag to orbit the rifle.

The viewer loads `assets/ak47.glb` via a `apps/web/public/assets` symlink so GLTFLoader can resolve the sibling official PNGs. Those PNGs are gitignored.
Changing Kit / Seed / Float / stickers / view / background updates the query string with history.replaceState.

Static catalog table (search + inspect links): http://127.0.0.1:5173/catalog/ak47.html

## Shareable URL (M6 + M7)
Opening a URL restores the same inspect. Grammar: weapon=ak47 (only AK for now), kit=<official paint index or slug>, seed=0-999, float (clamped to that kit’s wear remap unless unlock=1), sN=id,x,y,rot,wear (N=0..3), view=inspect|front|back, bg=studio|warm|cool. Unknown kit (fade / 38 / 999) and s4 are rejected. Official listed kits without a shader (e.g. kit=72 Safari Mesh) are accepted and show the vanilla AK. Full grammar: docs/MILESTONE_7.md.
Example: ?weapon=ak47&kit=44&seed=923&float=0.056&s0=259,0.02,-0.01,15,0.4
Example: ?weapon=ak47&kit=226&view=front&bg=warm

## Compliance

- Local assets only. The `assets/ak47.glb` export and sidecar PNGs are a local-dev convenience.
- `.gitignore` excludes `node_modules/`, `assets/**/*.png`, `assets/*.packed.glb`, VPKs, and the CS2 install.
- Do not copy `/workspace/cs2` or any `*.vpk` into a public-looking tree or git remote.
- Also gitignored: data/raw/ (Valve items_game dump) and docs/reference/ (in-game inspects). Do not commit official textures.

Typical commands from the repo root: `npm install` then `npm run dev`.
From `apps/web`: `npm install` then `npm run dev`.

## Kits + seed + float (M4)

The Kit dropdown switches among three official AK-47 finishes from `data/ak47_paint_kits.json` (no Fade — AK-47 has none). Labels are English + 中文. Query `kit=44` / `kit=122` / `kit=14` (or slug). Seed (0-999) and Float (0-1) still update live. `capture=1` or `fixed=1` locks the camera.

- Case Hardened / 表面淬火 (44, style 8) — metal-only Patina
- Jungle Spray / 丛林涂装 (122, style 3) — matte camo on receiver + furniture
- Red Laminate / 红色层压板 (14, style 2) — hydrographic on wood furniture

Official PNGs are gitignored; see `assets/paints/README.md`.

Tests: from `apps/web`, `npx vitest run` (or `apps/web/run-tests.sh`). Notes: `docs/MILESTONE_4.md`.

## Stickers (M5)

Up to **4** layers on the AK via mesh `TEXCOORD_1` + `StickerMarkup` offsets (not world-space quads). Query `s0=id,x,y,rot,wear` (s1–s3). `s4` is rejected. Empty slot / id `0` is a no-op. UI: four slots, extracted subset (Dinked 259, Aces High, Aces High Holo, Lucky 13, Firestarter Holo) plus id lookup against `data/stickers.json`. Wear is an approximation of engine-applied scrape + UnWear (https://www.counter-strike.net/workshop/workshopstickers/). Official sticker PNGs are gitignored; see `assets/stickers/README.md`. Notes: `docs/MILESTONE_5.md`.

## Lighting (M6)

Dark studio background kept. RoomEnvironment PMREM gives approximate IBL so metal reflects something, plus a slightly stronger key light. Not Dust II / not Skincraft-accurate.

Tests: from apps/web, npx vitest run (or apps/web/run-tests.sh). Notes: docs/MILESTONE_6.md.

## Catalog HUD (M7)

All 61 official AK-47 kits from `data/ak47_paint_kits.json` are listed (en + 中文). Search filters the left panel. Click a row to inspect. Wear slider is clamped to that kit’s remap (Blue Laminate 0.02–0.4, Redline 0.1–0.7, …); check Unlock 0–1 to ignore it. View: Inspect / Front / Back. Background plates: Studio / Warm / Cool (solid colors we authored — not map videos). Kits 14 / 44 / 122 have a live paint shader; the other 58 fall back to the unpainted AK plus a “preview not implemented / 尚未做涂装” badge. Static table: `/catalog/ak47.html`. Notes: `docs/MILESTONE_7.md`.
