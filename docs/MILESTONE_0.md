# Milestone 0 — CS2 AK-47 glTF export

Acceptance for M0 only (no Vite / Three.js).

## Checklist

- [x] Disk space checked before download (`df -h`: 115G free of 126G; proceeded).
- [x] SteamCMD installed at `/home/box/steamcmd` (Linux tarball, client `1785799152`).
- [x] CS2 AppID 730 downloaded with **anonymous** login into `/workspace/cs2`.
- [x] Install complete: BuildID `24828357`, 71,154,568,564 bytes on disk, state Fully Installed.
- [x] Source2Viewer-CLI 20.0 (`20.0.6980+a06886f7d06049052d32a7381ec05523064a2ca0`) at `/workspace/tools/source2viewer/Source2Viewer-CLI`.
- [x] AK-47 `vmdl_c` located: `weapons/models/ak47/weapon_rif_ak47.vmdl_c` in `/workspace/cs2/game/csgo/pak01_dir.vpk`.
- [x] Exported glb: `/workspace/cs2-skin-previewer/assets/ak47.glb`
- [x] Size: **3,249,936 bytes** (3.1M)
- [x] Valid glTF: `file` reports `glTF binary model, version 2`; magic `glTF`, JSON + BIN chunks, asset.version `2.0`.
- [x] Looks like the rifle: scene `weapon_rif_ak47.vmdl_c`; meshes `body_legacy` + `body_hd`; materials `ak47`, `weapon_rif_ak47`, `sticker_gaps`; 9 embedded textures.
- [x] Repeatable commands documented in `docs/paths.md`.
- [x] Official VPKs / full textures not placed in a public-looking tree; `.gitignore` covers them.
- [ ] Visual check in a viewer (M1 Three.js) — out of scope for M0.

## Not started (later milestones)

- Vite + Three.js previewer (M1)
- Skin / finish / sticker application
