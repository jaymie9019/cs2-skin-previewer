# Roadmap after M6 — Skincraft-class inspect site (original implementation)

Product north star: a browser CS2 inspect site in the same *class* as Skincraft.gg
(catalog, live seed/float, stickers, map lighting, more weapons).

**Not a clone.** Do not copy Skincraft JS, WASM, WGSL, CDN assets, or shaders.
Implement from Workshop docs, local `items_game.txt`, Source 2 Viewer, and our
existing Three.js (or a later original WebGPU) stack.

M0–M6 stay as shipped (AK-47, 3 kits, stickers, share URL). New work is M7+.

## Already done (do not redo)

| Tag | What |
| --- | --- |
| milestone-0 | SteamCMD + AK-47 glTF |
| milestone-1 | Vite + Three.js viewer |
| milestone-2 | Seed → pattern UV |
| milestone-3 | Float / Patina wear (Case Hardened) |
| milestone-items-game | items_game + loc + 61 AK kits + stickers JSON |
| milestone-4 | 3 official kits (44 / 122 / 14) |
| milestone-5 | 4 sticker layers |
| milestone-6 | Shareable URL + conservative IBL |
| milestone-7 | Catalog HUD + wear clamp + views |
| milestone-8 | Representative live paint styles (9 kits / 6 styles) |

## Gap vs a Skincraft-class site

- Catalog UX (search, all skins, wear locked to real min/max)
- Only 3 of 61 AK kits have a paint shader
- Lighting is a studio RoomEnvironment, not map probes
- One weapon; no knives/gloves
- Stickers are a small subset; no charms / nametag / StatTrak
- Renderer is MeshStandard approximations, not a Source 2 material graph

## New milestones (strict order)

### M7 — Inspect HUD + AK catalog shell
Site chrome around the existing viewer.

- Index of all 61 official AK kits from `data/ak47_paint_kits.json` (en + 中文)
- Search / filter; click a kit to inspect
- Wear slider **clamped** to that kit’s `wear_remap_min/max` (unlock-to-0–1 optional)
- Front / Back camera presets
- Neutral or simple map *plate* background (our own stills/HDR, not third-party site videos)
- Kits without a shader still list correctly; preview falls back to a labeled placeholder or the default AK
- `docs/MILESTONE_7.md` + baselines + tag `milestone-7`

### M8 — Paint-style coverage on AK
**Done** (`milestone-8`): 9 live kits, 6 styles. Make more of the 61 kits actually look like themselves.

- Implement remaining workshop styles we do not have (at least custom / gunsmith / anodized as documented)
- Extract textures with Source2Viewer-CLI; gitignore official PNGs
- Priority kits: user-calibrated ones first (Case Hardened, Jungle Spray, Red Laminate stay), then common ones (Redline, Safari Mesh, Blue Laminate, …)
- Per-kit mask (metal / furniture / spray) from vmat + composite inputs
- Stop when a *representative set* (≥8 kits, ≥4 styles) is interactive and snapshotted — not all 61 in one milestone

### M9 — Map lighting (ours)
Close the “too dark” gap without copying anyone’s IBL.

- Local cubemap / HDR from CS2 `env_cubemap` extract **or** a generated studio HDR
- Map picker (names we choose; assets we extract or author)
- Metal reads reflections; keep share URL `bg=`
- Still approximate; no claim of CS2 pixel match

### M10 — Sticker catalog + inspect extras
- Picker backed by `data/stickers.json` (search en/zh); extract-on-select or a larger local subset
- Keep 4 slots, offset / rot / wear
- StatTrak counter mesh or overlay (visual)
- Nametag plate (text)
- Charm / keychain only if we find a clean local extract path; otherwise stub the slot and document

### M11 — More weapons
- Second weapon from the same pipeline (suggest AWP or Glock — Glock has Fade, which AK does not)
- items_game driven kit list per weapon
- URL `weapon=` already reserved

### M12 — Shader fidelity (original)
The hard look gap. **Write our own** materials from vmat / workshop / VRF, not from another site.

- Either deepen WebGL `OnBeforeCompile` toward `csgo_weapon` / `csgo_customweapon` parameters we decompile locally
- Or a new WebGPU path we author (WGSL we write)
- Pearlescence / anodized / composite order if the vmat asks for it
- Acceptance: same seed+float on Case Hardened and Red Laminate is *the same class* as in-game (HUMAN_REVIEW), still not 1:1

### M13 — Inspect links + ship notes
- Parse a Steam inspect URL / `S/A/D/M` params into kit, seed, float, stickers
- README for “how this site is hosted” + compliance (no Valve VPKs on a public CDN)
- Optional: screenshot export

## Working rules (unchanged)

1. One milestone at a time; report + screenshots + local commit + `git tag milestone-N`
2. Cite formula URLs in code
3. No Skincraft/Skinshotter source, WASM, or assets
4. No official VPK/textures in a public repo
5. Visual “close enough” then HUMAN_REVIEW — do not infinite-polish lighting
