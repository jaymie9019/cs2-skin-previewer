# Local paint extracts (gitignored binaries)

Official paint / wear / grunge PNGs live under kit folders and are
gitignored (`assets/**/*.png`). Do not commit them.

Extract with **Source2Viewer-CLI 20.0** against the local CS2 install.
Always pass `--game /workspace/cs2/game/csgo/gameinfo.gi` so imported
VPKs resolve.

```bash
CLI=/workspace/tools/source2viewer/Source2Viewer-CLI
GI=/workspace/cs2/game/csgo/gameinfo.gi
VPK=/workspace/cs2/game/csgo/pak01_dir.vpk
```

## Case Hardened — `aq_oiled` / kit 44 / style 8 Patina

```bash
$CLI -i $VPK -d --game $GI \
  -f "materials/models/weapons/customization/paints/vmats/aq_oiled.vmat_c" \
  -o /tmp/aq_oiled
```

Copy into `assets/paints/aq_oiled/` (served as `/assets/paints/aq_oiled/...`):

| File | VPK source | Role |
| --- | --- | --- |
| `oiled.png` | `.../paints/antiqued/oiled_psd_9f35e709.vtex` | Pattern (`g_tPattern`) |
| `paint_wear.png` | `.../shared/paint_wear_psd_a2abffd8.vtex` | Wear map (shared) |
| `gun_grunge.png` | `.../shared/gun_grunge_psd_f3419fed.vtex` | Grunge map (shared) |

## Jungle Spray — `sp_spray_jungle` / kit 122 / style 3 Spray-Paint

```bash
$CLI -i $VPK -d --game $GI \
  -f "materials/models/weapons/customization/paints/vmats/sp_spray_jungle.vmat_c" \
  -o /tmp/sp_spray_jungle
```

Copy into `assets/paints/sp_spray_jungle/`:

| File | VPK source | Role |
| --- | --- | --- |
| `camo_daubs.png` | `.../paints/spray/camo_daubs_psd_4e8a0acc.vtex` | Pattern RGB blend mask |

vmat: `F_PAINT_STYLE` 2 (= items_game style 3), `g_flPatternTexCoordScale` 1.65,
`g_flPaintRoughness` 0.6, `g_vColor0..3` olive / lime / tan / brown.

## Red Laminate — `hy_ak47lam` / kit 14 / style 2 Hydrographic

```bash
$CLI -i $VPK -d --game $GI \
  -f "materials/models/weapons/customization/paints/vmats/hy_ak47lam.vmat_c" \
  -o /tmp/hy_ak47lam
```

Copy into `assets/paints/hy_ak47lam/`:

| File | VPK source | Role |
| --- | --- | --- |
| `laminate_ak47.png` | `.../paints/hydrographic/laminate_ak47_psd_2ce8f5f0.vtex` | UV-aligned hydrographic film |

vmat: `F_PAINT_STYLE` 1 (= items_game style 2), `g_bIgnoreWeaponSizeScale` 1,
`g_flPaintRoughness` 0.45, `g_vColor0..3` dark brown / red / tan / orange.

## Weapon composite inputs (per-kit mask source)

HD AK-47 paint-by-number + cavity. Mask *mode* is per kit (M4), not global.

```bash
$CLI -i $VPK -d --game $GI \
  -f "weapons/models/ak47/materials/composite_inputs/weapon_rif_ak47_composite_inputs.vmat_c" \
  -o /tmp/m3-ak
```

Copy into `assets/composite/`:

| File | VPK source | Role |
| --- | --- | --- |
| `weapon_rif_ak47_masks.png` | `.../composite_inputs/weapon_rif_ak47_masks_tga_dd37657.vtex` | Paint-by-number. R = Patina/anodized (metal). |
| `weapon_rif_ak47_cavity.png` | `.../composite_inputs/weapon_rif_ak47_cavity_psd_952ab3.vtex` | Packed RGBA: R cavity, G AO, A no-paint. |
