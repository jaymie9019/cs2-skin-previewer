# Milestone 3 — float slider + Patina wear (AK-47 Case Hardened only)

Acceptance for M3 only (one finish: aq_oiled / kit 44 / style 8). No multi-kit switcher, no stickers, no shareable-URL product feature. Query float is for capture/repro only.

## Checklist

- [x] Float slider 0-1 next to seed, live update, query float for capture.
- [x] Wear + grunge mixed with the base pattern using the Patina (style 8) formula, not a generic lerp.
- [x] Reuse M2 seed RNG: same 11-float draw for pattern / wear / grunge UV. No second RNG.
- [x] Pattern applied only on metal. Wood stock, handguard, and maroon pistol grip stay the original glTF albedo.
- [x] Float 0 / FN reads as Case Hardened: mottled blue / gold / purple, shiny metal. Not a dark gray gun.
- [x] Increasing float is obviously more worn/dirtier; pattern stays visible (not stripped to default AK).
- [x] Pure wear-mix functions + vitest (float 0 = no scratch; higher float = more wear mask passes; wood mask 0 = original albedo).
- [x] Baseline screenshots under tests/baselines/.
- [x] docs/MILESTONE_3.md. Local git commit + tag milestone-3 (no push).

## How to run

From the repo root install dependencies, then start the workspace dev server.
The page is the Vite default on port 5173. Change the Seed box (0-999) and Float slider (0-1). Query seed= and float= set the start values. capture=1 or fixed=1 locks the M1 camera pose and hides the overlay.

Official PNGs are gitignored. If missing, extract as in assets/paints/README.md (pattern + wear + grunge + HD composite mask/cavity).

Tests: from apps/web run vitest (or apps/web/run-tests.sh).

## Formula implemented

### Seed to UV (unchanged from M2)

Paint seed initializes Valve CUniformRandomStream. Then 11 floats: pattern (tx, ty, rot), wear (scaleMult 1.6-1.8, tx, ty, rot), grunge (same). Patina style 8 base scale is AK-47 UVScale = 0.549. Matrix A = T2 R S T1, uv = fract(A * uv).

### Paint mask (metal only)

HD AK is a single material (weapon_rif_ak47) with wood + metal in one albedo. M2 replaced material.map on the whole mesh, so Case Hardened covered the stock/grip/handguard. M3 keeps the glTF albedo/normal/ORM and mixes the pattern only where the engine paint-by-number says so.

paintMask = step(0.4, masks.r) * (1.0 - cavity.a)  where cavity.a is TextureNoPaint
albedo = mix(original, painted, paintMask)
metalness/roughness = mix(glTF ORM, 0.92 / 0.28, paintMask)

Mask source: local weapon_rif_ak47_composite_inputs.vmat (TextureMasks1 R = Patina/anodized region; packed cavity A = no-paint). Loaded flipY=false to match the glTF albedo UVs. Do not gate on default ORM metalness — those metal texels sit near 0 and leaked factory-gray into FN.

### Patina / style 8 wear mix

Port of CS:GO customweapon_ps20b.fxc PAINTSTYLE==8 (workshop Patina), with one FN correction so oiled.png is not crushed:

- oiled.png is already the colour-ramped Case Hardened sheet (pattern.wiki nested RGB mix is styles 1-6, not 8).
- Float 0: painted albedo = pattern * g_flColorBrightness (vmat 1.8). No color1 multiply, no AO multiply, no scratch. isitabluegem: FN = clean pattern.
- Scratch (wear map vs float, not a lerp of the whole gun): scratch = smoothstep(0.1, 0.2, wear.g * ao * cavity^2 * float). Float 0 maps to 0. White wear wears first. Mixes toward color0 * luma(pattern) (base metal).
- Grunge amount: pow(1-cavity,4)*0.25 + 0.75*float then lerp(1, gun_grunge.rgb, amount).
- Age tint and cavity grime scale with float (color1/2/3 from aq_oiled.vmat). They do not run at full strength on FN.

Wear bands are slider labels only (slider stays continuous 0-1): FN 0-0.07, MW 0.07-0.15, FT 0.15-0.38, WW 0.38-0.45, BS 0.45-1.

### Formula source URLs

- https://www.counter-strike.net/workshop/workshopfinishes/
- https://www.counter-strike.net/workshop/wf_patina
- https://www.isitabluegem.com/insights
- https://www.isitabluegem.com/zh-CN/insights
- https://pattern.wiki/wiki/pattern_colors
- Local items_game.txt paint kit 44 (aq_oiled, style 8, wear_remap 0-1; no color0-3 on the kit)
- Local aq_oiled.vmat (F_PAINT_STYLE 7, g_vColor0..3, g_flWearAmount, g_flPaintRoughness, g_flColorBrightness 1.8, g_tPattern / g_tWear / g_tGrunge)
- Local weapon_rif_ak47_composite_inputs.vmat (HD masks + packed cavity/AO/nopaint)
- CS:GO customweapon_ps20b.fxc PAINTSTYLE 8 (same compositing the workshop Patina docs describe)

## User in-game calibration

The user compared an in-game AK-47 Case Hardened inspect (wood furniture, mottled blue/gold/purple metal) and then sent two numeric inspects. Treat those as the look targets. They wrote Fade in chat once; the screenshot header and paint index 44 are Case Hardened — this milestone does not switch to Fade.

Inspect 1 FN: seed 923, float 0.0558851957321166, local file docs/reference/ingame_ak47_ch_seed923_fn.png (gitignored). Wood + maroon grip unpainted; metal bright gold / electric blue / purple; high specular; dust cover mostly gold; magazine big blue patch.

Inspect 2 BS T4: seed 673, float 0.4134539067745208, local file docs/reference/ingame_ak47_ch_seed673_bs.png (gitignored). Still clearly Case Hardened (blue/gold visible), dirtier/darker/more worn than FN, not stripped to default AK metal.

Our captures of those exact query params:

- tests/baselines/m3_seed923_fn.png — seed=923 float=0.0558851957321166 capture=1 (tx 0.810, ty 0.345, rot 348.266 deg)
- tests/baselines/m3_seed673_bs.png — seed=673 float=0.4134539067745208 capture=1 (tx 0.240, ty 0.631, rot 354.537 deg)

Filenames on the inspect PNGs were not re-guessed. Numeric seed/float from the user text is the source of truth; pattern placement (gold dust cover + blue mag on 923) was used only to confirm the viewer captures were not swapped.

## HUMAN_REVIEW

Visual: looks like the same class of wear as CS2 / Skincraft at the same seed+float. Not pixel-identical. Interactive slider + reproducible baselines is enough; do not infinite-polish.

- FN / seed 923: saturated gold/blue metal, shiny, wood stays wood. Same class as inspect 1.
- BS / seed 673 float 0.41: pattern still readable, darker/dirtier than FN. Same class as inspect 2.
- Lighting, camera, and PBR in this viewer will not match the in-game inspect scene (Dust 2 HDR). Pattern placement and metal-vs-wood split are the things to check.

## Tests

From apps/web: vitest run.

Result on 2026-08-20: 25 passed (2 files). 10 M2 seed/UV tests kept green; 15 new wear/mask tests.

Assertions: float 0 = scratch blend 0 and full-strength pattern (no color1 crush); higher float lets more of the wear mask pass; black wear never scratches; wood paintMask=0 returns original albedo; metal mask 1 returns the patina mix; grunge darkens at high float.

## Screenshots

Fixed camera (M1 pose), 1280x720, headless Chrome plus SwiftShader. Hold middleware /m3-hold.png plus POST /m3-release waits until the glTF + pattern + wear + grunge + masks + cavity are ready. Same Chrome flags as M1/M2; URLs used capture=1 with seed and float query params.

Same-seed float sweep (seed 661, only float varies):

- tests/baselines/m3_float_0.00.png — FN-ish
- tests/baselines/m3_float_0.15.png — FT low
- tests/baselines/m3_float_0.38.png — FT/WW
- tests/baselines/m3_float_0.75.png — BS-ish

Plus the two user inspects above (m3_seed923_fn.png, m3_seed673_bs.png).

## What was built

- apps/web/src/patina/patinaWearMix.ts — pure style-8 mix + paint mask
- apps/web/src/patina/patinaWearMix.test.ts
- apps/web/src/patternMaterial.ts — original albedo kept; pattern/wear/grunge sampled with M2 matrices; metal-only composite
- apps/web/src/main.ts — float UI, query float, loads wear/grunge/mask/cavity
- HD composite extracts (gitignored): assets/composite/weapon_rif_ak47_masks.png, weapon_rif_ak47_cavity.png

body_legacy stays hidden. Sticker materials skipped. Official textures/VPKs/node_modules not committed. docs/reference PNGs gitignored (local calibration).

## Not started (later milestones)

- Multi-kit switcher (M4)
- Stickers (M5)
- Share URLs (M6)
