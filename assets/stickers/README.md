# Local sticker extracts (gitignored binaries)

Official sticker / wear-mask / holomask / spectrum / scratch PNGs live under
this folder and are gitignored (`assets/**/*.png`). Do not commit them.

Extract with **Source2Viewer-CLI 20.0** against the local CS2 install.
Always pass `--game /workspace/cs2/game/csgo/gameinfo.gi`.

```bash
CLI=/workspace/tools/source2viewer/Source2Viewer-CLI
GI=/workspace/cs2/game/csgo/gameinfo.gi
VPK=/workspace/cs2/game/csgo/pak01_dir.vpk
```

Subset used by M5 (ids from `data/stickers.json`):

| id | token | English | style | VPK vmat |
| ---: | --- | --- | --- | --- |
| 259 | `dinked` | Dinked / 射穿啦 | paper | `stickers/community02/dinked.vmat_c` |
| 14 | `std_aces_high` | Aces High | paper | `stickers/standard/aces_high.vmat_c` |
| 15 | `std_aces_high_holo` | Aces High (Holo) | holo | `stickers/standard/aces_high_holo.vmat_c` |
| 13 | `std_thirteen` | Lucky 13 | paper | `stickers/standard/thirteen.vmat_c` |
| 278 | `firestarter_holo` | Firestarter (Holo) | holo | `stickers/community02/firestarter_holo.vmat_c` |

```bash
$CLI -i $VPK -d --game $GI -f "stickers/community02/dinked.vmat_c" -o /tmp/dinked
# Copy TextureColorSticker0 → assets/stickers/dinked/color.png
# Copy TextureWearMaskSticker0 (`*-A.png`) → wear.png
```

Shared engine maps:

| File | VPK | Role |
| --- | --- | --- |
| `shared/scratches.png` | `materials/default/stickers/sticker_default_scratches_psd_a9ad199b.vtex_c` | `g_tStickerScratches` (engine-applied wear) |
| `shared/backing.png` | `materials/default/stickers/sticker_default_backing_psd_a83fef52.vtex_c` | paper backing |
| `shared/holowarp.png` | `materials/default/stickers/holowarp_default_tga_60b485a7.vtex_c` | default holo spectrum fallback |

Workshop: https://www.counter-strike.net/workshop/workshopstickers/
