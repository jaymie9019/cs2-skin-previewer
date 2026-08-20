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
