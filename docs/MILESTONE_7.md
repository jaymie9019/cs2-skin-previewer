# Milestone 7 — inspect HUD + AK-47 catalog shell

Site chrome around the M6 viewer. No new paint shaders. No map IBL (M9). No extra weapons.

## Checklist

- [x] Index of all 61 official AK kits from `data/ak47_paint_kits.json` (en + 中文).
- [x] Search / filter; click a kit to inspect.
- [x] Wear slider clamped to that kit’s `wear_remap_min_effective` / `wear_remap_max_effective`. Unlock-to-0–1 optional.
- [x] Front / Back camera presets (plus the existing 3/4 inspect pose).
- [x] Neutral / simple map *plate* backgrounds we authored (studio / warm / cool solid colors).
- [x] Kits without a shader still list; preview falls back to unpainted / vanilla AK + “preview not implemented / 尚未做涂装”.
- [x] `docs/MILESTONE_7.md` + baselines + tag `milestone-7`.
- [x] Existing vitest suite stays green. New catalog / query tests added.

## URL grammar

M6 keys still work. Additions:

?weapon=ak47&kit=72&seed=0&float=0.2&view=front&bg=warm&unlock=1

| key | values | default / reject |
| --- | --- | --- |
| weapon | ak47 (aliases ak-47, weapon_ak47, ak) | omit -> ak47; other -> rejected, fallback ak47 |
| kit | official paint index or name (44 / 122 / 14 / 72 / 226 / …) or ViewerKit slug | omit -> 44; unknown (fade, 38, 999) -> rejected, fallback 44. Official listed kits are accepted even without a shader |
| seed | 0-999 | 0 |
| float | 0-1, then clamped to the kit wear remap unless unlock | 0 (then clamp) |
| s0..s3 | id,x,y,rot,wear (id-only ok) | omit / id 0 = empty |
| s4.. | -- | rejected, not applied |
| view | inspect / front / back | omit -> inspect; unknown -> inspect (rejected) |
| bg | studio / warm / cool | omit -> studio; unknown -> studio (rejected) |
| unlock | 1 (alias wear=full) | omit -> locked to kit remap |
| capture / fixed | any | lock orbit; `view=` selects the pose (omit view = inspect, so M6 baselines stay valid) |

Examples:

?weapon=ak47&kit=44&seed=923&float=0.056
?weapon=ak47&kit=44&seed=923&float=0.056&view=front&capture=1
?weapon=ak47&kit=44&seed=923&float=0.056&view=back&capture=1
?weapon=ak47&kit=72
?weapon=ak47&kit=226&float=0.9          -> float clamped to 0.4
?weapon=ak47&kit=226&unlock=1&float=0.9 -> 0.9
?kit=fade&s4=259                       -> kit rejected (CH), s4 rejected

Serialize writes weapon, kit (official paint index, including 72), seed, float, non-empty sN, and view/bg/unlock only when they are not the defaults. Implementation: `apps/web/src/share/query.ts`.

`resolveKit` / `isViewerKitQuery` / `KITS` stay the painted 3-kit API (M4 tests). Official listed kits use `isOfficialAk47KitQuery` / `resolveOfficialAk47Kit` / `viewerKitFor`.

## Wear clamp

Locked slider min/max come from items_game wear remap (effective). Known remaps used in tests:

- 226 Blue Laminate: 0.02–0.4
- 282 Redline: 0.1–0.7
- 639 Bloodsport: 0–0.45
- 44 / 14 / 122: 0–1

Switching kits while locked clamps the current float into the new band.

## Camera + backgrounds

Model is ~1 m along +Z. Presets (same target `(-0.01, -0.025, 0.18)`):

- inspect: `(0.95, 0.42, 1.05)` — existing 3/4 pose
- front: `(1.35, 0.12, 0.18)` — +X, receiver side
- back: `(-1.35, 0.12, 0.18)` — −X, magazine side

Plates we authored (Three.Color, not third-party videos / map photos):

- studio `#14161a`
- warm `#2a2218`
- cool `#1a1e24`

## Vanilla fallback

Official kits without a ViewerKit (everything except 14 / 44 / 122) still list and still open. Paint mix is disabled (`setPaintEnabled(false)`) so the glTF albedo shows (wood + gunmetal). Status + HUD badge: preview not implemented / 尚未做涂装. Stickers still apply. Do not substitute another kit’s paint.

## How to run

From the repo root install deps then start the workspace dev server.
The page is http://127.0.0.1:5173/ — left catalog, right inspect controls, URL updates live.
Static table + search: http://127.0.0.1:5173/catalog/ak47.html

## Tests

From `apps/web`: `npx vitest run`.

- 61 official kits, no Fade / 渐变之色; `KITS` length remains 3
- `filterOfficialKits`: “丛林” → Jungle Spray; “226” → Blue Laminate; “redline” → Redline; “渐变之色” → empty
- `clampFloatToKit` for 226 / 282 / unlock
- `kit=72` accepted, serialize writes `kit=72`
- `kit=226&float=0.9` locked → 0.4; `float=0.01` → 0.02; `unlock=1` keeps 0.9
- `view=front` / `bg=warm` round-trip
- still reject fade / 38 / 999 / s4

## Screenshots

Fixed camera when `capture=1` (M1 inspect pose unless `view=`), 1280×720, headless Chrome + SwiftShader. Hold `/m7-hold.png` + POST `/m7-release`. HUD shots omit `capture=1`.

- tests/baselines/m7_catalog.png — `/catalog/ak47.html` with search
- tests/baselines/m7_inspect_hud.png — kit 44 seed 923 float 0.056, HUD visible
- tests/baselines/m7_front.png — `view=front&kit=44&seed=923&float=0.056&capture=1`
- tests/baselines/m7_back.png — `view=back&kit=44&seed=923&float=0.056&capture=1`
- tests/baselines/m7_listed_fallback.png — `kit=72` vanilla fallback, HUD + badge
- tests/baselines/m7_wear_clamp.png — kit 226, slider range 0.02–0.4 visible

## What was built

- `apps/web/src/kits/catalog.ts` — official query / filter / clamp helpers
- `apps/web/src/share/query.ts` — official kits, view, bg, unlock, wear clamp
- `apps/web/src/patternMaterial.ts` — `setPaintEnabled(false)` vanilla albedo
- `apps/web/src/main.ts` — catalog HUD, camera presets, plates
- `apps/web/public/catalog/ak47.html` — search + inspect links + Live/Listed
- `docs/ROADMAP.md` — M7+ plan (unchanged scope)

Paint / seed / float / sticker shaders are unchanged. Official textures are not committed.

## Not in this milestone

- New paint styles / shaders (M8)
- Map IBL / cubemaps (M9)
- More weapons, charms, nametag, StatTrak
