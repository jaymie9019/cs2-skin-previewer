# M0 paths and repeatable commands

Local-only CS2 / Valve assets. Official VPK files and full game textures stay on this box and must not be published in a public repo.

## Disk (this box)

- Filesystem: overlay, 126G total
- After CS2 install: ~80G used, ~40G avail (2026-08-20 22:44 MYT / 14:44 UTC)
- CS2 on-disk size: 67G (`du -sh /workspace/cs2`)
- SteamCMD reported: 59,492,418,048 bytes downloaded, 71,154,568,564 bytes staged/installed

## SteamCMD

- Install method: official Linux tarball (not apt)
- Tarball: `https://steamcdn-a.akamaihd.net/client/installer/steamcmd_linux.tar.gz`
- Install dir: `/home/box/steamcmd`
- Launcher: `/home/box/steamcmd/steamcmd.sh`
- SteamCMD client version (bootstrap): `1785799152` (updater built 2026-08-03)
- Steam user data / logs: `/home/box/Steam` (anonymous session)

First-run self-update:

```bash
mkdir -p /home/box/steamcmd
cd /home/box/steamcmd
wget -q https://steamcdn-a.akamaihd.net/client/installer/steamcmd_linux.tar.gz
tar -xzf steamcmd_linux.tar.gz
./steamcmd.sh +quit
```

Runtime libs installed on Debian 13: `lib32gcc-s1 lib32stdc++6`.

## CS2 install

- AppID: `730` (Counter-Strike 2)
- Login: **anonymous succeeded** (no Steam account required for this depot set)
- Install dir: `/workspace/cs2`
- Manifest: `/workspace/cs2/steamapps/appmanifest_730.acf`
- Name in manifest: `Counter-Strike 2`
- `installdir` field: `Counter-Strike Global Offensive`
- BuildID: `24828357`
- StateFlags: `4` (Fully Installed)
- Installed depots: `731`, `2347770`, `2347773`, `2347774`

Command that worked:

```bash
/home/box/steamcmd/steamcmd.sh \
  +force_install_dir /workspace/cs2 \
  +login anonymous \
  +app_update 730 validate \
  +quit
```

### Important CS2 / VPK paths

| What | Path |
| --- | --- |
| Game root | `/workspace/cs2` |
| CS2 gameinfo | `/workspace/cs2/game/csgo/gameinfo.gi` |
| Main directory VPK | `/workspace/cs2/game/csgo/pak01_dir.vpk` (7.3M) |
| Main VPK fragments | `/workspace/cs2/game/csgo/pak01_000.vpk` … `pak01_494.vpk` |
| Imported VPK | `/workspace/cs2/game/csgo_imported/pak01_dir.vpk` |
| Core VPK | `/workspace/cs2/game/csgo_core/pak01_dir.vpk` |
| Engine core VPK | `/workspace/cs2/game/core/pak01_dir.vpk` |

CLI `--game` loads search paths from `gameinfo.gi` and preloads those VPKs for materials/textures.

## Source 2 Viewer CLI (ValveResourceFormat)

- Preference: Linux CLI release binary (not a repo clone)
- Release: [20.0](https://github.com/ValveResourceFormat/ValveResourceFormat/releases/tag/20.0)
- Asset: `cli-linux-x64.zip`
- Unpack dir: `/workspace/tools/source2viewer`
- Binary: `/workspace/tools/source2viewer/Source2Viewer-CLI`
- Version string: `20.0.6980+a06886f7d06049052d32a7381ec05523064a2ca0`

```bash
mkdir -p /workspace/tools/source2viewer
cd /workspace/tools/source2viewer
wget -q -O cli-linux-x64.zip \
  https://github.com/ValveResourceFormat/ValveResourceFormat/releases/download/20.0/cli-linux-x64.zip
unzip -o cli-linux-x64.zip
chmod +x Source2Viewer-CLI
./Source2Viewer-CLI --version
```

Docs used:

- https://s2v.app/
- https://s2v.app/ValveResourceFormat/guides/exporting-models.html
- https://s2v.app/ValveResourceFormat/guides/command-line.html
- https://github.com/ValveResourceFormat/ValveResourceFormat

## AK-47 compiled model

`--vpk_filepath` / `-f` is a **path prefix** filter, not a free-text search. `-f ak47` returns nothing; list from `weapons/models` instead.

```bash
Source2Viewer-CLI \
  -i /workspace/cs2/game/csgo/pak01_dir.vpk \
  -l -f "weapons/models" -e "vmdl_c"
```

Target file:

- VPK entry: `weapons/models/ak47/weapon_rif_ak47.vmdl_c`
- CRC: `004fbef006`
- Packed size: `970023` bytes
- Magazine sibling (not exported): `weapons/models/ak47/weapon_rif_ak47_mag.vmdl_c`

## Export command that worked

```bash
export PATH="/workspace/tools/source2viewer:$PATH"

Source2Viewer-CLI \
  -i /workspace/cs2/game/csgo/pak01_dir.vpk \
  -f "weapons/models/ak47/weapon_rif_ak47.vmdl_c" \
  -o /workspace/cs2-skin-previewer/assets/ak47.glb \
  -d \
  --gltf_export_format glb \
  --gltf_export_materials \
  --gltf_textures_adapt \
  --game /workspace/cs2/game/csgo/gameinfo.gi
```

Notes vs the milestone sketch:

- Input is the **directory VPK** plus exact `-f` match (CLI writes a single output file in that case). A loose `.vmdl_c` path is not required.
- `--game gameinfo.gi` is needed so materials resolve across `csgo`, `csgo_imported`, `csgo_core`, and `core`.
- `--gltf_textures_adapt` splits ORM / metallic maps to glTF conventions.

CLI also wrote sidecar PNGs next to the glb (official extracted textures) and `ak47_physics.glb`. Those stay local and are gitignored.

## Output asset

| File | Size | Role |
| --- | --- | --- |
| `/workspace/cs2-skin-previewer/assets/ak47.glb` | 3,249,936 bytes (3.1M) | Local-dev world/view rifle mesh |
| `assets/ak47_physics.glb` | 5,232 bytes | Physics hull (CLI extra) |
| `assets/ak47_*.png` and other sidecar PNGs | ~64M total | Extracted official textures; do not publish |

`file` on the main export: `glTF binary model, version 2, length 3249936 bytes`.

Inspected JSON chunk:

- generator: `Source 2 Viewer 20.0.0.0`
- glTF version: `2.0`
- scene name: `weapon_rif_ak47.vmdl_c`
- meshes: `body_legacy`, `body_hd`
- materials: `ak47`, `sticker_gaps`, `weapon_rif_ak47`
- 9 textures / 9 images, 1 BIN buffer

## Compliance

- Official CS2 install, VPKs, compiled resources (`.vmdl_c`, `.vtex_c`, `.vmat_c`, …), and extracted full-resolution textures stay on this machine.
- Do not copy `/workspace/cs2` or any `*.vpk` into a public-looking tree or git remote.
- The exported `assets/ak47.glb` is a local-dev convenience only. Treat Valve IP as not redistributable.
- `.gitignore` excludes VPKs, compiled Source 2 files, the CS2 install, and sidecar PNGs.


## items_game + localization extract (schema study)

Not in `csgo_imported` / `csgo_core`. Only `scripts/items/items_game.txt` exists under `scripts/items/` in the main VPK (no `items_game_cdn.txt` split). Localization is `resource/csgo_*.txt` in the same pak01.

```bash
export PATH="/workspace/tools/source2viewer:$PATH"
mkdir -p /workspace/cs2-skin-previewer/data/raw

Source2Viewer-CLI \
  -i /workspace/cs2/game/csgo/pak01_dir.vpk \
  -o /workspace/cs2-skin-previewer/data/raw \
  -f "scripts/items/items_game.txt"

Source2Viewer-CLI \
  -i /workspace/cs2/game/csgo/pak01_dir.vpk \
  -o /workspace/cs2-skin-previewer/data/raw \
  -f "resource/csgo_english.txt"

Source2Viewer-CLI \
  -i /workspace/cs2/game/csgo/pak01_dir.vpk \
  -o /workspace/cs2-skin-previewer/data/raw \
  -f "resource/csgo_schinese.txt"

Source2Viewer-CLI \
  -i /workspace/cs2/game/csgo/pak01_dir.vpk \
  -o /workspace/cs2-skin-previewer/data/raw \
  -f "resource/csgo_tchinese.txt"

# List-only checks used:
# Source2Viewer-CLI -i .../pak01_dir.vpk -l -f "scripts/items"
# Source2Viewer-CLI -i .../pak01_dir.vpk -l -f "resource/"

python3 /workspace/cs2-skin-previewer/scripts/extract_items_game.py
```

Local dump (gitignored):

| File | Size (this extract) | VPK CRC / packed size |
| --- | --- | --- |
| `data/raw/scripts/items/items_game.txt` | 8.0M | CRC `00da1564c5`, packed 8,382,779 |
| `data/raw/resource/csgo_english.txt` | 4.7M | CRC `0057f3ed58`, packed 4,841,762 |
| `data/raw/resource/csgo_schinese.txt` | 4.7M | CRC `000202a951`, packed 4,893,409 |
| `data/raw/resource/csgo_tchinese.txt` | 4.4M | CRC `00ef4e3e0a`, packed 4,591,162 |

Derived catalogs (committed): `data/ak47_paint_kits.json`, `data/stickers.json`, `data/paint_kits_all.json`.


## Glock-18 compiled model (M11)

Listed from `weapons/models` (do not guess; `-f` is a path prefix):

```bash
Source2Viewer-CLI \
  -i /workspace/cs2/game/csgo/pak01_dir.vpk \
  -l -f "weapons/models" -e "vmdl_c"
```

Target file:

- VPK entry: `weapons/models/glock18/weapon_pist_glock18.vmdl_c`
- CRC: `00e99d3325`
- Packed size: `556155` bytes
- Magazine sibling (not exported): `weapons/models/glock18/weapon_pist_glock18_mag.vmdl_c`

```bash
export PATH="/workspace/tools/source2viewer:$PATH"

Source2Viewer-CLI \
  -i /workspace/cs2/game/csgo/pak01_dir.vpk \
  -f "weapons/models/glock18/weapon_pist_glock18.vmdl_c" \
  -o /workspace/cs2-skin-previewer/assets/glock.glb \
  -d \
  --gltf_export_format glb \
  --gltf_export_materials \
  --gltf_textures_adapt \
  --game /workspace/cs2/game/csgo/gameinfo.gi
```

| File | Size | Role |
| --- | --- | --- |
| `/workspace/cs2-skin-previewer/assets/glock.glb` | 1,539,028 bytes | Local-dev Glock mesh |
| sidecar `glock_*.png` | gitignored | Official extracted textures |

Inspected JSON chunk: meshes `body_legacy`, `body_hd`; materials `pist_glock18`, `weapon_pist_glock`. Hide `body_legacy`. HD has `TEXCOORD_1` (stickers).

Composite inputs (masks + packed cavity R/G/A):

```bash
Source2Viewer-CLI -i $VPK -d --game $GI \
  -f "weapons/models/glock18/materials/composite_inputs/weapon_pist_glock_composite_inputs.vmat_c" \
  -o /tmp/glock_composite
```

Copy `weapon_pist_glock18_masks.png` and pack cavity/AO/nopaint into
`assets/composite/weapon_pist_glock18_cavity.png` (gitignored PNGs).

Pairing token for items_game is `[kit]weapon_glock`. Re-run:

```bash
python3 /workspace/cs2-skin-previewer/scripts/extract_items_game.py
```

Derived: `data/glock_paint_kits.json` (59 official, includes kit 38 Fade).
