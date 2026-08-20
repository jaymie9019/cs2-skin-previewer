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
