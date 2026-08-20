# Milestone 6 — shareable URL, README / compliance, lighting

Last milestone. Paint kits and sticker formulas stay as in M5 / Red Laminate grain fix. No extra paint kits. No formula retune (outputColorSpace was already SRGBColorSpace).

## Checklist

- [x] Shareable URL persists weapon, kit, seed, float, stickers (sN=id,x,y,rot,wear).
- [x] UI changes write the query with history.replaceState.
- [x] weapon=ak47 documented (only AK for now). Opening the URL restores the same inspect.
- [x] Round-trip test (kit, seed, float, 4 sticker slots). Invalid kit / s4 rejected.
- [x] Root README: how to run, local assets, extract-command pointers, compliance.
- [x] Lighting: RoomEnvironment PMREM IBL + slightly stronger key. Dark studio kept.
- [x] Fixed-camera baselines under tests/baselines/.
- [x] docs/MILESTONE_6.md. Local git commit + tag milestone-6 (no push).
- [x] Existing vitest suite stays green.

## URL grammar

?weapon=ak47&kit=44&seed=923&float=0.056&s0=259,0.02,-0.01,15,0.4&s1=14

| key | values | default / reject |
| --- | --- | --- |
| weapon | ak47 (aliases ak-47, weapon_ak47, ak) | omit -> ak47; other -> rejected, fallback ak47 |
| kit | 44 / casehardened; 122 / junglespray; 14 / redlaminate | omit -> 44; unknown (fade, 38, 999) -> rejected, fallback 44 |
| seed | 0-999 | 0 |
| float | 0-1 | 0 |
| s0..s3 | id,x,y,rot,wear (id-only ok) | omit / id 0 = empty |
| s4.. | -- | rejected, not applied |
| capture / fixed | any | lock M1 camera; preserved on replaceState |

Examples:

?weapon=ak47&kit=44&seed=923&float=0.056&capture=1
?weapon=ak47&kit=14&seed=796&float=0.1412&capture=1
?weapon=ak47&kit=122&seed=923&float=0.056&s0=259,0.03,-0.02,20,0.15&s1=14&s2=15&capture=1
?kit=fade&s4=259  -> kit rejected (CH), s4 rejected

Serialize writes weapon, kit (paint index), seed, float, and only non-empty sN keys. Implementation: apps/web/src/share/query.ts. Stickers still use apps/web/src/stickers/slots.ts.

## Lighting

M1-M5 used hemisphere + two directionals only, so Case Hardened metal read dead-matte. M6 adds three.js RoomEnvironment baked through PMREMGenerator as scene.environment, and bumps the key from 2.1 to 2.55 (fill 0.55 to 0.62, hemi 1.15 to 1.22). Background stays #14161a.
No ACES tonemap and no game-accurate sun. outputColorSpace remains SRGBColorSpace.

## How to run
From the repo root install deps then start the workspace dev server.
The page is http://127.0.0.1:5173/ -- Kit / Seed / Float / four sticker slots; URL updates live.

## Tests

From apps/web: npx vitest run.
- parse then serialize then parse keeps weapon, kit, seed, float, 4 sticker slots
- kit=fade / 38 / 999 rejected (fallback Case Hardened)
- s4 / s5 rejected (4-layer cap)
- existing M2-M5 seed / patina / kit / sticker tests stay green

## Screenshots
Fixed camera (M1 pose), 1280x720, headless Chrome + SwiftShader. Hold /m6-hold.png + POST /m6-release.

- tests/baselines/m6_url_roundtrip.png -- fat query restore (kit+seed+float+stickers)
- tests/baselines/m6_casehardened.png -- kit 44 seed 923 float 0.056 under new lights
- tests/baselines/m6_redlam_796.png -- kit 14 seed 796 float 0.1412 under new lights

Roundtrip query: weapon=ak47 kit=122 seed=923 float=0.056 s0=259,0.03,-0.02,20,0.15 s1=14 s2=15 capture=1

## What was built
- apps/web/src/share/query.ts -- parse / serialize / replaceState
- apps/web/src/share/query.test.ts
- apps/web/src/main.ts -- RoomEnvironment IBL, URL sync, weapon=
- apps/web/src/kits/catalog.ts -- isViewerKitQuery
- Root README.md -- clone-without-game, extracts, compliance

Paint / seed / float / sticker shaders are unchanged. Official textures are not committed.

## Not in this milestone

- More paint kits
- Game-accurate sun / pixel-identical sticker shader
