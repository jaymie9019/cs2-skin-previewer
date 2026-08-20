# Milestone 1 — Vite + Three.js AK-47 viewer

Acceptance for M1 only (no seed / float / stickers).

## Checklist

- [x] Vite + TypeScript app in `apps/web` (strict-ish `tsconfig`, no leftover counter demo).
- [x] Three.js WebGL2 renderer + `GLTFLoader`.
- [x] Orbit camera via `OrbitControls` (drag to orbit, scroll to zoom).
- [x] PBR lighting: `HemisphereLight` + two `DirectionalLight`s, `MeshStandardMaterial` from the glTF, `outputColorSpace = SRGBColorSpace`.
- [x] Default AK materials read as wood + metal (not an unlit pink mesh).
- [x] Workspace `dev` script at repo root and `apps/web` both serve the page.
- [x] Browser can orbit the rifle at http://127.0.0.1:5173/
- [x] Fixed-camera baseline: `tests/baselines/m1.png` (1280x720, textured 3/4 view of the full rifle).
- [x] Local assets served without committing official PNGs (`apps/web/public/assets` -> `../../../assets`).
- [x] Root README with install / dev commands and a compliance note.
- [x] Git tag `milestone-1` after the M1 commit.

## How to run

From the repo root:

1. `npm install`
2. `npm run dev`

Or from `apps/web`:

1. `npm install`
2. `npm run dev`

Open http://127.0.0.1:5173/ and drag to orbit. Query `?capture=1` (or `?fixed=1`) locks the camera to the M1 baseline pose and hides the status overlay.

## What was built

| Path | Role |
| --- | --- |
| `apps/web/` | Vite 5 + TypeScript + Three r169 viewer |
| `apps/web/src/main.ts` | Scene, lights, GLTF load, orbit controls |
| `apps/web/public/assets` | Symlink to repo `assets/` so relative PNG URIs resolve |
| `package.json` | workspaces (`apps/web`) + root `dev` / `build` / `preview` |
| `tests/baselines/m1.png` | Fixed-camera screenshot of the default AK-47 |
| `README.md` | Install / run / compliance |

The viewer loads `/assets/ak47.glb` (M0 export, 3.1MB). GLTFLoader fetches sibling official PNGs next to that file (`ak47_color_*.png`, normals, ORM, …). Those PNGs stay gitignored.

`body_legacy` is hidden so only the HD mesh is shown (avoids z-fighting with the overlapping legacy body).

## Screenshot command

Dev server already running at http://127.0.0.1:5173/ . A Vite middleware holds document `load` on `/m1-hold.png` until the app POSTs `/m1-release` after the glTF is in the scene. Then:

    google-chrome-stable --headless=new --no-sandbox \
      --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader \
      --enable-webgl --ignore-gpu-blocklist --window-size=1280,720 \
      --screenshot=tests/baselines/m1.png \
      http://127.0.0.1:5173/?capture=1

Result: textured AK-47, wood furniture + metal receiver/magazine, full rifle in a 3/4 view. Textures came from `ak47.glb` + sibling PNGs (not the packed glb).

## Not started (later milestones)

- Seed / float / finish application (M2+)
- Stickers
- Skin picker UI
