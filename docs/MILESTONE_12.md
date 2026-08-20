# Milestone 12 — original paint-shader fidelity

Deepen the existing WebGL `OnBeforeCompile` path toward `csgo_customweapon`
parameters we decompile locally. **Not** a WebGPU rewrite (this box still has
no WebGPU adapter). **Not** Skincraft / Skinshotter.

Acceptance: Case Hardened seed 923 / float ~0.056 and Red Laminate seed 796 /
float 0.1412 stay the same *class* as in-game (HUMAN_REVIEW), still not 1:1.

## Checklist

- [x] Re-read Live kit vmats with Source2Viewer-CLI 20.0 (`--game …/gameinfo.gi`).
- [x] Glock Fade (38): community fade-percent 80–100 + 1D LUT window.
- [x] Candy Apple (3): `so_red.vmat` is truly solid — documented; Hydroponic deepened instead.
- [x] Gunsmith / custom: one real extra map each (Redline roughness, Fuel Injector normal).
- [x] Case Hardened / Red Laminate mixers not rewritten (additive style branches only).
- [x] No WebGPU. No Skincraft/Skinshotter JS/WASM/WGSL.
- [x] `npx vitest run` green (149). New fade-percent / chrome tests.
- [x] Baselines + `docs/MILESTONE_12.md` + tag `milestone-12`.

## vmat parameters actually read

All decompiled with Source2Viewer-CLI 20.0 against
`/workspace/cs2/game/csgo/gameinfo.gi`.

| kit | vmat | used this milestone |
| ---: | --- | --- |
| 38 Fade | `aa_fade.vmat` | `F_PAINT_STYLE` 5, `g_tPattern` fade.png, `g_vColor0..3`, `g_vPatternTexCoordOffset` [-0.7,-0.7], `g_flPatternTexCoordRotation` -55, `g_nPatternTexture*Sampling` 2, `g_flPaintRoughness` 0.25, `g_flPearlescentScale` **0**, `g_bIgnoreWeaponSizeScale` 1 |
| 3 Candy Apple | `so_red.vmat` | no `F_PAINT_STYLE` (solid), no `g_tPattern`, `g_vColor1` candy red, `g_flPearlescentScale` **0**, roughness 0.4 |
| 456 Hydroponic | `am_bamboo_jungle.vmat` | `F_PAINT_STYLE` 4, nested RGB colors, scale 1.4, roughness 0.6, `g_flPearlescentScale` **0**, offset [0.73,0.34] (offset unused — tiling already matches M8) |
| 282 Redline | `cu_ak47_cobra.vmat` | `F_ROUGHNESS_TEXTURE` 1 → `elegantredv1_1_rough.png` (wired), metalness 1 |
| 524 Fuel Injector | `gs_ak47_supercharged.vmat` | `F_OVERRIDE_NORMAL` 1 → `ak47_supercharged_normal.png` (wired). Kit `ak47_supercharged_masks.png` is a red/black decal layout, **not** a patina-on-metal split — unused. |
| 639 Bloodsport | `gs_ak47_bloodsport.vmat` | `F_OVERRIDE_NORMAL` 1 but `TextureNormal` is a constant [0.5,0.5,1] — no extra map to wire |
| 44 Case Hardened | `aq_oiled.vmat` | unchanged (style 8 mix). `g_flPearlescentScale` 0, `g_flColorBrightness` 1.8 already used |
| 14 Red Laminate | `hy_ak47lam.vmat` | unchanged (style 2 mix + grainWindow). Has `laminate_ak47_normal.png` — **not** wired (would change the calibrated look) |

No Live vmat listed `composite_material_order`. PearlescentScale is 0 on every
Live kit we opened, so no pearl lobe was invented.

## Formulas + URLs

### Fade percent (kit 38)

Community metric, not an engine value. Classic Fade keeps X/Y constant and
only rotates; that rotation is ranked 80% (worst) … 100% (best).

```
rng = CUniformRandomStream(seed)     // this repo, Valve ran1
x = rng.randomFloat(-0.7, -0.7)      // aa_fade.vmat offset (consumed)
y = rng.randomFloat(-0.7, -0.7)
rot = rng.randomFloat(-55, -65)      // vmat start -55; community end -65
best = max(rot over seeds 0–999)     // Glock is not reversed
worst = min(rot)
fadePct = 80 + 20 * (rot - worst) / (best - worst)
```

1D LUT window into `fade.png` (then nested RGB of Color0..3):

```
t = (fadePct - 80) / 20
fadeT = mix(0.04, 0.20, t) + uv.x * mix(0.52, 0.74, t)
sample fade.png at (fadeT, 0.5 + (uv.y-0.5)*0.35)
```

Anodized Airbrushed wears to a chrome undercoat before the substrate
(workshop). Wear remap stays 0–0.08.

Sources:

- https://www.counter-strike.net/workshop/workshopfinishes/
- https://pattern.wiki/wiki/pattern_colors
- https://skinport.com/blog/csgo-fade-percentage-update
- https://csgoskins.gg/blog/glock-18-fade-percentage-values-seed-patterns
- https://github.com/chescos/csgo-fade-percentage-calculator (README description only)
- local `aa_fade.vmat`

### Candy Apple (kit 3)

`so_red.vmat` has no pattern, no anodized flag, pearlescentScale 0. Still
flat Color1 `[0.741, 0.169, 0.169]` on the metal mask. Documented, not faked.

### Hydroponic (kit 456) — deepened instead of inventing Candy pearl

Workshop anodized: “colored candy coat over a chrome base”. Style 5 still
wears to the substrate (caller fades the paint mask). Additive chrome peek:

```
chromeAmt = smoothstep(0.08, 0.50, wear * float) * 0.45
color = mix(candy, chrome rgb(0.82,0.84,0.87), chromeAmt)
```

Style 2 Red Laminate does **not** take this branch.

### Redline roughness / Fuel Injector normal

- Redline: `roughnessFactor = mix(constant, texture(elegantredv1_1_rough).g, mask)`
  when `F_ROUGHNESS_TEXTURE` is present.
- Fuel Injector: cheap view-normal bump from `ak47_supercharged_normal`
  (`normal += n.xy * 0.35 * mask`). Not a full TBN rewrite.

## What we refused to copy

- Skincraft.gg / Skinshotter JS, WASM, WGSL, CDN assets
- The fade-calculator TypeScript (we re-derived from the published
  description + local vmat + our existing Valve RNG)
- Whole-renderer port / WebGPU path
- Invented AK Fade
- Fake extra maps that are not in the vmat (Bloodsport constant normal,
  Fuel Injector decal “masks”, Candy pearl)

## CH / Red Laminate bytes

Style 8 and style 2 GLSL mixers are the same as M11. New uniforms are
gated (`uHasPaintRough` / `uHasPaintNormal` / `uStyle == 5` / `uStyle == 6`).

**Byte-identical** on this box (SHA-256 of the PNG):

- `m12_ak47_ch_923.png` == `m11_ak47_still.png` == `m8_kit44_case_hardened.png` == `m6_casehardened.png`
- `m12_ak47_redlam_796.png` == `m8_kit14_redlam_796.png` == `m6_redlam_796.png`

Fade and Redline PNGs changed (fade-percent LUT window; roughness map).

## Tests

From `apps/web`: `npx vitest run` (149).

- `fadePercent` 80–100, seed 763 is high-end, LUT window monotonic
- `mixFadeAlbedo` nested RGB + chrome undercoat
- `mixAnodizedCandy` does not change style 2
- Extra-map paths on Redline / Fuel Injector; Bloodsport / CH / RedLam stay null
- Existing kit / share / weapon / sticker tests stay green

## Screenshots

1280×720, Chrome + SwiftShader. Hold `/m12-hold.png` + POST `/m12-release`.

- `tests/baselines/m12_glock_fade.png` — weapon=glock kit=38 capture=1
- `tests/baselines/m12_ak47_ch_923.png` — kit=44 seed=923 float=0.056 capture=1
- `tests/baselines/m12_ak47_redlam_796.png` — kit=14 seed=796 float=0.1412 capture=1
- `tests/baselines/m12_ak47_redline.png` — kit=282 (roughness extra map)

## How to run

From the repo root install deps then start the workspace dev server.
http://127.0.0.1:5173/?weapon=glock&kit=38
http://127.0.0.1:5173/?weapon=ak47&kit=44&seed=923&float=0.056

Tests: from `apps/web`, `npx vitest run`.

## Leftover (not this tag)

- Still not 1:1 CS2. No WebGPU. Lighting stays M9 IBL.
- Fade is still 2D-UV, not triplanar airbrush.
- Gunsmith patina-on-metal split: no real split map on Fuel Injector / Bloodsport.
- Pearlescence: no Live vmat asked for it (`g_flPearlescentScale` 0).
- Remaining listed kits stay vanilla + “尚未做涂装”.
- M13 inspect links.

Official paint / composite / extra-map PNGs are not committed.
