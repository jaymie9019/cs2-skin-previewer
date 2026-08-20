# items_game.txt study (CS2, local VPK extract)

This is the schema milestone. It does **not** switch paint kits in the Three.js viewer.
Source of truth: local `scripts/items/items_game.txt` plus `resource/csgo_english.txt` and `resource/csgo_schinese.txt`, extracted from `/workspace/cs2/game/csgo/pak01_dir.vpk` (Source2Viewer-CLI 20.0). Extract commands: [paths.md](paths.md) and the block at the end of this file.

**Headline facts**

- **61** official AK-47 skins (`[kit]weapon_ak47` pairings). Full table below.
- **AK-47 has no Fade / 渐变之色.** Paint kit `aa_fade` (index 38, tag Fade) is paired with Glock and MAC-10 only.
- **1481** paint kits, **11789** sticker kits (including id 0 `default` and 112 patches).
- No `items_game_cdn.txt` (or other split files) under `scripts/items/` in pak01. `csgo_imported` / `csgo_core` VPKs were searched via gameinfo preload; the dump came from the main csgo pak01.

---

## 1. How items_game is structured

Root object `"items_game" { ... }`. Valve **appends DLC by repeating top-level keys** later in the same file (`paint_kits` first at line 34001, then again at 40519, 40797, … 213766, …). A parser must **merge** duplicate maps (later keys add/overwrite by id). This extract has 272,456 lines; 694 top-level block opens, many of them repeats.

Observed top-level maps (first occurrence line in this dump):

| Key | First line | Role |
| --- | ---: | --- |
| `game_info` | 3 | Class/slot bounds; `max_num_stickers` `5`; `max_num_patches` `3` |
| `rarities` | 13 | `default`…`immortal` plus `unusual`; `loc_key_weapon`, `color` |
| `qualities` | 103 | `normal`, `genuine`, `vintage`, `unusual`, `unique`, … |
| `colors` | 196 | UI rarity colors |
| `graffiti_tints` | 299 | Graffiti |
| `player_loadout_slots` | 397 | Loadout |
| `alternate_icons2` | 456 | In this CS2 dump: **only** `casket_icons` (no `weapon_icons`) |
| `prefabs` | 470 | Shared item templates (`rifle`, `weapon_ak47_prefab`, `weapon_supports_stickers`, …) |
| `items` | 4725 | Item definitions by defindex (`"7"` = AK-47) |
| `attributes` | 21318 | Econ attributes (paint kit / wear / seed / sticker slots) |
| `sticker_kits` | 23966 | Sticker + patch definitions by numeric id |
| `paint_kits` | 34001 | Skin definitions by paint index |
| `paint_kits_rarity` | 39058 | `kit_name` → rarity string (`aq_oiled` `mythical`, `aa_fade` `rare`, …) |
| `item_sets` | 39516 | Collections: `items { "[kit]weapon" "1" }` |
| `client_loot_lists` | 40702 | Crate/drop lists; same `[kit]weapon` keys |
| `revolving_loot_lists` | 41408 | Named revolving tables |
| `items_game_live` | 143862 | Live-ops blob (pro player stats stubs), not paint kits |

**Paint kit body keys actually used** (counts after merge): `name` 1481, `description_string` 1480, `description_tag` 1480, `style` 1387, `wear_remap_max` 1290, `wear_remap_min` 1281, `use_legacy_model` 884, `composite_material_path` 332, `wear_default` 130, `vmt_path` 72 (mostly gloves), `same_name_family_aggregate` 24, `seed` 21, plus rare `wear_gradient` / `view_model_exponent_override_size`. Colors (`g_vColor0` etc.) are **not** in items_game; they live on vmats.

**Sticker kit body keys:** `name`, `item_name`, `description_string` (all 11789), `item_rarity` 11776, `sticker_material` 11676, tournament ids, `patch_material` 112.

**Prefab chain (not a paint whitelist):** space-separated `prefab` strings inherit. Example from `primary` (line 1971):

```
"prefab"    "weapon_base weapon_supports_stickers weapon_supports_keychains"
"capabilities" { "nameable" "1"  "paintable" "1"  "can_stattrack_swap" "1" }
```

`weapon_supports_stickers` (line 480) sets `capabilities.can_sticker` and `stickers` `weapon`.

**Attributes that store a painted gun** (ids from `attributes`):

| id | name | class |
| --- | --- | --- |
| 6 | `set item texture prefab` | `set_item_texture_prefab` (paint kit index) |
| 7 | `set item texture seed` | `set_item_texture_seed` |
| 8 | `set item texture wear` | `set_item_texture_wear` (inspect float 0–1) |
| 113+ | `sticker slot N id/wear/scale/rotation` | `sticker_slot_*` for N = 0..5 |
| later | `sticker slot N offset x/y`, `sticker slot N schema` | |

---

## 2. How AK-47 gets its allowed paint kits (actual mechanism)

There is **no paint-kit whitelist on the weapon item** and **no `used_by_classes` filter for skins**.

What the file actually has:

1. **Item definition** `items` / `"7"` (line 4777):

```
"name"        "weapon_ak47"
"prefab"      "weapon_ak47_prefab"
"item_quality"        "normal"
"baseitem"        "1"
"flexible_loadout_slot"        "rifle1"
"flexible_loadout_default"        "1"
```

2. **Prefab** `weapon_ak47_prefab` (line 2987) → `prefab` `rifle` → `primary` → `weapon_base weapon_supports_stickers weapon_supports_keychains`.
   - `item_class` `weapon_ak47`
   - `used_by_classes { "terrorists" "1" }` — **T-side weapon**, not a kit list.
   - `paint_data.PaintableMaterial0`: `Name` `rif_ak47`, `UVScale` `0.549000`, `WeaponLength` `37.746201` — how **any** kit is projected, not which kits exist.
   - `capabilities.paintable` is inherited from `primary`: the engine will apply a paint kit index. That is not the market catalog.

3. **Official skins** are composite keys in collections and loot lists:

```
"[aq_oiled]weapon_ak47"        "1"
```

inside `item_sets` (e.g. `set_weapons_i` line 39565) and the same string in `client_loot_lists`. The bracketed token is `paint_kits.*.name`; the suffix is the item `name`. Unique pairs in this dump: **61**. Every one has a matching `paint_kits` entry (no dangling names).

4. **Rarity** for the skin is `paint_kits_rarity["aq_oiled"]` = `mythical` (line 39093), not a per-weapon override in the pair key.

5. **`alternate_icons2`** in this CS2 file does **not** list weapon icons (only `casket_icons`). Do not use icon paths as the catalog.

Workshop/inspect can still send an arbitrary paint index onto a paintable weapon. The **official AK-47 skin list** is the `[kit]weapon_ak47` set, not “every paint_kit”.

---

## 3. Complete AK-47 paint kit table

Canonical JSON: [`data/ak47_paint_kits.json`](../data/ak47_paint_kits.json). Wear “omit → 0/1” means the kit has no `wear_remap_min`/`max` in items_game; later CS2 kits that do write the keys use `0.000000`–`1.000000`, so that is the effective default used here.

**Fade / 渐变之色 is not in this table.** Closest name collision: kit 912 `cu_graphic_overlay_ak47` = **Crossfade** / **交叉渐变** (different tag, different kit).

| # | paint index | internal name | English | 中文 | style | wear min | wear max | rarity |
| ---: | ---: | --- | --- | --- | ---: | ---: | ---: | --- |
| 1 | 14 | `hy_ak47lam` | Red Laminate | 红色层压板 | 2 | *(omit → 0)* | *(omit → 1)* | mythical |
| 2 | 44 | `aq_oiled` | Case Hardened | 表面淬火 | 8 | 0 | 1 | mythical |
| 3 | 72 | `sp_mesh_tan` | Safari Mesh | 狩猎网格 | 3 | *(omit → 0)* | *(omit → 1)* | common |
| 4 | 113 | `ak47_t_bus` | The Outsiders | 局外人 | 7 | 0 | 0.9 | mythical |
| 5 | 122 | `sp_spray_jungle` | Jungle Spray | 丛林涂装 | 3 | *(omit → 0)* | *(omit → 1)* | common |
| 6 | 142 | `cu_overpass_monster_ak47` | B the Monster | 怪兽在B | 7 | 0 | 0.8 | legendary |
| 7 | 170 | `sp_zebracam` | Predator | 捕食者 | 3 | *(omit → 0)* | *(omit → 1)* | common |
| 8 | 172 | `hy_ak47lam_bw` | Black Laminate | 黑色层压板 | 2 | *(omit → 0)* | *(omit → 1)* | uncommon |
| 9 | 180 | `cu_fireserpent_ak47_bravo` | Fire Serpent | 火蛇 | 7 | *(omit → 0)* | 0.76 | legendary |
| 10 | 226 | `hy_ak47lam_blue` | Blue Laminate | 蓝色层压板 | 2 | 0.02 | 0.4 | rare |
| 11 | 282 | `cu_ak47_cobra` | Redline | 红线 | 7 | 0.1 | 0.7 | mythical |
| 12 | 300 | `cu_pinstripe_ak47` | Emerald Pinstripe | 翡翠细条纹 | 7 | 0 | 1 | rare |
| 13 | 302 | `cu_ak47_rubber` | Vulcan | 火神 | 7 | 0 | 0.9 | legendary |
| 14 | 316 | `cu_panther_ak47` | Jaguar | 美洲猛虎 | 7 | 0 | 1 | legendary |
| 15 | 340 | `cu_well_traveled_ak47` | Jet Set | 酷炫涂鸦皮革 | 7 | 0 | 1 | mythical |
| 16 | 341 | `cu_green_leather_ak47` | First Class | 至高皮革 | 7 | 0 | 1 | rare |
| 17 | 380 | `cu_tribute_ak47` | Wasteland Rebel | 荒野反叛 | 7 | 0.05 | 0.7 | legendary |
| 18 | 394 | `aq_ak47_cartel` | Cartel | 卡特尔 | 8 | 0 | 0.75 | mythical |
| 19 | 422 | `cu_ak47_mastery` | Elite Build | 精英之作 | 7 | 0 | 1 | uncommon |
| 20 | 456 | `am_bamboo_jungle` | Hydroponic | 水栽竹 | 5 | 0 | 0.8 | mythical |
| 21 | 474 | `cu_ak47_courage_alt` | Aquamarine Revenge | 深海复仇 | 7 | 0 | 1 | legendary |
| 22 | 490 | `cu_ak47_winter_sport` | Frontside Misty | 前线迷雾 | 7 | 0.02 | 0.87 | mythical |
| 23 | 506 | `cu_ak47_point_disarray` | Point Disarray | 混沌点阵 | 7 | 0 | 0.67 | mythical |
| 24 | 524 | `gs_ak47_supercharged` | Fuel Injector | 燃料喷射器 | 9 | 0 | 1 | legendary |
| 25 | 600 | `cu_ak47_anarchy` | Neon Revolution | 霓虹革命 | 7 | 0 | 0.8 | legendary |
| 26 | 639 | `gs_ak47_bloodsport` | Bloodsport | 血腥运动 | 9 | 0 | 0.45 | legendary |
| 27 | 656 | `gs_ak_colony01_red` | Orbit Mk01 | 轨道 Mk01 | 9 | 0 | 0.55 | rare |
| 28 | 675 | `gs_ak47_empress` | The Empress | 皇后 | 9 | 0 | 1 | legendary |
| 29 | 707 | `cu_ak_neon_rider` | Neon Rider | 霓虹骑士 | 7 | 0 | 0.8 | legendary |
| 30 | 724 | `cu_ak_island_floral` | Wild Lotus | 野荷 | 7 | 0 | 1 | legendary |
| 31 | 745 | `hy_veneto_purple` | Baroque Purple | 巴洛克之紫 | 2 | 0 | 1 | common |
| 32 | 795 | `hy_mesh_safetyorange` | Safety Net | 安全网 | 2 | 0 | 0.6 | rare |
| 33 | 801 | `cu_ak47_asiimov` | Asiimov | 二西莫夫 | 7 | 0.05 | 0.7 | legendary |
| 34 | 836 | `cu_ak47_aztec` | Uncharted | 迷踪秘境 | 7 | 0 | 0.75 | uncommon |
| 35 | 885 | `gs_ak47_nibbler` | Rat Rod | 复古浪潮 | 9 | 0 | 1 | rare |
| 36 | 912 | `cu_graphic_overlay_ak47` | Crossfade | 交叉渐变 | 7 | 0 | 0.5 | uncommon |
| 37 | 921 | `gs_ak47_gold_arabesque` | Gold Arabesque | 黄金藤蔓 | 9 | 0 | 0.7 | legendary |
| 38 | 941 | `cu_ak-47_phantom_disruptor` | Phantom Disruptor | 幻影破坏者 | 7 | 0 | 0.65 | mythical |
| 39 | 959 | `cu_ak47_anubis` | Legion of Anubis | 阿努比斯军团 | 7 | 0 | 0.7 | legendary |
| 40 | 1004 | `cu_ak_xray` | X-Ray | X 射线 | 7 | 0 | 1 | legendary |
| 41 | 1018 | `cu_ak_jaguar` | Panthera onca | 美洲豹 | 7 | 0 | 1 | mythical |
| 42 | 1035 | `gs_ak47_professional` | Slate | 墨岩 | 9 | 0 | 1 | rare |
| 43 | 1070 | `hy_ak47lam_green` | Green Laminate | 绿色层压板 | 2 | 0.02 | 0.4 | uncommon |
| 44 | 1087 | `gs_ak47_abstract` | Leet Museo | 抽象派 1337 | 9 | 0 | 0.65 | legendary |
| 45 | 1141 | `cu_ak47_nightwish` | Nightwish | 夜愿 | 7 | 0 | 1 | legendary |
| 46 | 1143 | `cu_ak47_cogthings` | Ice Coaled | 可燃冰 | 7 | 0 | 0.77 | mythical |
| 47 | 1171 | `ak_porcelain` | Inheritance | 传承 | 9 | 0 | 0.797346 | legendary |
| 48 | 1179 | `ht_poly_camo_ak47` | Olive Polycam | 橄榄迷彩 | 3 | 0 | 0.5 | common |
| 49 | 1207 | `ak47_explosive` | Searing Rage | 灼心怒焰 | 9 | 0 | 1 | mythical |
| 50 | 1218 | `soe_iridescent_purple` | Midnight Laminate | 午夜层压板 | 2 | 0 | 0.75 | rare |
| 51 | 1221 | `cu_ak_head_shot_holo` | Head Shot | 一发入魂 | 7 | 0 | 1 | legendary |
| 52 | 1238 | `gs_ak47_strone` | Steel Delta | 钢铁三角洲 | 9 | 0 | 0.73 | uncommon |
| 53 | 1283 | `soe_metallic_green_2` | Wintergreen | 寒翠 | 5 | 0 | 0.75 | uncommon |
| 54 | 1288 | `soe_varicamo` | VariCamo Grey | 灰变迷彩 | 2 | 0 | 0.671875 | common |
| 55 | 1309 | `hye_ak47_nouveau` | Nouveau Rouge | 新红浪潮 | 9 | 0 | 1 | mythical |
| 56 | 1352 | `ak47_puffer_custom` | The Oligarch | 流金王朝 | 9 | 0 | 1 | legendary |
| 57 | 1358 | `hye_zeds` | Breakthrough | 突破 | 2 | 0 | 0.75 | rare |
| 58 | 1397 | `gsch_ak_djiin` | Aphrodite | 爱神 | 9 | 0 | 1 | legendary |
| 59 | 1425 | `ak47_crane_flight` | Crane Flight | 翔鹤 | 9 | 0 | 1 | mythical |
| 60 | 1449 | `ak47_autoexec_camo` | AUTOEXEC | AUTOEXEC | 7 | 0 | 1 | legendary |
| 61 | 1466 | `ak47_jinn_consequence` | Consequence of the Jinn | 精灵之噬 | 9 | 0 | 1 | legendary |


Static catalog page: `apps/web/public/catalog/ak47.html` (screenshot `tests/baselines/items_game_ak47_catalog.png`).

---

## 4. Wear: inspect float vs `wear_remap_*`

**Inspect float** is the econ attribute `set item texture wear` (attribute 8). It is a scalar in **0–1**. Exterior labels are bands on that scalar (same as the M3 slider labels; not stored per kit):

| Band | Inspect float |
| --- | --- |
| FN Factory New | 0.00 – 0.07 |
| MW Minimal Wear | 0.07 – 0.15 |
| FT Field-Tested | 0.15 – 0.38 |
| WW Well-Worn | 0.38 – 0.45 |
| BS Battle-Scarred | 0.45 – 1.00 |

**Visual wear** in the paint shader uses the kit’s remap:

```
visual_wear = lerp(wear_remap_min, wear_remap_max, inspect_float)
```

Cited kits:

- Default kit `"0"` / `default` (line 34003): `wear_remap_min` `0.060000`, `wear_remap_max` `0.800000`, `wear_gradient` `canvas`.
- Case Hardened `"44"` / `aq_oiled` (line 34338): `wear_remap_min` `0.000000`, `wear_remap_max` `1.000000` — inspect 0 and 1 are the visual endpoints. `wear_default` `0.000000`.
- Fade `"38"` / `aa_fade` (line 34277): `wear_remap_min` `0.000000`, `wear_remap_max` `0.080000`. A BS inspect float still only remaps into 0–0.08 visually. This kit is **not** on AK-47.
- Redline `"282"` / `cu_ak47_cobra`: remap **0.10–0.70** (FN-ish inspect still starts at visual 0.10).
- Jungle Spray `"122"` / `sp_spray_jungle`: **omits** remap (effective 0–1), `wear_default` `0.300000`, `style` `3`.

Bands are **not** remapped. A kit with `wear_remap_max` `0.08` can still exist as FT/WW/BS in inventory; it just barely changes look. Do not clamp the inspect slider to remap max.

---

## 5. Stickers

`sticker_kits` is a map of numeric id → kit. Inventory **item** `"1209"` `name` `sticker` (line 9883) is the sticker *tool* (`tool.type` `sticker`); which art you have is the kit id, not a separate item def per sticker.

Typical kit (id 1, line 23974):

```
"name"                    "dh_gologo1"
"item_name"               "#StickerKit_dh_gologo1"
"description_string"      "#StickerKit_desc_dh_gologo1"
"sticker_material"        "dreamhack/dh_gologo1"
"tournament_event_id"     "1"
```

Applied onto a gun via attributes `sticker slot N id` (plus wear/scale/rotation/offset/schema). `game_info.max_num_stickers` is `5` (slots 0–4 in practice); attributes exist through slot 5.

Patches: 112 kits use `patch_material` instead of (or in addition to) `sticker_material`. Item `"4609"` `name` `patch`.

**Counts:** 11789 kits. English token missing for 1 kit (`242` `dhw2014_dignitas_gold` — loc key `#StickerKit_dhw2014_dignitas_gold` not present). Full dump: [`data/stickers.json`](../data/stickers.json) (`id`, `name`, `name_en`, `name_zh`, `sticker_material` / `patch_material`, rarity, tournament ids).

Sample (first 20 including default):

| id | token | English | 中文 | material |
| ---: | --- | --- | --- | --- |
| 0 | `default` | Sticker Name | 印花名称 | `` |
| 1 | `dh_gologo1` | Shooter | 射手 | `dreamhack/dh_gologo1` |
| 2 | `dh_gologo1_holo` | Shooter (Foil) | 射手（闪亮） | `dreamhack/dh_gologo1_holo` |
| 3 | `dh_gologo2` | Shooter Close | 射手近照 | `dreamhack/dh_gologo2` |
| 4 | `dh_gologo2_holo` | Shooter Close (Foil) | 射手近照（闪亮） | `dreamhack/dh_gologo2_holo` |
| 5 | `dh_snowflake2` | Blue Snowflake | 蓝色雪花 | `dreamhack/dh_snowflake2` |
| 6 | `dh_snowflake3` | Blue Snowflake (Foil) | 蓝色雪花（闪亮） | `dreamhack/dh_snowflake3` |
| 7 | `dh_bears` | Polar Bears | 北极熊 | `dreamhack/dh_bears` |
| 8 | `dh_bears_holo` | Polar Bears (Foil) | 北极熊（闪亮） | `dreamhack/dh_bears_holo` |
| 9 | `dh_mountain` | Mountain | 山脉 | `dreamhack/dh_mountain` |
| 10 | `dh_mountain_holo` | Mountain (Foil) | 山脉（闪亮） | `dreamhack/dh_mountain_holo` |
| 11 | `dh_snowman` | Frosty the Hitman | 雪人杀手 | `dreamhack/dh_snowman` |
| 12 | `dh_snowman_holo` | Frosty the Hitman (Foil) | 雪人杀手（闪亮） | `dreamhack/dh_snowman_holo` |
| 13 | `std_thirteen` | Lucky 13 | 幸运十三 | `standard/thirteen` |
| 14 | `std_aces_high` | Aces High | 黑桃 A | `standard/aces_high` |
| 15 | `std_aces_high_holo` | Aces High (Holo) | 黑桃 A（全息） | `standard/aces_high_holo` |
| 16 | `std_conquered` | I Conquered | 我征服 | `standard/conquered` |
| 17 | `std_destroy` | Seek & Destroy | 搜索并毁灭 | `standard/destroy` |
| 18 | `std_dispatch` | Black Dog | 黑犬 | `standard/dispatch` |
| 19 | `std_fearsome` | Fearsome | 惊怖兽王 | `standard/fearsome` |


Material paths are relative (CS2 convention: under `materials/stickers/…` / customization stickers). This milestone does **not** render stickers.

---

## 6. How `#PaintKit_…` / `#StickerKit_…` tokens resolve

Localization files:

```
"lang" { "Language" "English"   "Tokens" { "PaintKit_aa_fade_Tag" "Fade" … } }
"lang" { "Language" "schinese"  "Tokens" { "PaintKit_aa_fade_Tag" "渐变之色" … } }
```

`description_tag` / `item_name` in items_game is usually `"#PaintKit_aq_oiled_Tag"` or `"#StickerKit_dh_gologo1"`. Strip the `#` and look up `Tokens`. Some later paint kits omit the `#` (`"PaintKit_m4a1s_vaporwave_Tag"`). Source token lookup is case-insensitive; this extractor tries exact then lower.

Two paint-kit strings:

| Key | Typical token | Meaning |
| --- | --- | --- |
| `description_tag` | `#PaintKit_aq_oiled_Tag` | **Display name** (“Case Hardened” / “表面淬火”) |
| `description_string` | `#PaintKit_aq_oiled` | Flavor paragraph |

Stickers: `item_name` → `#StickerKit_*` is the display name; `description_string` → `#StickerKit_desc_*` is flavor.

Simplified Chinese is `csgo_schinese.txt`; Traditional is `csgo_tchinese.txt` (`PaintKit_aq_oiled_Tag` = 外殼硬化). JSON includes `name_zht` as extra.

---

## Fade: which weapons *do* have it

English tag exactly `Fade` / 中文 `渐变之色`:

| paint index | internal | weapons |
| ---: | --- | --- |
| 38 | `aa_fade` | `weapon_glock`, `weapon_mac10` |
| 522 | `aa_fade_revolver` | `weapon_revolver` |
| 752 | `aa_fade_mp7` | `weapon_mp7` |
| 879 | `aa_fade_ump` | `weapon_ump45` |
| 1026 | `aa_awp_fade` | `weapon_awp` |
| 1177 | `aa_fade_m4a1s` | `weapon_m4a1_silencer` |
| 10063 | `specialist_fade` | gloves (no `weapon_*` pair) |

Related but **not** the Fade tag: Amber Fade (`aa_fade_metallic`), Acid Fade, Marble Fade (`am_marble_fade`), AK-47 **Crossfade**.

---

## Extract + regenerate catalogs

See [paths.md](paths.md). After dumping into `data/raw/` (gitignored):

```bash
python3 scripts/extract_items_game.py
```

Writes:

| Path | What |
| --- | --- |
| `data/ak47_paint_kits.json` | 61 AK-47 official skins |
| `data/ak47_paint_kits.md` | Same as the table above |
| `data/paint_kits_all.json` | 1481 kits |
| `data/stickers.json` | 11789 sticker/patch kits |
| `data/items_game_summary.json` | counts, Fade lists, prefab chain |
| `apps/web/public/catalog/ak47.html` | static catalog page |

Do not commit `data/raw/` (Valve IP, ~22M text).
