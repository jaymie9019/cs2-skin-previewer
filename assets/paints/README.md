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

## Safari Mesh — `sp_mesh_tan` / kit 72 / style 3 Spray-Paint

```bash
$CLI -i $VPK -d --game $GI \
  -f "materials/models/weapons/customization/paints/vmats/sp_mesh_tan.vmat_c" \
  -o /tmp/sp_mesh_tan
```

Copy into `assets/paints/sp_mesh_tan/`:

| File | VPK source | Role |
| --- | --- | --- |
| `chainlink.png` | `.../paints/spray/chainlink_psd_f51b2b81.vtex` | Pattern RGB blend mask |

vmat: `F_PAINT_STYLE` 2 (= items_game style 3), `g_flPatternTexCoordScale` 1.75,
`g_vColor0..3` tan / charcoal / olive / khaki. No `g_flPaintRoughness` (viewer uses 0.6 spray default).

## Blue Laminate — `hy_ak47lam_blue` / kit 226 / style 2 Hydrographic

```bash
$CLI -i $VPK -d --game $GI \
  -f "materials/models/weapons/customization/paints/vmats/hy_ak47lam_blue.vmat_c" \
  -o /tmp/hy_ak47lam_blue
```

Copy into `assets/paints/hy_ak47lam_blue/`:

| File | VPK source | Role |
| --- | --- | --- |
| `laminate_ak47.png` | `.../paints/hydrographic/laminate_ak47_psd_2ce8f5f0.vtex` | UV-aligned hydrographic film (same compiled texture as kit 14) |

vmat: `F_PAINT_STYLE` 1 (= items_game style 2), `g_bIgnoreWeaponSizeScale` 1,
`g_flPaintRoughness` 0.45, `g_vColor0..3` charcoal / blue / tan / light blue.
Wear remap 0.02–0.4. Same grain window as Red Laminate.

## Redline — `cu_ak47_cobra` / kit 282 / style 7 Custom Paint Job

```bash
$CLI -i $VPK -d --game $GI \
  -f "materials/models/weapons/customization/paints/vmats/cu_ak47_cobra.vmat_c" \
  -o /tmp/cu_ak47_cobra
```

Copy into `assets/paints/cu_ak47_cobra/`:

| File | VPK source | Role |
| --- | --- | --- |
| `elegantredv1_1.png` | `.../paints/custom/workshop/elegantredv1_1_tga_515b3d45.vtex` | UV-aligned custom albedo |

vmat: `F_PAINT_STYLE` 6 (= items_game style 7), `g_bIgnoreWeaponSizeScale` 1,
`g_flPaintMetalness` 1. M12 loads `elegantredv1_1_rough.png` (`F_ROUGHNESS_TEXTURE` 1 / `g_tPaintRoughness`).

## Hydroponic — `am_bamboo_jungle` / kit 456 / style 5 Anodized Multicolored

```bash
$CLI -i $VPK -d --game $GI \
  -f "materials/models/weapons/customization/paints/vmats/am_bamboo_jungle.vmat_c" \
  -o /tmp/am_bamboo_jungle
```

Copy into `assets/paints/am_bamboo_jungle/`:

| File | VPK source | Role |
| --- | --- | --- |
| `bamboo_jungle.png` | `.../paints/anodized_multi/bamboo_jungle_psd_ed8ca5eb.vtex` | Pattern RGB blend mask |

vmat: `F_PAINT_STYLE` 4 (= items_game style 5), `g_bIgnoreWeaponSizeScale` 1,
`g_flPatternTexCoordScale` 1.4, `g_flPaintRoughness` 0.6,
`g_vColor0..3` cream / red / gray / lime.

## Fuel Injector — `gs_ak47_supercharged` / kit 524 / style 9 Gunsmith

```bash
$CLI -i $VPK -d --game $GI \
  -f "materials/models/weapons/customization/paints/vmats/gs_ak47_supercharged.vmat_c" \
  -o /tmp/gs_ak47_supercharged
```

Copy into `assets/paints/gs_ak47_supercharged/`:

| File | VPK source | Role |
| --- | --- | --- |
| `ak47_supercharged.png` | `.../paints/gunsmith/workshop/ak47_supercharged_tga_ef27ba3e.vtex` | UV-aligned gunsmith albedo |

vmat: `F_PAINT_STYLE` 8 (= items_game style 9), `g_bIgnoreWeaponSizeScale` 1,
`g_flPaintRoughness` 0.4, `g_flPaintMetalness` 0. M12 loads `ak47_supercharged_normal.png` (`F_OVERRIDE_NORMAL` 1). Kit masks are a decal layout, unused.

## Bloodsport — `gs_ak47_bloodsport` / kit 639 / style 9 Gunsmith

```bash
$CLI -i $VPK -d --game $GI \
  -f "materials/models/weapons/customization/paints/vmats/gs_ak47_bloodsport.vmat_c" \
  -o /tmp/gs_ak47_bloodsport
```

Copy into `assets/paints/gs_ak47_bloodsport/`:

| File | VPK source | Role |
| --- | --- | --- |
| `ak47_bloodsport.png` | `.../paints/gunsmith/workshop/ak47_bloodsport_tga_814c7428.vtex` | UV-aligned gunsmith albedo |

vmat: `F_PAINT_STYLE` 8 (= items_game style 9), `g_bIgnoreWeaponSizeScale` 1,
`g_flPaintRoughness` 0.4, `g_flPaintMetalness` 1. Wear remap 0–0.45.


## Fade — `aa_fade` / kit 38 / style 6 Anodized Airbrushed (Glock)

```bash
$CLI -i $VPK -d --game $GI \
  -f "materials/models/weapons/customization/paints/vmats/aa_fade.vmat_c" \
  -o /tmp/aa_fade
```

Copy into `assets/paints/aa_fade/`:

| File | VPK source | Role |
| --- | --- | --- |
| `fade.png` | `.../paints/anodized_air/fade_psd_24407e73.vtex` | 1D color ramp LUT (`g_tPattern`) |

vmat: `F_PAINT_STYLE` 5 (= items_game style 6), `g_bIgnoreWeaponSizeScale` 1,
`g_flPaintRoughness` 0.25, `g_vColor0..3` silver / gold / pink / purple.
Wear remap 0–0.08. Glock only (not AK).

## Candy Apple — `so_red` / kit 3 / style 1 Solid Color (Glock)

```bash
$CLI -i $VPK -d --game $GI \
  -f "materials/models/weapons/customization/paints/vmats/so_red.vmat_c" \
  -o /tmp/so_red
```

No `g_tPattern`. Viewer uses Color1 `[0.741176 0.168627 0.168627]` on the metal
mask. `assets/paints/so_red/solid.png` is a 1×1 dummy (gitignored).

## M12 extra maps (gitignored)

| File | Kit | Role |
| --- | --- | --- |
| `cu_ak47_cobra/elegantredv1_1_rough.png` | 282 | `g_tPaintRoughness` |
| `gs_ak47_supercharged/ak47_supercharged_normal.png` | 524 | `g_tNormal` |
