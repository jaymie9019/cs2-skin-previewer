# CS2 skin previewer

Local-only 3D preview of a CS2 AK-47 (glTF) using Vite + TypeScript + Three.js.

Official Valve assets stay on this machine. Do not publish VPKs, extracted textures, or packed glbs.

## How to run

Install dependencies at the repo root, then start the Vite dev server (workspace script `dev`, or the same script inside `apps/web`).

The page is http://127.0.0.1:5173/ — drag to orbit the rifle.

The viewer loads `assets/ak47.glb` via a `apps/web/public/assets` symlink so GLTFLoader can resolve the sibling official PNGs. Those PNGs are gitignored.

## Compliance

- Local assets only. The `assets/ak47.glb` export and sidecar PNGs are a local-dev convenience.
- `.gitignore` excludes `node_modules/`, `assets/**/*.png`, `assets/*.packed.glb`, VPKs, and the CS2 install.
- Do not copy `/workspace/cs2` or any `*.vpk` into a public-looking tree or git remote.

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
