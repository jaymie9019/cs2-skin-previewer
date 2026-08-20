# Milestone 2 — seed to pattern UV

Acceptance for M2 only (no float slider).

## Checklist

- [x] Documented seed to UV (Valve UniformRandom + T2 R S T1), URLs cited in code.
- [x] Pure seedToPatternUv(seed) in apps/web/src/seed/seedToPatternUv.ts.
- [x] Seed UI 0-999, live update, no reload. Query seed= sets the start value.
- [x] Same seed is bit-identical (Object.is on every matrix component).
- [x] Changing seed changes the pattern; screenshots at 0 and 661.
- [x] Real AK-47 Case Hardened pattern extracted locally (gitignored).
- [x] Wear/grunge transforms computed from the same 11-float draw (no M3 UI).
- [x] Vitest: 10 passed.
- [x] docs/MILESTONE_2.md + baselines under tests/baselines/.
- [x] Git tag milestone-2 after the M2 commit (no push).

## How to run

From the repo root install dependencies, extract the Case Hardened pattern if assets/paints/aq_oiled/oiled.png is missing (see assets/paints/README.md), then start the workspace dev server.

The page is http://127.0.0.1:5173/ — change the Seed box (0-999). A seed query param sets the starting seed. capture=1 or fixed=1 locks the M1 camera pose and hides the overlay.

## How to change seed

- Number input in the top-right (live).
- Or a seed query param on the URL, then the input.

## Formula implemented

Paint seed initializes Valve Source CUniformRandomStream (ran1). Then 11 floats:

1. Pattern: translateX 0-1, translateY 0-1, rotate 0-360. Scale is not drawn; for Patina (style 8) it is the weapon UVScale.
2. Wear: scaleMult 1.6-1.8, translateX, translateY, rotate.
3. Grunge: same ranges as wear.

AK-47 Case Hardened (aq_oiled, kit 44, style 8 / Patina) from local items_game.txt:

- WeaponLength = 37.746201
- UVScale = 0.549
- PatternScale = 1
- baseScale = UVScale (not weapon_length/36; that path is style 3 or 6)

UV sample chain (isitabluegem finalized model): A = T2 x R x S x T1. T1 translates by (offsetX-0.5, offsetY-0.5). S scales. R rotates counterclockwise about the origin. T2 is the extra offset. uv_final = fract(A * uv).

Extra offset (pattern.wiki snippet, also on isitabluegem): invScale = 0.5/scale; angle = -rotationDeg * pi/180; extraX = invScale*cos - invScale*sin; extraY = extraX*sin + invScale*cos.

Choice when sources disagree: isitabluegem plus the Reddit PSA. The published pattern.wiki offsets for seeds 0/1/2/44/387/633 match this RNG exactly. isitabluegem matrix order (T2 R S T1 about origin) is used instead of pattern.wiki rotate-around-top-left prose. Extra-offset algebra is the same on both pages.

Seed 0 and seed 1 produce the same draw (Valve idum collapse). pattern.wiki lists identical offsets for both.

### Formula source URLs

- https://www.counter-strike.net/workshop/workshopfinishes/
- https://www.reddit.com/r/GlobalOffensiveTrade/comments/b7g538/psa_how_paint_seed_actually_works_technical/
- https://github.com/Step7750/UniformRandom (RNG port from that PSA)
- https://www.isitabluegem.com/insights
- https://www.isitabluegem.com/zh-CN/insights
- https://pattern.wiki/wiki/pattern_offsets
- https://pattern.wiki/wiki/pattern_offsets/transforms
- https://pattern.wiki/wiki/pattern_colors (color mix left for later milestones)
- Local items_game.txt paint kit 44 and weapon_ak47_prefab paint_data
- Local vmat aq_oiled.vmat_c (csgo_customweapon.vfx pattern/wear/grunge texcoord uniforms)

## Pattern texture

Kit: AK-47 Case Hardened (aq_oiled, paint kit 44).
Local gitignored path: assets/paints/aq_oiled/oiled.png (2048x2048).
VPK source: materials/models/weapons/customization/paints/antiqued/oiled_psd_9f35e709.vtex.
Also extracted (same seed transform, not blended in the M2 UI): paint_wear.png and gun_grunge.png.
Served as /assets/paints/aq_oiled/oiled.png via the existing apps/web/public/assets symlink.

## Tests

From apps/web run: npx vitest run

Result on 2026-08-20: 10 passed (1 file).

Assertions: Step7750 seed-72 floats; published offsets 0/1/2/44/387/633; seed 0 equals seed 1; same seed Object.is identical including wear/grunge; different seeds differ; extra-offset snippet; T2 R S T1 point check; 0-999 clamp.

## Screenshots

Fixed camera (M1 pose), 1280x720, headless Chrome plus SwiftShader. Hold middleware /m2-hold.png plus POST /m2-release waits until the glTF and pattern shader are ready. Same Chrome flags as M1; URLs used capture=1 with seed=0 and seed=661.

- tests/baselines/m2_seed_0.png — seed 0 (tx 0.416, ty 0.092, rot 272.308)
- tests/baselines/m2_seed_661.png — seed 661 (tx 0.316, ty 0.487, rot 105.373), high-contrast blue-gem seed

Both show the full rifle, receiver/body visible, Case Hardened blotches. File hashes differ; pattern placement changes with seed.

## What was built

- apps/web/src/seed/uniformRandom.ts — Valve CUniformRandomStream
- apps/web/src/seed/seedToPatternUv.ts — seed to pattern/wear/grunge UV
- apps/web/src/seed/seedToPatternUv.test.ts — Vitest
- apps/web/src/patternMaterial.ts — OnBeforeCompile, A times uv sample
- apps/web/src/main.ts — Seed UI plus pattern on HD mesh
- apps/web/run-tests.sh — vitest runner
- assets/paints/README.md — extract notes (PNGs gitignored)

body_legacy stays hidden. HD MeshStandardMaterials (not sticker_gaps) get the pattern as albedo; original normal/ORM stay. No float slider.

## Not started (later milestones)

- Float slider / wear compositing (M3)
- Multi-kit switcher (M4)
- Stickers (M5)
- Share URLs (M6)
