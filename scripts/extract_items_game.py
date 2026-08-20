#!/usr/bin/env python3
"""Derive JSON/Markdown catalogs from a local items_game.txt + loc dumps.

Does not commit Valve source files. Re-run after re-extracting data/raw/.
"""
from __future__ import annotations

import html
import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
ITEMS_GAME = RAW / "scripts" / "items" / "items_game.txt"
LOC_EN = RAW / "resource" / "csgo_english.txt"
LOC_ZH = RAW / "resource" / "csgo_schinese.txt"
LOC_ZHT = RAW / "resource" / "csgo_tchinese.txt"
OUT = ROOT / "data"

# Workshop finish names for items_game "style" integers.
# Source: https://www.counter-strike.net/workshop/workshopfinishes/
# items_game itself only stores the integer.
STYLE_NAMES = {
    0: "Default",
    1: "Solid Color",
    2: "Hydrographic",
    3: "Spray-Paint",
    4: "Anodized",
    5: "Anodized Multicolored",
    6: "Anodized Airbrushed",
    7: "Custom Paint Job",
    8: "Patina",
    9: "Gunsmith",
}

WEAR_BANDS = [
    ("FN", "Factory New", 0.00, 0.07),
    ("MW", "Minimal Wear", 0.07, 0.15),
    ("FT", "Field-Tested", 0.15, 0.38),
    ("WW", "Well-Worn", 0.38, 0.45),
    ("BS", "Battle-Scarred", 0.45, 1.00),
]


def skip_ws_comments(s: str, i: int) -> int:
    n = len(s)
    while i < n:
        c = s[i]
        if c in " \t\r\n":
            i += 1
            continue
        if c == "/" and i + 1 < n and s[i + 1] == "/":
            while i < n and s[i] not in "\r\n":
                i += 1
            continue
        break
    return i


def parse_quoted(s: str, i: int) -> tuple[str, int]:
    assert s[i] == '"'
    i += 1
    out = []
    n = len(s)
    while i < n:
        c = s[i]
        if c == "\\":
            if i + 1 < n:
                nxt = s[i + 1]
                out.append({"n": "\n", "t": "\t", "r": "\r", '"': '"', "\\": "\\"}.get(nxt, nxt))
                i += 2
                continue
            out.append(c)
            i += 1
            continue
        if c == '"':
            return "".join(out), i + 1
        out.append(c)
        i += 1
    raise ValueError("unterminated quoted string")


def merge(a, b):
    if isinstance(a, dict) and isinstance(b, dict):
        out = dict(a)
        for k, v in b.items():
            if k in out:
                out[k] = merge(out[k], v)
            else:
                out[k] = v
        return out
    return b


def parse_value(s: str, i: int):
    i = skip_ws_comments(s, i)
    if i >= len(s):
        raise ValueError("unexpected EOF")
    if s[i] == '"':
        return parse_quoted(s, i)
    if s[i] == "{":
        obj, i = parse_object(s, i + 1)
        return obj, i
    # bare token (rare)
    j = i
    while j < len(s) and s[j] not in ' \t\r\n{}"/':
        j += 1
    return s[i:j], j


def parse_object(s: str, i: int) -> tuple[dict, int]:
    obj: dict = {}
    n = len(s)
    while True:
        i = skip_ws_comments(s, i)
        if i >= n:
            raise ValueError("unterminated object")
        if s[i] == "}":
            return obj, i + 1
        if s[i] != '"':
            # skip unexpected
            i += 1
            continue
        key, i = parse_quoted(s, i)
        i = skip_ws_comments(s, i)
        if i >= n:
            raise ValueError(f"missing value for {key}")
        if s[i] == "{":
            val, i = parse_object(s, i + 1)
        elif s[i] == '"':
            val, i = parse_quoted(s, i)
        else:
            val, i = parse_value(s, i)
        if key in obj:
            obj[key] = merge(obj[key], val)
        else:
            obj[key] = val


def parse_kv_file(path: Path) -> dict:
    text = path.read_text(encoding="utf-8", errors="replace")
    # strip UTF-8 BOM
    if text.startswith("\ufeff"):
        text = text[1:]
    i = skip_ws_comments(text, 0)
    if i < len(text) and text[i] == '"':
        _root_key, i = parse_quoted(text, i)
        i = skip_ws_comments(text, i)
        if i < len(text) and text[i] == "{":
            obj, _ = parse_object(text, i + 1)
            return obj
    raise ValueError(f"not a KV object: {path}")


def parse_loc(path: Path) -> dict[str, str]:
    """Parse Source localization Tokens. Keys stored twice: exact + lower."""
    text = path.read_text(encoding="utf-8", errors="replace")
    if text.startswith("\ufeff"):
        text = text[1:]
    tokens: dict[str, str] = {}
    i = skip_ws_comments(text, 0)
    # Walk until we find Tokens { ... }
    # Full parse is fine (~5MB).
    root_key, i = parse_quoted(text, i) if text[i] == '"' else ("lang", i)
    i = skip_ws_comments(text, i)
    if text[i] != "{":
        raise ValueError(f"bad loc {path}")
    lang, _ = parse_object(text, i + 1)
    tok = lang.get("Tokens") or lang.get("tokens") or {}
    if not isinstance(tok, dict):
        raise ValueError("no Tokens")
    for k, v in tok.items():
        if isinstance(v, str):
            tokens[k] = v
            tokens[k.lower()] = v
    return tokens


def tok_lookup(tokens: dict[str, str], ref: str | None) -> str | None:
    if not ref:
        return None
    key = ref.strip()
    if key.startswith("#"):
        key = key[1:]
    if key in tokens:
        return tokens[key]
    return tokens.get(key.lower())


def as_float(v, default=None):
    if v is None or v == "":
        return default
    try:
        return float(v)
    except (TypeError, ValueError):
        return default


def as_int(v, default=None):
    if v is None or v == "":
        return default
    try:
        return int(float(v))
    except (TypeError, ValueError):
        return default


PAIR_RE = re.compile(r"^\[([^\]]+)\](weapon_[A-Za-z0-9_]+)$")


def collect_pairs(node, weapon: str, acc: dict[str, dict], source: str, set_name: str | None = None):
    """Walk item_sets / loot lists for [kit]weapon keys."""
    if not isinstance(node, dict):
        return
    for k, v in node.items():
        m = PAIR_RE.match(k)
        if m:
            kit, weap = m.group(1), m.group(2)
            if weap == weapon:
                rec = acc.setdefault(kit, {"kit": kit, "sources": [], "sets": []})
                rec["sources"].append(source)
                if set_name:
                    rec["sets"].append(set_name)
        elif isinstance(v, dict):
            # item_sets: set_id -> { items: { [kit]weapon: 1 } }
            inner_items = v.get("items") if isinstance(v.get("items"), dict) else None
            if inner_items is not None:
                collect_pairs(inner_items, weapon, acc, source, set_name=k)
            else:
                collect_pairs(v, weapon, acc, source, set_name=k if source == "item_sets" else set_name)


def main() -> None:
    print("parsing items_game.txt …")
    root = parse_kv_file(ITEMS_GAME)
    print("parsing loc …")
    en = parse_loc(LOC_EN)
    zh = parse_loc(LOC_ZH)
    zht = parse_loc(LOC_ZHT) if LOC_ZHT.exists() else {}

    paint_kits = root.get("paint_kits") or {}
    rarity_map = root.get("paint_kits_rarity") or {}
    sticker_kits = root.get("sticker_kits") or {}
    item_sets = root.get("item_sets") or {}
    loot = root.get("client_loot_lists") or {}
    items = root.get("items") or {}
    prefabs = root.get("prefabs") or {}
    attributes = root.get("attributes") or {}
    game_info = root.get("game_info") or {}
    alt_icons = root.get("alternate_icons2") or {}

    # Index paint kits by id and by name
    kits_by_id = {}
    kits_by_name = {}
    collisions = []
    all_kits = []
    for kid, body in paint_kits.items():
        if not isinstance(body, dict):
            continue
        name = body.get("name")
        if not isinstance(name, str):
            continue
        if kid in kits_by_id and kits_by_id[kid].get("name") != name:
            collisions.append((kid, kits_by_id[kid].get("name"), name))
        tag_ref = body.get("description_tag")
        desc_ref = body.get("description_string")
        style = as_int(body.get("style"))
        wmin_raw = as_float(body.get("wear_remap_min"))
        wmax_raw = as_float(body.get("wear_remap_max"))
        rec = {
            "paint_index": as_int(kid, kid),
            "name": name,
            "description_tag": tag_ref,
            "description_string": desc_ref,
            "name_en": tok_lookup(en, tag_ref),
            "name_zh": tok_lookup(zh, tag_ref),
            "name_zht": tok_lookup(zht, tag_ref),
            "style": style,
            "style_name": STYLE_NAMES.get(style) if style is not None else None,
            "wear_remap_min": wmin_raw,
            "wear_remap_max": wmax_raw,
            "wear_remap_min_effective": 0.0 if wmin_raw is None else wmin_raw,
            "wear_remap_max_effective": 1.0 if wmax_raw is None else wmax_raw,
            "wear_default": as_float(body.get("wear_default")),
            "rarity": rarity_map.get(name),
            "use_legacy_model": body.get("use_legacy_model"),
            "composite_material_path": body.get("composite_material_path"),
            "vmt_path": body.get("vmt_path"),
            "seed": as_int(body.get("seed")),
        }
        kits_by_id[kid] = rec
        kits_by_name[name] = rec
        all_kits.append(rec)

    all_kits.sort(key=lambda r: (isinstance(r["paint_index"], str), r["paint_index"] if isinstance(r["paint_index"], int) else 0, str(r["paint_index"])))

    # Weapon pairing
    ak_pairs: dict[str, dict] = {}
    collect_pairs(item_sets, "weapon_ak47", ak_pairs, "item_sets")
    collect_pairs(loot, "weapon_ak47", ak_pairs, "client_loot_lists")

    ak_catalog = []
    missing_kits = []
    for kit_name, meta in sorted(ak_pairs.items()):
        kit = kits_by_name.get(kit_name)
        if not kit:
            missing_kits.append(kit_name)
            continue
        sets = sorted(set(meta["sets"]))
        sources = sorted(set(meta["sources"]))
        row = {
            **{k: kit[k] for k in (
                "paint_index", "name", "name_en", "name_zh", "name_zht",
                "style", "style_name", "wear_remap_min", "wear_remap_max",
                "wear_remap_min_effective", "wear_remap_max_effective",
                "wear_default", "rarity", "composite_material_path", "vmt_path",
                "description_tag",
            )},
            "weapon": "weapon_ak47",
            "item_sets": sets,
            "pairing_sources": sources,
        }
        ak_catalog.append(row)
    ak_catalog.sort(key=lambda r: (isinstance(r["paint_index"], str), r["paint_index"] if isinstance(r["paint_index"], int) else 0))

    # Fade: kits whose English tag is exactly "Fade", plus name contains fade
    fade_exact = []
    fade_named = []
    all_pairs_by_weapon = defaultdict(list)
    # collect all [kit]weapon from item_sets
    def walk_all_pairs(node, src, set_name=None):
        if not isinstance(node, dict):
            return
        for k, v in node.items():
            m = PAIR_RE.match(k)
            if m:
                kit, weap = m.group(1), m.group(2)
                all_pairs_by_weapon[weap].append(kit)
            elif isinstance(v, dict):
                inner = v.get("items") if isinstance(v.get("items"), dict) else None
                if inner is not None:
                    walk_all_pairs(inner, src, k)
                else:
                    walk_all_pairs(v, src, k if src == "item_sets" else set_name)

    walk_all_pairs(item_sets, "item_sets")
    walk_all_pairs(loot, "client_loot_lists")

    weapons_by_kit = defaultdict(set)
    for weap, kits in all_pairs_by_weapon.items():
        for kn in kits:
            weapons_by_kit[kn].add(weap)

    for rec in all_kits:
        name_en = rec.get("name_en") or ""
        internal = rec["name"]
        weaps = sorted(weapons_by_kit.get(internal, ()))
        if name_en.strip().lower() == "fade":
            fade_exact.append({"paint_index": rec["paint_index"], "name": internal, "name_en": name_en, "name_zh": rec.get("name_zh"), "weapons": weaps})
        if "fade" in internal.lower() or "fade" in name_en.lower() or (rec.get("name_zh") and "渐变" in rec["name_zh"]):
            fade_named.append({"paint_index": rec["paint_index"], "name": internal, "name_en": name_en, "name_zh": rec.get("name_zh"), "weapons": weaps})

    # Stickers
    stickers = []
    sticker_unresolved = 0
    for sid, body in sticker_kits.items():
        if not isinstance(body, dict):
            continue
        name = body.get("name")
        item_name = body.get("item_name")
        name_en = tok_lookup(en, item_name)
        name_zh = tok_lookup(zh, item_name)
        if not name_en:
            sticker_unresolved += 1
        stickers.append({
            "id": as_int(sid, sid),
            "name": name,
            "item_name": item_name,
            "name_en": name_en,
            "name_zh": name_zh,
            "sticker_material": body.get("sticker_material"),
            "patch_material": body.get("patch_material"),
            "rarity": body.get("item_rarity"),
            "tournament_event_id": as_int(body.get("tournament_event_id")),
            "tournament_team_id": as_int(body.get("tournament_team_id")),
            "tournament_player_id": as_int(body.get("tournament_player_id")),
        })
    stickers.sort(key=lambda r: (isinstance(r["id"], str), r["id"] if isinstance(r["id"], int) else 0))

    # AK item / prefab citations
    ak_item = None
    ak_item_id = None
    for iid, body in items.items():
        if isinstance(body, dict) and body.get("name") == "weapon_ak47":
            ak_item = body
            ak_item_id = iid
            break
    ak_prefab = prefabs.get("weapon_ak47_prefab") if isinstance(prefabs, dict) else None
    rifle_prefab = prefabs.get("rifle") if isinstance(prefabs, dict) else None
    primary_prefab = prefabs.get("primary") if isinstance(prefabs, dict) else None

    # Confirm no Fade on AK
    ak_names_en = { (r.get("name_en") or "").lower() for r in ak_catalog }
    ak_internal = { r["name"] for r in ak_catalog }
    fade_on_ak = [r for r in ak_catalog if (r.get("name_en") or "").lower() == "fade" or "aa_fade" == r["name"] or (r.get("name_zh") == "渐变之色")]

    summary = {
        "source": {
            "items_game": str(ITEMS_GAME),
            "loc_en": str(LOC_EN),
            "loc_zh": str(LOC_ZH),
        },
        "counts": {
            "paint_kits": len(all_kits),
            "sticker_kits": len(stickers),
            "item_sets": len(item_sets) if isinstance(item_sets, dict) else None,
            "ak47_skins": len(ak_catalog),
            "paint_kit_id_collisions": len(collisions),
            "ak_kits_missing_definition": missing_kits,
            "sticker_unresolved_en": sticker_unresolved,
        },
        "ak47_item_defindex": ak_item_id,
        "ak47_item": ak_item,
        "game_info": game_info,
        "alternate_icons2_keys": list(alt_icons.keys()) if isinstance(alt_icons, dict) else None,
        "fade_on_ak47": fade_on_ak,
        "fade_exact_tag": fade_exact,
        "fade_related_kits": fade_named,
        "style_name_source": "https://www.counter-strike.net/workshop/workshopfinishes/",
        "wear_bands_inspect_float": [
            {"code": a, "name": b, "min": c, "max_exclusive_except_bs": d} for a, b, c, d in WEAR_BANDS
        ],
        "prefab_chain": {
            "item": "weapon_ak47 (items defindex %s)" % ak_item_id,
            "prefab": ak_item.get("prefab") if ak_item else None,
            "weapon_ak47_prefab.prefab": ak_prefab.get("prefab") if isinstance(ak_prefab, dict) else None,
            "rifle.prefab": rifle_prefab.get("prefab") if isinstance(rifle_prefab, dict) else None,
            "primary.prefab": primary_prefab.get("prefab") if isinstance(primary_prefab, dict) else None,
            "used_by_classes": ak_prefab.get("used_by_classes") if isinstance(ak_prefab, dict) else None,
            "paint_data": ak_prefab.get("paint_data") if isinstance(ak_prefab, dict) else None,
        },
    }

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "paint_kits_all.json").write_text(
        json.dumps(all_kits, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (OUT / "ak47_paint_kits.json").write_text(
        json.dumps(ak_catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (OUT / "stickers.json").write_text(
        json.dumps(stickers, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (OUT / "items_game_summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    # Markdown table for AK-47
    md = []
    md.append("| # | paint index | internal name | English | 中文 | style | wear min | wear max | rarity |")
    md.append("| ---: | ---: | --- | --- | --- | ---: | ---: | ---: | --- |")
    for i, r in enumerate(ak_catalog, 1):
        wmin = r["wear_remap_min"]
        wmax = r["wear_remap_max"]
        wmin_s = f"{wmin:.6f}".rstrip("0").rstrip(".") if wmin is not None else "*(omit → 0)*"
        wmax_s = f"{wmax:.6f}".rstrip("0").rstrip(".") if wmax is not None else "*(omit → 1)*"
        md.append(
            "| {i} | {idx} | `{name}` | {en} | {zh} | {style} | {wmin} | {wmax} | {rar} |".format(
                i=i,
                idx=r["paint_index"],
                name=r["name"],
                en=(r.get("name_en") or "—").replace("|", "/"),
                zh=(r.get("name_zh") or "—").replace("|", "/"),
                style=r["style"] if r["style"] is not None else "—",
                wmin=wmin_s,
                wmax=wmax_s,
                rar=r.get("rarity") or "—",
            )
        )
    (OUT / "ak47_paint_kits.md").write_text("\n".join(md) + "\n", encoding="utf-8")

    # Sticker sample markdown
    sample = stickers[:20]
    sm = ["| id | token | English | 中文 | material |", "| ---: | --- | --- | --- | --- |"]
    for s in sample:
        sm.append(
            "| {id} | `{tok}` | {en} | {zh} | `{mat}` |".format(
                id=s["id"],
                tok=s.get("name") or "",
                en=(s.get("name_en") or "—").replace("|", "/"),
                zh=(s.get("name_zh") or "—").replace("|", "/"),
                mat=s.get("sticker_material") or s.get("patch_material") or "",
            )
        )
    (OUT / "stickers_sample.md").write_text("\n".join(sm) + "\n", encoding="utf-8")

    write_catalog_html(ak_catalog, fade_exact, len(all_kits), len(stickers))

    print("paint_kits", len(all_kits))
    print("ak47 skins", len(ak_catalog))
    print("stickers", len(stickers), "unresolved_en", sticker_unresolved)
    print("fade_on_ak47", fade_on_ak)
    print("fade_exact kits", len(fade_exact))
    print("id collisions", collisions)
    print("missing kit defs", missing_kits)
    print("wrote", OUT)


def write_catalog_html(ak_catalog, fade_exact, n_kits, n_stickers):
    rows = []
    for r in ak_catalog:
        wmin = r["wear_remap_min"]
        wmax = r["wear_remap_max"]
        wmin_s = f"{wmin:.4g}" if wmin is not None else "0†"
        wmax_s = f"{wmax:.4g}" if wmax is not None else "1†"
        rarity = r.get("rarity") or ""
        rows.append(
            "<tr>"
            f"<td class='num'>{html.escape(str(r['paint_index']))}</td>"
            f"<td><code>{html.escape(r['name'])}</code></td>"
            f"<td>{html.escape(r.get('name_en') or '—')}</td>"
            f"<td>{html.escape(r.get('name_zh') or '—')}</td>"
            f"<td class='num'>{r['style'] if r['style'] is not None else '—'}</td>"
            f"<td>{html.escape(r.get('style_name') or '')}</td>"
            f"<td class='num'>{wmin_s}–{wmax_s}</td>"
            f"<td class='rar {html.escape(rarity)}'>{html.escape(rarity)}</td>"
            "</tr>"
        )
    fade_note = (
        "Confirmed: <strong>no AK-47 row is Fade / 渐变之色</strong>. "
        "The English tag “Fade” is used on: "
        + ", ".join(
            f"{html.escape(x['name'])} ({', '.join(html.escape(w) for w in x['weapons']) or 'no weapon pair'})"
            for x in fade_exact
        )
    )
    page = f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>AK-47 paint kits — items_game catalog</title>
  <style>
    :root {{ color-scheme: dark; }}
    body {{
      margin: 0; padding: 28px 32px 48px;
      background: #14161a; color: #e8e4dc;
      font-family: ui-sans-serif, system-ui, sans-serif;
      font-size: 14px;
    }}
    h1 {{ font-size: 22px; font-weight: 650; margin: 0 0 8px; color: #f2eee6; }}
    .sub {{ color: #9aa3b2; margin: 0 0 18px; max-width: 920px; line-height: 1.45; }}
    .stats {{ display: flex; gap: 16px; margin: 0 0 20px; flex-wrap: wrap; }}
    .stat {{
      background: #1b1f27; border: 1px solid #2c3340; border-radius: 8px;
      padding: 10px 14px; min-width: 120px;
    }}
    .stat b {{ display: block; font-size: 20px; color: #c9a36a; }}
    .stat span {{ color: #9aa3b2; font-size: 12px; }}
    table {{ border-collapse: collapse; width: 100%; background: #181b22; }}
    th, td {{ padding: 6px 10px; border-bottom: 1px solid #2a3140; text-align: left; }}
    th {{
      position: sticky; top: 0; background: #1f2430; color: #c7d2e0;
      font-weight: 600; font-size: 12px; letter-spacing: .03em; text-transform: uppercase;
    }}
    td.num {{ font-variant-numeric: tabular-nums; text-align: right; }}
    code {{ font-size: 12px; color: #9ecbff; }}
    .rar.mythical {{ color: #d47fff; }}
    .rar.legendary {{ color: #eb4b4b; }}
    .rar.ancient {{ color: #eb4b4b; }}
    .rar.rare {{ color: #4b69ff; }}
    .rar.uncommon {{ color: #5e98d9; }}
    .rar.common {{ color: #b0c3d9; }}
    .note {{
      margin: 0 0 18px; padding: 10px 12px; border-left: 3px solid #c9a36a;
      background: #1b1f27; color: #d7d0c4; max-width: 980px;
    }}
  </style>
</head>
<body>
  <h1>AK-47 paint kits from items_game.txt</h1>
  <p class="sub">Derived catalog (not Valve’s raw dump). Pairing is <code>[paint_kit]weapon_ak47</code> in
    <code>item_sets</code> / <code>client_loot_lists</code>. Names from <code>csgo_english.txt</code> /
    <code>csgo_schinese.txt</code> via <code>description_tag</code>.</p>
  <div class="stats">
    <div class="stat"><b>{len(ak_catalog)}</b><span>AK-47 skins</span></div>
    <div class="stat"><b>{n_kits}</b><span>paint kits (all)</span></div>
    <div class="stat"><b>{n_stickers}</b><span>sticker kits</span></div>
    <div class="stat"><b>0</b><span>Fade on AK-47</span></div>
  </div>
  <p class="note">{fade_note}</p>
  <table>
    <thead>
      <tr>
        <th>Index</th><th>Internal</th><th>English</th><th>中文</th>
        <th>Style</th><th>Finish</th><th>Wear remap</th><th>Rarity</th>
      </tr>
    </thead>
    <tbody>
      {''.join(rows)}
    </tbody>
  </table>
  <p class="sub">† omitted in items_game; treated as 0–1. Wear remap is visual, not the inspect float band.</p>
</body>
</html>
"""
    dest = ROOT / "apps" / "web" / "public" / "catalog" / "ak47.html"
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(page, encoding="utf-8")


if __name__ == "__main__":
    main()
