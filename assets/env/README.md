# Local environment maps (M9)

Inspect lighting looks are **authored Three.js scenes** baked through
`PMREMGenerator` (`apps/web/src/env/author.ts`). They are *our* looks
(`studio` / `warm` / `cool` / `sun`), not Dust II / Inferno / Skincraft
map videos.

Default `studio` is three.js `RoomEnvironment` — the same bake as M6 —
so Case Hardened / Red Laminate baselines stay in class.

Official CS2 cubemaps exist in the local install. We extracted them to
confirm VRF can decode them, then **did not ship them** (Valve IP,
multi-MB EXR). Commands below are for local experiments only.

## Looks

| `bg=` | Origin | What it is |
| --- | --- | --- |
| `studio` (default) | authored | RoomEnvironment PMREM. Plate `#14161a`. |
| `warm` | authored | Dusty courtyard — warm sun + pale sky. Plate `#2a2218`. |
| `cool` | authored | Overcast — cooler fill. Plate `#1a1e24`. |
| `sun` | authored | High-sun key, more contrast. Plate `#1c1812`. |

`bg=inferno` / `bg=dust2` / `bg=skincraft` are **rejected** (fallback studio).
We did not name looks after maps because the cubemaps are not those extracts.

## Local extract we tried (do not commit)

Always `--game /workspace/cs2/game/csgo/gameinfo.gi` and the directory VPK.

```bash
CLI=/workspace/tools/source2viewer/Source2Viewer-CLI
GI=/workspace/cs2/game/csgo/gameinfo.gi
VPK=/workspace/cs2/game/csgo/pak01_dir.vpk

# Tool-scene lighting cubemap (Dust-ish). Decompiles to ~5.7 MB EXR.
$CLI -i $VPK -d --game $GI \
  -f "materials/editor/toolscene_lighting_de_dust_cubemap_exr_edd5c040.vtex_c" \
  -o /tmp/m9-extract

# Dust II sky HDR (official, ~1.4 MB packed).
$CLI -i $VPK -d --game $GI \
  -f "materials/skybox/sky_de_dust2_exr_908a35ba.vtex_c" \
  -o /tmp/m9-extract

# Cloudy / overcast cube.
$CLI -i $VPK -d --game $GI \
  -f "materials/skybox/sky_csgo_cloudy01_cube_pfm_f9a0b177.vtex_c" \
  -o /tmp/m9-extract
```

Also present in `pak01_dir.vpk` (list-only, not extracted into the repo):

- `materials/skybox/sky_de_dust2.vmat_c` + `sky_de_dust2_exr_908a35ba.vtex_c`
- `materials/skybox/test/s2_de_inferno_sky01_custom_cubemap.vtex_c`
- `materials/editor/toolscene_lighting_de_dust_cubemap_exr_edd5c040.vtex_c`
- `materials/cubemaps/cubemap_exterior_01_exr_d8730545.vtex_c`
- `materials/fx/inspect_agents_custom_cubemap.vtex_c`

`.gitignore` already drops `assets/**/*.png` and now also `*.hdr` / `*.exr`.
Do not commit official cubemap dumps.
