# Milestone 5 — four sticker layers on the AK-47

Acceptance for M5 only. Paint kits stay as in M4 (style 2 hydrographic path is unchanged / still callable).
**No extra paint kits. No IBL / env lighting (M6 deferred).**

## Checklist

- [x] Up to **4** sticker layers (items_game `max_num_stickers` is 5; product cap is 4; AK slot 4 has scale 0).
- [x] Each layer: texture, offset, rotation, sticker wear (approximate).
- [x] Stickers sit on the AK via mesh `TEXCOORD_1` + `StickerMarkup` / `g_vStickerNOffset`+`Scale`. No world-space quads.
- [x] UI: 4 slots; extracted subset + id lookup against `data/stickers.json`.
- [x] Query `s0=id,x,y,rot,wear` (and s1–s3). `s4+` rejected. Documented below.
- [x] Paint kits still work; stickers composite on top of painted metal/furniture.
- [x] Tests: same sticker+transform is deterministic; 4th vs 5th slot; empty slot no-op.
- [x] Fixed-camera baselines under `tests/baselines/`.
- [x] `docs/MILESTONE_5.md`. Local git commit + tag `milestone-5` (no push).

## How slots map to the mesh

HD AK-47 (`body_hd`) has `TEXCOORD_1` (glTF `uv1`) on both the `weapon_rif_ak47` body primitive and the translucent `sticker_gaps` overlay (`F_STICKERS`). Slot 4 on the vmat is unused (`g_vSticker4Scale` = 0).

`StickerMarkup` on `weapon_rif_ak47.vmdl` (Mesh `body_hd`) matches the vmat extras:

| slot | SpecialIdentifier | g_vStickerNOffset | scale |
| ---: | --- | --- | ---: |
| 0 | Autograph | `[0.148, -0.434]` | 14.1 |
| 1 | Team1 | `[0.061, -0.434]` | 14.1 |
| 2 | Team2 | `[-0.025, -0.435]` | 14.6 |
| 3 | Map | `[-0.164, -0.444]` | 14.7 |

UV (approximate, not pixel-identical CS2):

```
stickerUv = rotate((uv1 - 0.5 - (slotOffset + userOffset)) * scale) + 0.5
```

User `x,y` are inspect-style UV offsets added to the markup offset. Rotation is degrees around the sticker center. Outside 0–1 is discarded (clamp-to-edge textures, no wrapping onto the rest of the gun).

## Extracted stickers

Official PNGs gitignored. Commands: `assets/stickers/README.md`.

| id | English / 中文 | style | material |
| ---: | --- | --- | --- |
| 259 | Dinked / 射穿啦 | paper | `community02/dinked` |
| 14 | Aces High / 黑桃 A | paper | `standard/aces_high` |
| 15 | Aces High (Holo) / 黑桃 A（全息） | holo | `standard/aces_high_holo` |
| 13 | Lucky 13 / 幸运十三 | paper | `standard/thirteen` |
| 278 | Firestarter (Holo) / 喷射火焰（全息） | holo | `community02/firestarter_holo` |

Shared: `g_tStickerScratches`, paper backing. Dinked is the Jungle Spray example from the handover.

## Query syntax

`sN=id,x,y,rot,wear` for N = 0..3. Omit a key or use id `0` for an empty slot (no-op). Extra keys `s4`, `s5`, … are parsed and **rejected** (not applied).

| field | meaning |
| --- | --- |
| `id` | `sticker_kits` id (`data/stickers.json`) |
| `x`,`y` | UV offset added to that slot’s markup offset (default 0) |
| `rot` | degrees (default 0) |
| `wear` | 0–1 scrape (default 0) |

Shorthand: `s0=259` is Dinked at slot 0 with zero transform.

Examples (fixed camera via `capture=1`):

```
?kit=122&seed=923&float=0.056&capture=1
?kit=122&seed=923&float=0.056&s0=259&capture=1
?kit=122&s0=259&s1=14&s2=15&s3=13&capture=1
?kit=122&s0=259,0,0,0,0
?kit=122&s0=259,0,0,0,1
?kit=122&s4=259&capture=1   → s4 rejected, no fifth layer
```

`kit` / `seed` / `float` unchanged from M4.

## Wear (approximate)

https://www.counter-strike.net/workshop/workshopstickers/ — do not author scratches in the sticker; the engine adds wear. `$UnWearStrength` default 0.1: high wear-mask (extracted `-A.png`) resists scrape so important art stays readable. This viewer lerps/erodes alpha with `g_tStickerScratches` and that UnWear term. **Not** pixel-identical CS2.

Paper kits mix in the default backing as wear rises. Holo kits mix `g_tHoloSpectrum` using the holomask (view-tilt from `vViewPosition`; deterministic at the fixed camera).

## How to run

From the repo root install dependencies then start the workspace dev server.
http://127.0.0.1:5173/ — Kit / Seed / Float plus four sticker slots.
Official sticker PNGs are gitignored; extract as in `assets/stickers/README.md` if missing.
Tests: from `apps/web`, `npx vitest run` (or `apps/web/run-tests.sh`).

## Tests

From `apps/web`: `npx vitest run`.
Assertions: 4-layer cap; `s4`/`s5` rejected; empty slot no-op; same sticker+transform bit-identical (parse + UV + wear); slot-center UV is 0.5; Dinked 259 + Aces High lookup against `data/stickers.json`; wear 0 keeps coverage, wear 1 erodes, UnWear protects.

## Screenshots

Fixed camera (M1 pose), 1280x720, headless Chrome + SwiftShader. Hold `/m5-hold.png` + POST `/m5-release`.

- `tests/baselines/m5_no_stickers.png` — `kit=122&seed=923&float=0.056&capture=1`
- `tests/baselines/m5_one_sticker.png` — same + `s0=259` (Dinked)
- `tests/baselines/m5_four_stickers.png` — `s0=259&s1=14&s2=15&s3=13`
- `tests/baselines/m5_sticker_wear_0.png` — `s0=259,0,0,0,0`
- `tests/baselines/m5_sticker_wear_1.png` — `s0=259,0,0,0,1`

Jungle Spray so Dinked reads on camo. Kit 14 / hydrographic paint path is not retuned here.

## What was built

- `apps/web/src/stickers/slots.ts` — parse/serialize, max 4
- `apps/web/src/stickers/uv.ts` — TEXCOORD_1 + markup
- `apps/web/src/stickers/wearMix.ts` — UnWear / scratch alpha
- `apps/web/src/stickers/catalog.ts` — extracted subset
- `apps/web/src/stickers/stickerMaterial.ts` — shader composite on body + sticker_gaps
- `apps/web/src/main.ts` — 4-slot UI, query `sN=`, id lookup
- `data/sticker_subset.json`

`body_legacy` stays hidden. Style 2 paint still goes through `attachPatternMap`. Official textures/VPKs/node_modules not committed.

## Not started (later milestones)

- Lighting / IBL / brightness (M6, user deferred)
- More paint kits
- Pixel-identical CS2 sticker shader (holo/glitter/foil)
