# Milestone 11 — Glock-18 inspect + official Fade

Second weapon from the same pipeline. Glock-18 (not AWP) because AK-47 has
**no Fade / 渐变之色**. Fade (`aa_fade`, paint index **38**) pairs with Glock
and MAC-10. Showing Fade on Glock is the product beat. Fade is not on the AK.

## Checklist

- [x] Export Glock glTF (`weapons/models/glock18/weapon_pist_glock18.vmdl_c`).
- [x] items_game-driven Glock catalog (`data/glock_paint_kits.json`, 59 official).
- [x] Kit 38 `aa_fade` Fade / 渐变之色 is in the Glock catalog. AK still 61, still no Fade.
- [x] URL `weapon=glock` (aliases glock-18, glock18, weapon_glock) + `weapon=ak47` unchanged.
- [x] Live Glock kits: Fade (38) + Candy Apple (3). Listed kits: vanilla + “尚未做涂装”.
- [x] `weapon=awp` still rejected. `kit=38` on AK still rejected. `kit=44` on Glock rejected (no Case Hardened pairing).
- [x] `sameInspect` includes weapon.
- [x] Glock composite masks extracted (not AK masks on the Glock mesh).
- [x] Stickers: Glock has `TEXCOORD_1` — 4 slots kept (AK StickerMarkup placement is approximate).
- [x] `docs/MILESTONE_11.md` + baselines + tag `milestone-11`.
- [x] Existing AK tests stay green. Glock catalog / share tests added.

## URL grammar

M10 keys still work. `weapon=` now accepts Glock.

| key | values | default / reject |
| --- | --- | --- |
| weapon | ak47 (aliases ak-47, weapon_ak47, ak) or glock (aliases glock-18, glock18, weapon_glock, weapon_glock18) | omit → ak47; unknown (awp) → rejected, fallback ak47 |
| kit | official paint index / name **for that weapon** | omit → 44 on AK, 38 Fade on Glock. Kit not official for the weapon → rejected, fallback that weapon’s default. |

Examples:

```
?weapon=glock&kit=38
?weapon=glock&kit=fade
?weapon=glock-18&kit=3
?weapon=ak47&kit=44&seed=923&float=0.056
?weapon=ak47&kit=38          → kit rejected, Case Hardened
?weapon=glock&kit=44          → kit rejected, Fade (do not paint Case Hardened on Glock)
?weapon=awp                   → weapon rejected, AK
```

`sameInspect` includes weapon. Implementation: `apps/web/src/share/query.ts`,
`apps/web/src/share/weapons.ts`.

## Official catalog

Pairing token is **`weapon_glock`** (not `weapon_glock_18`) in `item_sets` /
`client_loot_lists`. Derived by `scripts/extract_items_game.py`.

| | AK-47 | Glock-18 |
| --- | ---: | ---: |
| Official kits | 61 | 59 |
| Fade / 渐变之色 (38) | no | yes |
| Case Hardened (44) | yes | no |
| Live shaders | 9 | 2 (Fade + Candy Apple) |

Static tables: `/catalog/ak47.html`, `/catalog/glock.html`.

## Live Glock kits

| paint index | internal | English | 中文 | style | mask | notes |
| ---: | --- | --- | --- | --- | --- | --- |
| 38 | `aa_fade` | Fade | 渐变之色 | 6 Anodized Airbrushed | metal | money shot; wear 0–0.08 |
| 3 | `so_red` | Candy Apple | 红苹果 | 1 Solid Color | metal | vmat Color1 candy red; wear 0–0.3 |

### How Fade is approximated

Not Skincraft. Read local `aa_fade.vmat` (Source2Viewer-CLI 20.0):

- `F_PAINT_STYLE` 5 (= items_game style 6 Anodized Airbrushed)
- `g_tPattern` = `paints/anodized_air/fade.png` (horizontal color ramp LUT)
- `g_vColor0..3` silver / gold / pink / purple
- `g_bIgnoreWeaponSizeScale` 1, `g_flPaintRoughness` 0.25
- Workshop: “the pattern is applied as a gradient along the length of the weapon”
  (https://www.counter-strike.net/workshop/workshopfinishes/)

Viewer: style-6 branch samples the LUT along `vMapUv.x` plus seed `translateX`
(fade %), then nested RGB of the four vmat colors. Metal mask, metalness 0.92.
Wear remap 0–0.08 from items_game. HUMAN_REVIEW — not 1:1 CS2 fade %.

Candy Apple: `so_red.vmat` has no pattern. Style-1 branch paints Color1
`[0.741, 0.169, 0.169]` on the metal mask.

## Export

See `docs/paths.md`. VPK entry:
`weapons/models/glock18/weapon_pist_glock18.vmdl_c` (CRC `00e99d3325`).
HD mesh `body_hd`; `body_legacy` hidden. Composite inputs:
`weapons/models/glock18/materials/composite_inputs/…`.

Glock `paint_data`: WeaponLength `7.976940`, UVScale `0.446000`.

## Stickers / extras

Glock HD primitive has `TEXCOORD_1` (11688 verts, range roughly −1.9…0.89).
Four slots stay enabled. Slot markup is still the AK `StickerMarkup` table —
placement on the Glock is approximate, not crashed / not disabled.

StatTrak / nametag overlays are retuned onto the pistol slide.

## How to run

From the repo root install deps then start the workspace dev server.
http://127.0.0.1:5173/?weapon=glock&kit=38

Tests: from `apps/web`, `npx vitest run`.

## Tests

From `apps/web`: `npx vitest run` (133).

- Glock official catalog includes 38 Fade / 渐变之色
- AK catalog still 61, still no Fade
- `weapon=glock&kit=38` accepted
- `weapon=ak47&kit=38` rejected
- `weapon=awp` rejected
- Glock aliases
- `weapon=glock&kit=44` rejected (fallback Fade)

## Screenshots

1280×720, Chrome + SwiftShader. Hold `/m11-hold.png` + POST `/m11-release`.

- `tests/baselines/m11_glock_fade.png` — weapon=glock kit=38, capture=1
- `tests/baselines/m11_glock_hud.png` — Glock catalog HUD visible (Fade Live)
- `tests/baselines/m11_ak47_still.png` — weapon=ak47 kit=44 seed 923 float 0.056 capture=1
- `tests/baselines/m11_glock_candy.png` — weapon=glock kit=3 capture=1

HUMAN_REVIEW. Approximate Fade / anodized airbrush, not in-game pixel match.

## What was built

- `scripts/extract_items_game.py` — `weapon_glock` catalog
- `data/glock_paint_kits.json` (59 rows)
- `apps/web/src/share/weapons.ts` + weapon-aware `query.ts`
- `apps/web/src/kits/catalog.ts` — `GLOCK_KITS` / `KIT_FADE` / `KIT_CANDY_APPLE`
- `apps/web/src/patternMaterial.ts` — style 6 Fade + style 1 solid
- `apps/web/src/main.ts` — dual model load, Glock cameras, HUD switcher
- `assets/glock.glb` (mesh; sidecar PNGs gitignored)
- `docs/MILESTONE_11.md`

Official paint / composite PNGs are not committed.

## Not in this milestone

- All 59 Glock kits as Live shaders
- Fade on AK-47 (does not exist)
- M12 shader rewrite / Source 2 material graph
- M13 inspect links
- Charm / keychain
- Knives / AWP
