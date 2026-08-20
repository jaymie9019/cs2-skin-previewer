# Milestone 9 — map lighting (ours)

Close the “too dark / dead metal” gap with **our own** IBL looks.
Not Skincraft Inferno videos, not their probe packs, not Skinshotter’s code.

## Checklist

- [x] Local cubemap / HDR path searched (CS2 `env_cubemap` / sky / toolscene). Extract works; official EXRs are Valve IP and stay off git.
- [x] Authored studio + map-ish HDR looks baked through `PMREMGenerator` (Three primitives / RoomEnvironment).
- [x] Map picker: `studio` / `warm` / `cool` / `sun` (names we chose; assets we authored).
- [x] Metal reads reflections (Case Hardened especially). Warm IBL is brighter / more reflective than studio.
- [x] Share URL `bg=` now selects **environment lighting** (PMREM), not just a backdrop plate. Default `studio` so M6/M8 CH / Red Laminate stay valid.
- [x] Still approximate. No CS2 pixel-match claim.
- [x] `docs/MILESTONE_9.md` + baselines + tag `milestone-9`.
- [x] Existing vitest suite stays green. Env catalog + `bg=` tests added.

## `bg=` grammar

M7 keys still work. `bg=` meaning changes from “solid plate only” to “IBL look + matching plate”.

| key | values | default / reject |
| --- | --- | --- |
| bg | studio / warm / cool / sun | omit → studio; unknown (`skincraft`, `inferno`, `dust2`) → studio (rejected) |

Examples:

```
?weapon=ak47&kit=44&seed=923&float=0.056
?weapon=ak47&kit=44&seed=923&float=0.056&bg=studio&capture=1
?weapon=ak47&kit=44&seed=923&float=0.056&bg=warm&capture=1
?weapon=ak47&kit=44&seed=923&float=0.056&bg=cool&capture=1
?weapon=ak47&kit=282&bg=warm&capture=1
?bg=skincraft  → rejected, studio
```

Serialize still omits `bg` when it is the default (`studio`). Implementation: `apps/web/src/share/query.ts` + `apps/web/src/env/catalog.ts`.

## Where the environments came from

| id | Origin | Notes |
| --- | --- | --- |
| studio | authored | three.js `RoomEnvironment` → PMREM. **Same bake as M6.** Lights unchanged (hemi 1.22 / key 2.55 / fill 0.62). Plate `#14161a`. |
| warm | authored | Dusty courtyard scene (tan ground, adobe boxes, warm sun disc, pale sky). Plate `#2a2218`. Stronger warm key. |
| cool | authored | Overcast (grey-blue sky plane, no hard sun, softer fill). Plate `#1a1e24`. |
| sun | authored | High-sun disc, deeper sky, more contrast. Plate `#1c1812`. |

We listed and extracted CS2 files locally (`materials/editor/toolscene_lighting_de_dust_cubemap_exr_…`, `materials/skybox/sky_de_dust2_exr_…`, cloudy cube, Inferno test cubemap). VRF decompiles them to multi-MB EXR. Those are official Valve textures — **not committed**. Commands: `assets/env/README.md`.

We did **not** name a look `dust2` / `inferno` because the shipping IBL is authored, not those extracts. `bg=inferno` stays rejected (M7 test).

Capture mode still uses the matching solid plate (HUD hidden). Studio captures stay on the dark plate so M6/M8 CH comparisons stay fair.

## How to run

From the repo root install deps then start the workspace dev server.
The page is http://127.0.0.1:5173/ — Background buttons: Studio / Warm / Cool / Sun.
Query `bg=warm` / `bg=cool` / `bg=sun`. Omit or `bg=studio` is the M6 studio.

Tests: from `apps/web`, `npx vitest run`.

## Tests

From `apps/web`: `npx vitest run`.

- Env catalog: known ids, default studio, reject `skincraft` / `inferno` / `dust2`
- Studio lights match the M6 RoomEnvironment inspect (do not retune default)
- `bg=warm` / `bg=sun` parse + serialize; omit = studio (not written)
- `bg=skincraft` → studio + rejected
- Existing kit / share / wear / sticker tests stay green

## Screenshots

Fixed camera when `capture=1`, 1280×720, headless Chrome + SwiftShader. Hold `/m9-hold.png` + POST `/m9-release`.

- tests/baselines/m9_studio_ch.png — kit 44 seed 923 float 0.056 `bg=studio&capture=1` (**byte-identical** to `m8_kit44_case_hardened.png` and `m6_casehardened.png`)
- tests/baselines/m9_warm_ch.png — same inspect, `bg=warm` — metal brighter / more reflective than studio
- tests/baselines/m9_cool_ch.png — same inspect, `bg=cool`
- tests/baselines/m9_warm_redline.png — kit 282, `bg=warm` — carbon/metal picks up env
- tests/baselines/m9_sun_ch.png — same CH inspect, `bg=sun`

HUMAN_REVIEW. Not an in-game Dust II pixel match.

## What was built

- `apps/web/src/env/catalog.ts` — look ids, plates, per-look lights
- `apps/web/src/env/author.ts` — RoomEnvironment + three authored scenes
- `apps/web/src/env/catalog.test.ts`
- `apps/web/src/share/query.ts` — `bg=sun`; unknown still studio + rejected
- `apps/web/src/main.ts` — `scene.environment` switches with `bg=`; `__M9_BG__` / `__M9_READY__`
- `apps/web/vite.config.ts` — `/m9-hold.png` + POST `/m9-release` (m7/m8 kept)
- `assets/env/README.md` — extract notes (official files not shipped)
- `docs/MILESTONE_9.md`

Official textures are not committed.

## Not in this milestone

- Dust II / Inferno pixel-accurate sun (still approximate)
- Sticker catalog extras (M10)
- More weapons (M11)
- Shader fidelity / Source 2 material graph (M12)
- AK Fade / 渐变之色 (does not exist)
