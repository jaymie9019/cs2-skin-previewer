# Milestone 13 — inspect paste + local hosting notes

Last planned milestone of the M7–M13 program. Parse a pasted inspect
(`!gen`, Steam `S/A/D/M` URL, our share query, market text) into kit /
seed / float / stickers when the paste actually contains those values.
Document how this local-dev site is hosted and what must not go on a
public CDN.

**Not** a Steam-connected inventory site. **Not** M14.

## Checklist

- [x] Keep our share URL (`?weapon=&kit=&seed=&float=&sN=`).
- [x] `!gen <defindex> <paintkit> <seed> <float>` (+ optional sticker pairs).
- [x] Steam inspect `S/A/D/M` tokens extracted and shown.
- [x] D is **not** decoded into paint — it is a GC request pointer.
- [x] Optional hex `CEconItemPreviewDataBlock` decode using **cited** field numbers.
- [x] Market / inspect text (`AK-47 | Case Hardened`, `Pattern:`, `Float:`).
- [x] HUD “Paste inspect / !gen” box. Success → viewer + `history.replaceState`. Failure → short status.
- [x] `!gen 7 38` rejected (Fade is not on AK).
- [x] Screenshot export button (`preserveDrawingBuffer` already true). `capture=1` still hides HUD.
- [x] README: local run, git vs gitignore, compliance (no Valve VPKs on a public CDN).
- [x] `npx vitest run` green (163). Existing share/kit tests stay green.
- [x] Baselines + `docs/MILESTONE_13.md` + tag `milestone-13`.
- [x] ROADMAP: M13 ends this sequence. M14 not started.

## What pastes we fully apply

| Paste | Apply kit/seed/float? |
| --- | --- |
| Our share query / `http://127.0.0.1:5173/?weapon=` | yes |
| `!gen 7 44 923 0.0558851957321166` | yes (AK-47 Case Hardened) |
| `!gen 4 38` with float in 0–0.08 | yes (Glock-18 Fade) |
| `!gen 7 38` | **no** — Fade is not an official AK-47 kit |
| `AK-47 | Case Hardened` + `Pattern:` + `Float:` | yes |
| steam:// `S/A/D` / `M/A/D` only | **no** — tokens shown, status `need !gen` |
| steam:// + `!gen` in the same paste | yes (`!gen`); tokens still shown |
| Hex inspect that decodes as `CEconItemPreviewDataBlock` | yes, if defindex is 7 or 4 and the kit is official |
| Garbage / incomplete text | **no** — `invalid paste` |

## Defindex map

Cited from local `data/raw/scripts/items/items_game.txt` (`items` map) and
`docs/ITEMS_GAME.md`:

| defindex | `name` | viewer |
| ---: | --- | --- |
| **7** | `weapon_ak47` | AK-47 |
| **4** | `weapon_glock` | Glock-18 |

Any other defindex (AWP 9, knives, …) is rejected. We do not invent a
catalog for weapons we do not inspect.

## Why D is not decoded

Steam inventory / market inspects look like:

```
steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20S<steamid64>A<assetid>D<inspect>
steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20M<listing>A<assetid>D<inspect>
```

`S` / `A` / `D` / `M` are `param_s` / `param_a` / `param_d` / `param_m` on
`CMsgGCCStrike15_v2_Client2GCEconPreviewDataBlockRequest` — all `uint64`
pointers sent **to** the Game Coordinator.

paintindex / paintseed / paintwear / stickers live on the **response**
message `CEconItemPreviewDataBlock`. Resolving D requires a GC / Steam
Web API call. This previewer does not call Steam with user credentials
and does not scrape Steam Inventory.

Source (public proto, not a guessed field list):

https://github.com/SteamDatabase/Protobufs/blob/master/csgo/cstrike15_gcmessages.proto

## Hex proto (optional, cited fields only)

Some inspect links carry a hex `CEconItemPreviewDataBlock` instead of
S/A/D/M. We decode **only** these published fields:

| field | name | notes |
| ---: | --- | --- |
| 3 | defindex | uint32 |
| 4 | paintindex | uint32 |
| 7 | paintwear | uint32 IEEE-754 bits of the 0–1 float |
| 8 | paintseed | uint32 |
| 10 | killeatervalue | optional StatTrak |
| 11 | customname | optional nametag |
| 12 | stickers | slot=1, sticker_id=2, wear=3 |

No XOR mask algorithm is invented. If the bytes are not a readable
proto (or the kit is not official for defindex 7 / 4), we do not apply.
S/A/D/M-only pastes never go through this path.

## !gen grammar

    !gen <defindex> <paintkit> <seed> <float> [s0_id s0_wear ... s4_id s4_wear]

Community command used on gen servers. `gen` without `!` is accepted.
Sticker pairs after the four required numbers; `s4` is rejected (viewer
cap is 4 layers, same as our share URL).

Sources:

- https://www.steamanalyst.com/gencode
- https://github.com/helyux/cs2inspect
- jaymie CH example: `!gen 7 44 923 0.0558851957321166`

## HUD

Right panel: Paste inspect / !gen textarea, Apply, Screenshot.

- Apply success: viewer updates; history.replaceState writes our share URL.
- Apply failure: short status (invalid paste / need !gen / rejected — Fade is not on AK-47).
- Steam tokens (S= A= D= M=) are shown when present, even if we do not apply.
- Screenshot downloads the current canvas PNG. capture=1 / fixed=1 still hide HUD.
- inspectq= prefills the box (screenshot / debug). Applied after the glTF is ready.

Implementation: apps/web/src/share/inspectPaste.ts, apps/web/src/share/defindex.ts.

## Tests

From apps/web: npx vitest run (163).

- !gen 7 44 923 0.0558851957321166 maps to AK-47 kit 44 seed 923
- !gen 4 38 661 0.01 maps to Glock Fade
- !gen 7 38 is rejected
- steam:// extracts S/A/D/M and does not invent paint
- garbage is rejected
- existing share / kit tests stay green

## Screenshots

1280x720, Chrome + SwiftShader. Hold /m13-hold.png + POST /m13-release.

- tests/baselines/m13_paste_gen.png — HUD on, paste box + CH !gen
- tests/baselines/m13_ch_from_gen.png — capture=1 of that inspect
- tests/baselines/m13_glock_fade_from_gen.png — Glock Fade from !gen 4 38


## How to run

From the repo root install deps then start the workspace dev server.
http://127.0.0.1:5173/

Local-dev only. See the root README for git vs gitignore and hosting notes.

## What this closes

M7 through M13 are the planned sequence. M14 is not this tag.
