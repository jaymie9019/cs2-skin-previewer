# Milestone 10 — sticker catalog + inspect extras

Searchable sticker picker over `data/stickers.json`, plus visual StatTrak and
nametag. Charm / keychain is stubbed. M5 slot grammar (`s0`–`s3`) is unchanged.

## Checklist

- [x] Searchable picker over `data/stickers.json` (en / 中文 / id / internal name).
- [x] Filter function unit-tested (`filterStickers`, same idea as `filterOfficialKits`).
- [x] Extracted id applies the real sticker texture. Catalog-only id is stored and labelled “not extracted / 未导出”; mesh stays empty (no borrowed art).
- [x] 4 slots, offset / rot / wear unchanged (`s0`–`s3`). `s4` still rejected.
- [x] StatTrak toggle + kill counter (3D plate + HTML overlay). Share `st=1` / `st=<kills>`.
- [x] Nametag field + plate. Share `name=` (URL-encoded, 20-char clamp, empty rejected).
- [x] Charm slot stubbed (“coming later / 未接入”). `charm=` rejected.
- [x] `docs/MILESTONE_10.md` + baselines + tag `milestone-10`.
- [x] Existing sticker / share tests stay green. Picker + extras tests added.

## URL grammar

M9 keys still work. Additions:

| key | values | default / reject |
| --- | --- | --- |
| st | `1` (on, 0 kills), `0` (off), `<kills>` (on + count) | omit → off (not serialized) |
| kills | non-negative integer | optional; `kills=42` alone turns StatTrak on |
| name | URL-encoded text, max 20 code points | omit / empty → no plate; empty `name=` rejected |
| charm | any | **rejected** (stub; not applied, not serialized) |
| pickq | screenshot-only search prefill | not part of the inspect; not serialized |

`s0`–`s3` stay `id,x,y,rot,wear`. Unknown sticker id is still a valid slot
(“not extracted”). `sameInspect` includes StatTrak on/off, kills (when on),
and nametag.

Examples:

```
?weapon=ak47&kit=122&s0=259
?weapon=ak47&kit=122&s0=259&s1=14&s2=15&s3=13
?weapon=ak47&kit=44&st=1&name=jaymie
?weapon=ak47&kit=44&st=1234&name=%E6%B7%AC%E7%81%ABAK
?weapon=ak47&kit=122&s0=1          → slot stores Shooter; mesh empty (not extracted)
?charm=1                          → rejected
?s4=259                           → rejected (still)
```

Serialize writes `st=1` when StatTrak is on with 0 kills, `st=<kills>` when the
counter is > 0, and `name=` only when non-empty. Implementation:
`apps/web/src/share/query.ts`.

## Picker

HUD search filters `data/stickers.json` (~11789 rows) by English, 中文, id, or
internal / material name. Empty search lists the extracted subset. Selecting a
**Live** (extracted) row binds the real PNG. Selecting a **Listed** row stores
the id and shows “not extracted / 未导出”; the shader does not enable that
layer (`maps.byId` miss → dummy / off). Do not fake another sticker’s art.

Extracted subset is unchanged from M5 (no bulk dump of official PNGs):

| id | English / 中文 | style |
| ---: | --- | --- |
| 259 | Dinked / 射穿啦 | paper |
| 14 | Aces High / 黑桃 A | paper |
| 15 | Aces High (Holo) / 黑桃 A（全息） | holo |
| 13 | Lucky 13 / 幸运十三 | paper |
| 278 | Firestarter (Holo) / 喷射火焰（全息） | holo |

Optional extra extracts were skipped — search + id lookup is enough. Commands
for the existing subset: `assets/stickers/README.md`.

## StatTrak / nametag / charm

StatTrak is a visual approximation (not a CS2 StatTrak mesh). A small canvas
plane sits on the receiver (+X / inspect side) and an HTML LCD overlay repeats
the count. Default 0. `st=1` is the toggle; `st=1234` or `kills=` set the number.

Nametag is a metal-looking plate above the dust cover plus a HUD text field.
Unicode (中文) round-trips. Length clamp is 20 code points.

Charm / keychain is **stubbed**. CS2 charms are hanging 3D keychain models
(`keychain` / `sticker_kits` charm rows + vmdl), not a sticker-style PNG. There
is no clean local extract path that would drop a single texture onto the AK the
way stickers do. HUD: disabled “Charm — coming later / 未接入”. URL `charm=`
is rejected. Next milestone that wants charms needs a vmdl extract + attach
point, not this picker.

## How to run

From the repo root install deps then start the workspace dev server.
http://127.0.0.1:5173/ — catalog + extras (StatTrak / nametag / charm stub) +
sticker search.

Tests: from `apps/web`, `npx vitest run`.

## Tests

From `apps/web`: `npx vitest run`.

- `filterStickers` matches en / 中文 / id / material; excludes id 0
- Catalog-only ids are not extracted (Shooter 1)
- `st=1` on, omit / `st=0` off and not serialized, invalid `st=` ignored
- `st=1234` / `kills=` set the counter
- nametag unicode round-trip, 20-char clamp, empty omitted / rejected
- `charm=` rejected
- Existing `s0`–`s3` / `s4` / kit / bg tests stay green

## Screenshots

1280×720, Chrome + SwiftShader. Hold `/m10-hold.png` + POST `/m10-release`.

- `tests/baselines/m10_sticker_picker.png` — HUD on, sticker search filtered (en + 中文)
- `tests/baselines/m10_dinked.png` — kit 122 Jungle Spray + `s0=259` Dinked
- `tests/baselines/m10_stattrak_nametag.png` — `st=1` + nametag, HUD / overlay visible
- `tests/baselines/m10_four_stickers.png` — four extracted slots (`s0=259&s1=14&s2=15&s3=13`)

HUMAN_REVIEW. Approximate inspect chrome, not an in-game StatTrak mesh.

## What was built

- `apps/web/src/stickers/catalog.ts` — `filterStickers`
- `apps/web/src/stickers/filter.test.ts`
- `apps/web/src/share/query.ts` — `st` / `name` / `charm`
- `apps/web/src/inspect/plates.ts` — canvas StatTrak + nametag planes
- `apps/web/src/main.ts` — searchable picker, extras HUD, overlays
- `docs/MILESTONE_10.md`

Official sticker PNGs are not committed.

## Not in this milestone

- Bulk extract of ~11789 sticker PNGs
- Real CS2 StatTrak / nametag meshes
- Charm / keychain 3D attach (stubbed)
- Second weapon (M11)
- Shader fidelity / Source 2 material graph (M12)
- AK Fade / 渐变之色 (does not exist)
