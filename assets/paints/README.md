# Local paint extracts (gitignored binaries)

Official Case Hardened / wear / grunge PNGs live under `aq_oiled/` and are
gitignored (`assets/**/*.png`). Do not commit them.

Kit: **AK-47 | Case Hardened** (`aq_oiled`, paint kit 44, style 8 / Patina).

Extract (Source2Viewer-CLI 20.0, local CS2 VPKs):

```bash
Source2Viewer-CLI \
  -i /workspace/cs2/game/csgo/pak01_dir.vpk \
  -f "materials/models/weapons/customization/paints/vmats/aq_oiled.vmat_c" \
  -o /tmp/aq_oiled -d \
  --game /workspace/cs2/game/csgo/gameinfo.gi
```

That decompile writes:

| File | VPK source | Role |
| --- | --- | --- |
| `oiled.png` | `materials/models/weapons/customization/paints/antiqued/oiled_psd_9f35e709.vtex` | Pattern (`g_tPattern`) |
| `paint_wear.png` | `materials/models/weapons/customization/shared/paint_wear_psd_a2abffd8.vtex` | Wear map (same seed transform; M3) |
| `gun_grunge.png` | `materials/models/weapons/customization/shared/gun_grunge_psd_f3419fed.vtex` | Grunge map (same seed transform; M3) |

Copy into `assets/paints/aq_oiled/` for the Vite symlink (`/assets/paints/aq_oiled/oiled.png`).

## Weapon composite inputs (M3, gitignored)

HD AK-47 paint-by-number + cavity, used so Case Hardened paints **metal only**
(stock / grip / handguard stay wood). Extracted from the same VPKs:

```bash
Source2Viewer-CLI \
  -i /workspace/cs2/game/csgo/pak01_dir.vpk \
  -d \
  --game /workspace/cs2/game/csgo/gameinfo.gi \
  -f "weapons/models/ak47/materials/composite_inputs/weapon_rif_ak47_composite_inputs.vmat_c" \
  -o /tmp/m3-ak
```

Copy into `assets/composite/` (served as `/assets/composite/...`):

| File | VPK source | Role |
| --- | --- | --- |
| `weapon_rif_ak47_masks.png` | `.../composite_inputs/weapon_rif_ak47_masks_tga_dd37657.vtex` | Paint-by-number. R = Patina/anodized (metal). |
| `weapon_rif_ak47_cavity.png` | `.../composite_inputs/weapon_rif_ak47_cavity_psd_952ab3.vtex` | Packed RGBA: R cavity, G AO, A no-paint. |
