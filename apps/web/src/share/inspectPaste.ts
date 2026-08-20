/**
 * M13 inspect paste: !gen, our share query, steam:// S/A/D/M, market text.
 *
 * Apply kit/seed/float only when the paste itself contains those values
 * (!gen / our query / market Pattern+Float / a hex CEconItemPreviewDataBlock
 * that actually decodes). S/A/D/M are GC *request* pointers — not paint data.
 *
 * !gen grammar (community, widely documented):
 *   !gen <defindex> <paintkit> <seed> <float> [s0_id s0_wear ... s4_id s4_wear]
 *   https://www.steamanalyst.com/gencode
 *   https://github.com/helyux/cs2inspect
 *
 * Steam inspect URL:
 *   steam://rungame/730/.../+csgo_econ_action_preview%20S...A...D...
 *   steam://rungame/730/.../+csgo_econ_action_preview%20M...A...D...
 *
 * D is param_d on CMsgGCCStrike15_v2_Client2GCEconPreviewDataBlockRequest
 * (uint64). paintindex / paintseed / paintwear live on the *response*
 * CEconItemPreviewDataBlock. Resolving D needs a Game Coordinator call,
 * which this local-dev previewer does not make.
 *   https://github.com/SteamDatabase/Protobufs/blob/master/csgo/cstrike15_gcmessages.proto
 *
 * Masked hex inspect (payload is hex, not S/A/D/M): we decode
 * CEconItemPreviewDataBlock with the cited field numbers only
 * (defindex=3, paintindex=4, paintwear=7, paintseed=8, stickers=12,
 * customname=11, killeatervalue=10). paintwear is uint32 IEEE-754 bits
 * (same proto + community inspect docs). No XOR “mask” is invented —
 * if the bytes are not a readable proto, we do not apply.
 */
import {
  isOfficialKitQueryOn,
  officialCatalogFor,
  resolveOfficialKitOn,
  type OfficialKit,
} from "../kits/catalog";
import { clampSeed } from "../seed/seedToPatternUv";
import {
  MAX_STICKER_LAYERS,
  emptySlots,
  type StickerSlot,
} from "../stickers/slots";
import { resolveDefindex } from "./defindex";
import {
  parseShareQuery,
  type ParsedShareQuery,
} from "./query";
import {
  WEAPON_AK47,
  WEAPON_GLOCK,
  type ViewerWeapon,
} from "./weapons";

export type SteamInspectTokens = {
  S?: string;
  A?: string;
  D?: string;
  M?: string;
};

export type InspectPasteKind =
  | "share"
  | "gen"
  | "steam-pointer"
  | "steam-hex"
  | "market"
  | "invalid";

export type InspectPasteResult = {
  kind: InspectPasteKind;
  applied: boolean;
  status: string;
  rejected: string[];
  tokens?: SteamInspectTokens;
  share?: ParsedShareQuery;
  /** True only when a hex CEconItemPreviewDataBlock actually decoded. */
  hexDecoded?: boolean;
};

const GEN_RE =
  /(?:^|[^\w!])!?(?:gen)\s+(\d+)\s+(\d+)\s+(\d+)\s+([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)((?:\s+\d+(?:\s+[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)?)*)/i;

const STEAM_PREVIEW_RE = /csgo_econ_action_preview(?:%20|\s+)?([^\s]*)/i;

function safeDecodeURI(raw: string): string {
  try {
    return decodeURIComponent(raw.replace(/\+/g, " "));
  } catch {
    return raw;
  }
}

function invalid(status: string, extra?: Partial<InspectPasteResult>): InspectPasteResult {
  return {
    kind: "invalid",
    applied: false,
    status,
    rejected: extra?.rejected ?? [],
    tokens: extra?.tokens,
    share: extra?.share,
  };
}

export function extractSteamTokens(raw: string): SteamInspectTokens | undefined {
  const decoded = safeDecodeURI(raw);
  const m = STEAM_PREVIEW_RE.exec(decoded);
  const payload = m ? safeDecodeURI(m[1] ?? "") : decoded;
  // Inventory / market inspects concatenate S/A/D or M/A/D with no separators.
  const src = payload.replace(/%20/gi, " ").replace(/\s+/g, "");
  const tokens: SteamInspectTokens = {};
  const s = /S(\d+)/i.exec(src);
  const mk = /M(\d+)/i.exec(src);
  const a = /A(\d+)/i.exec(src);
  const d = /D(\d+)/i.exec(src);
  if (s) tokens.S = s[1];
  if (mk) tokens.M = mk[1];
  if (a) tokens.A = a[1];
  if (d) tokens.D = d[1];
  // Require the documented inventory (S) or market (M) prefix so random hex
  // letters are not reported as pointers.
  if (!tokens.S && !tokens.M) return undefined;
  return tokens;
}

function extractHexPayload(raw: string): string | undefined {
  const decoded = safeDecodeURI(raw);
  const m = STEAM_PREVIEW_RE.exec(decoded);
  const payload = (m ? safeDecodeURI(m[1] ?? "") : decoded).replace(/[\s`"'<>]/g, "");
  if (!payload) return undefined;
  if (/[SMAD]\d/i.test(payload)) return undefined;
  const hex = payload.replace(/^0x/i, "");
  if (hex.length < 16 || hex.length % 2 !== 0) return undefined;
  if (!/^[0-9a-fA-F]+$/.test(hex)) return undefined;
  return hex;
}

function float32FromUint32Bits(bits: number): number {
  const buf = new ArrayBuffer(4);
  const view = new DataView(buf);
  view.setUint32(0, bits >>> 0, true);
  return view.getFloat32(0, true);
}

export function uint32BitsFromFloat32(value: number): number {
  const buf = new ArrayBuffer(4);
  const view = new DataView(buf);
  view.setFloat32(0, value, true);
  return view.getUint32(0, true);
}

function readVarint(bytes: Uint8Array, offset: number): { value: number; next: number } | null {
  let result = 0;
  let shift = 0;
  let i = offset;
  while (i < bytes.length && shift <= 56) {
    const b = bytes[i];
    i += 1;
    result += (b & 0x7f) * 2 ** shift;
    if ((b & 0x80) === 0) {
      return { value: result, next: i };
    }
    shift += 7;
  }
  return null;
}

function skipProtoField(bytes: Uint8Array, offset: number, wire: number): number | null {
  if (wire === 0) {
    const v = readVarint(bytes, offset);
    return v ? v.next : null;
  }
  if (wire === 1) return offset + 8 <= bytes.length ? offset + 8 : null;
  if (wire === 5) return offset + 4 <= bytes.length ? offset + 4 : null;
  if (wire === 2) {
    const v = readVarint(bytes, offset);
    if (!v) return null;
    const end = v.next + v.value;
    return end <= bytes.length ? end : null;
  }
  return null;
}

type PreviewSticker = { slot: number; id: number; wear: number };

type DecodedPreview = {
  defindex?: number;
  paintindex?: number;
  paintseed?: number;
  paintwear?: number;
  nametag?: string;
  kills?: number;
  stickers: PreviewSticker[];
};

/**
 * Minimal CEconItemPreviewDataBlock reader.
 * Field numbers from SteamDatabase cstrike15_gcmessages.proto
 * (CEconItemPreviewDataBlock): 3 defindex, 4 paintindex, 7 paintwear,
 * 8 paintseed, 10 killeatervalue, 11 customname, 12 stickers.
 * Sticker: 1 slot, 2 sticker_id, 3 wear.
 */
function decodePreviewBlock(bytes: Uint8Array): DecodedPreview | null {
  const out: DecodedPreview = { stickers: [] };
  let i = 0;
  let saw = false;
  while (i < bytes.length) {
    const key = readVarint(bytes, i);
    if (!key) break;
    const field = Math.floor(key.value / 8);
    const wire = key.value % 8;
    i = key.next;
    if (wire === 0) {
      const v = readVarint(bytes, i);
      if (!v) return null;
      i = v.next;
      if (field === 3) {
        out.defindex = v.value;
        saw = true;
      } else if (field === 4) {
        out.paintindex = v.value;
        saw = true;
      } else if (field === 7) {
        const asFloat = float32FromUint32Bits(v.value >>> 0);
        if (Number.isFinite(asFloat) && asFloat >= 0 && asFloat <= 1) {
          out.paintwear = asFloat;
          saw = true;
        }
      } else if (field === 8) {
        out.paintseed = v.value;
        saw = true;
      } else if (field === 10) {
        out.kills = v.value;
      }
    } else if (wire === 2) {
      const len = readVarint(bytes, i);
      if (!len) return null;
      const start = len.next;
      const end = start + len.value;
      if (end > bytes.length) return null;
      const slice = bytes.subarray(start, end);
      i = end;
      if (field === 11) {
        out.nametag = new TextDecoder().decode(slice);
      } else if (field === 12) {
        const st = decodeSticker(slice);
        if (st) out.stickers.push(st);
      }
    } else {
      const next = skipProtoField(bytes, i, wire);
      if (next == null) return null;
      i = next;
    }
  }
  return saw ? out : null;
}

function decodeSticker(bytes: Uint8Array): PreviewSticker | null {
  let i = 0;
  let slot = 0;
  let id = 0;
  let wear = 0;
  while (i < bytes.length) {
    const key = readVarint(bytes, i);
    if (!key) break;
    const field = Math.floor(key.value / 8);
    const wire = key.value % 8;
    i = key.next;
    if (wire === 0) {
      const v = readVarint(bytes, i);
      if (!v) return null;
      i = v.next;
      if (field === 1) slot = v.value;
      if (field === 2) id = v.value;
    } else if (wire === 5) {
      if (i + 4 > bytes.length) return null;
      const view = new DataView(bytes.buffer, bytes.byteOffset + i, 4);
      const f = view.getFloat32(0, true);
      i += 4;
      if (field === 3 && Number.isFinite(f)) wear = f;
    } else {
      const next = skipProtoField(bytes, i, wire);
      if (next == null) return null;
      i = next;
    }
  }
  if (id <= 0) return null;
  return { slot, id, wear };
}

function hexToBytes(hex: string): Uint8Array | null {
  try {
    const out = new Uint8Array(hex.length / 2);
    for (let i = 0; i < out.length; i++) {
      out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    return out;
  } catch {
    return null;
  }
}

/**
 * Try raw proto, proto without trailing 4-byte CRC, and a leading 0x00
 * prefix (common on generated inspect hex). Do not XOR.
 */
export function decodeInspectHex(hex: string): DecodedPreview | null {
  const bytes = hexToBytes(hex);
  if (!bytes) return null;
  const candidates: Uint8Array[] = [bytes];
  if (bytes.length > 4) candidates.push(bytes.subarray(0, bytes.length - 4));
  if (bytes.length > 1 && bytes[0] === 0) {
    candidates.push(bytes.subarray(1));
    if (bytes.length > 5) candidates.push(bytes.subarray(1, bytes.length - 4));
  }
  for (const buf of candidates) {
    const decoded = decodePreviewBlock(buf);
    if (
      decoded &&
      decoded.defindex != null &&
      decoded.paintindex != null &&
      decoded.paintseed != null &&
      decoded.paintwear != null
    ) {
      return decoded;
    }
  }
  return null;
}

function encodeVarint(n: number): number[] {
  const out: number[] = [];
  let x = n;
  if (x < 0 || !Number.isFinite(x)) x = 0;
  x = Math.floor(x);
  if (x === 0) return [0];
  while (x > 0x7f) {
    out.push((x & 0x7f) | 0x80);
    x = Math.floor(x / 128);
  }
  out.push(x);
  return out;
}

/** Test helper: encode a tiny CEconItemPreviewDataBlock (cited field numbers). */
export function encodePreviewBlockHex(fields: {
  defindex: number;
  paintindex: number;
  paintseed: number;
  paintwear: number;
}): string {
  const bytes: number[] = [];
  const push = (field: number, value: number): void => {
    bytes.push(...encodeVarint((field << 3) | 0));
    bytes.push(...encodeVarint(value));
  };
  push(3, fields.defindex);
  push(4, fields.paintindex);
  push(7, uint32BitsFromFloat32(fields.paintwear));
  push(8, fields.paintseed);
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function slotsFromPairs(nums: number[]): { slots: StickerSlot[]; rejected: string[] } {
  const slots = emptySlots();
  const rejected: string[] = [];
  const pairs = Math.floor(nums.length / 2);
  for (let i = 0; i < pairs; i++) {
    const id = Math.max(0, Math.floor(nums[i * 2] ?? 0));
    const wear = nums[i * 2 + 1] ?? 0;
    if (i >= MAX_STICKER_LAYERS) {
      if (id > 0) rejected.push(`s${i}`);
      continue;
    }
    slots[i] = {
      id,
      offsetX: 0,
      offsetY: 0,
      rotationDeg: 0,
      wear: Number.isFinite(wear) ? Math.min(1, Math.max(0, wear)) : 0,
    };
  }
  return { slots, rejected };
}

function shareFromParts(
  weapon: ViewerWeapon,
  kitQuery: string,
  seed: number,
  floatAmt: number,
  slots?: StickerSlot[],
  extra?: { nametag?: string; kills?: number },
): { share: ParsedShareQuery; rejected: string[] } | { rejected: string[]; status: string } {
  if (!isOfficialKitQueryOn(weapon, kitQuery)) {
    const fadeOnAk = weapon === WEAPON_AK47 && (kitQuery === "38" || kitQuery.toLowerCase() === "fade");
    return {
      rejected: ["kit"],
      status: fadeOnAk
        ? "rejected — Fade is not on AK-47"
        : "rejected — kit is not official for this weapon",
    };
  }
  const params = new URLSearchParams();
  params.set("weapon", weapon);
  params.set("kit", kitQuery);
  params.set("seed", String(clampSeed(seed)));
  params.set("float", String(floatAmt));
  if (slots) {
    for (let i = 0; i < MAX_STICKER_LAYERS; i++) {
      const s = slots[i];
      if (s && s.id > 0) params.set(`s${i}`, `${s.id},0,0,0,${s.wear}`);
    }
  }
  if (extra?.nametag) params.set("name", extra.nametag);
  if (extra?.kills && extra.kills > 0) params.set("st", String(extra.kills));
  const share = parseShareQuery(params);
  return { share, rejected: share.rejected };
}

function parseGen(text: string): InspectPasteResult | null {
  const m = GEN_RE.exec(text);
  if (!m) return null;
  const defindex = Number(m[1]);
  const paintkit = Number(m[2]);
  const seed = Number(m[3]);
  const floatAmt = Number(m[4]);
  const rest = (m[5] ?? "").trim();
  const extraNums = rest.length
    ? rest.split(/\s+/).map((t) => Number(t)).filter((n) => Number.isFinite(n))
    : [];

  const weapon = resolveDefindex(defindex);
  if (!weapon) {
    return {
      kind: "gen",
      applied: false,
      status: "rejected — unknown defindex (need AK-47=7 or Glock-18=4)",
      rejected: ["defindex"],
    };
  }
  if (!Number.isFinite(paintkit) || !Number.isFinite(seed) || !Number.isFinite(floatAmt)) {
    return {
      kind: "gen",
      applied: false,
      status: "invalid paste",
      rejected: ["gen"],
    };
  }
  const stickers = slotsFromPairs(extraNums);
  const built = shareFromParts(weapon, String(Math.floor(paintkit)), seed, floatAmt, stickers.slots);
  if ("status" in built) {
    return {
      kind: "gen",
      applied: false,
      status: built.status,
      rejected: built.rejected,
    };
  }
  return {
    kind: "gen",
    applied: true,
    status: `applied !gen — ${weapon} kit ${built.share.official.paint_index} seed ${built.share.seed} float ${built.share.float}`,
    rejected: [...built.rejected, ...stickers.rejected],
    share: built.share,
  };
}

function parseSharePaste(text: string): InspectPasteResult | null {
  const line = text.trim();
  let params: URLSearchParams | null = null;
  const urlMatch = line.match(/https?:\/\/[^\s]+/i);
  if (urlMatch) {
    try {
      const u = new URL(urlMatch[0]);
      if ([...u.searchParams.keys()].some((k) => /^(weapon|kit|seed|float|s\d)$/i.test(k))) {
        params = u.searchParams;
      }
    } catch {
      params = null;
    }
  }
  if (!params) {
    const qIndex = line.indexOf("?");
    const raw = qIndex >= 0 ? line.slice(qIndex + 1).split(/\s/)[0] : line.split(/\s/)[0];
    if (/(?:^|&)(?:weapon|kit|seed|float)=/i.test(raw)) {
      params = new URLSearchParams(raw.replace(/^\?/, ""));
    }
  }
  if (!params) return null;
  const share = parseShareQuery(params);
  const kitRejected = share.rejected.includes("kit");
  if (kitRejected && params.get("kit")) {
    return {
      kind: "share",
      applied: false,
      status:
        params.get("kit") === "38" || (params.get("kit") ?? "").toLowerCase() === "fade"
          ? "rejected — Fade is not on AK-47"
          : "rejected — kit is not official for this weapon",
      rejected: share.rejected,
      share,
    };
  }
  return {
    kind: "share",
    applied: true,
    status: `applied share URL — ${share.weapon} kit ${share.official.paint_index}`,
    rejected: share.rejected,
    share,
  };
}

function catalogMatch(weapon: ViewerWeapon, text: string): OfficialKit | undefined {
  const catalog = officialCatalogFor(weapon);
  const lower = text.toLowerCase();
  let best: OfficialKit | undefined;
  for (const kit of catalog) {
    const names = [kit.name_en, kit.name_zh, kit.name_zht ?? "", kit.name].filter((n) => n.length > 1);
    for (const name of names) {
      if (lower.includes(name.toLowerCase())) {
        if (!best || name.length > (best.name_en.length ?? 0)) best = kit;
      }
    }
  }
  return best;
}

function parseMarketText(text: string): InspectPasteResult | null {
  const pattern =
    /(?:pattern(?:\s*template)?|seed|paint\s*seed)\s*[:=]\s*(\d{1,4})\b/i.exec(text);
  const floatM = /(?:float(?:\s*value)?|wear)\s*[:=]\s*([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)/i.exec(
    text,
  );
  if (!pattern && !floatM) return null;

  let weapon: ViewerWeapon | undefined;
  if (/\bAK[- ]?47\b/i.test(text) || /\bweapon_ak47\b/i.test(text)) weapon = WEAPON_AK47;
  else if (/\bGlock(?:[- ]?18)?\b/i.test(text) || /\bweapon_glock\b/i.test(text)) weapon = WEAPON_GLOCK;

  const pipe = /\|\s*([^(\n\r|/]+)/.exec(text);
  const kitHint = pipe ? pipe[1].trim() : "";

  let official: OfficialKit | undefined;
  if (weapon) {
    official =
      (kitHint && resolveOfficialKitOn(weapon, kitHint)) || catalogMatch(weapon, text);
  } else {
    const ak = (kitHint && resolveOfficialKitOn(WEAPON_AK47, kitHint)) || catalogMatch(WEAPON_AK47, text);
    const gl = (kitHint && resolveOfficialKitOn(WEAPON_GLOCK, kitHint)) || catalogMatch(WEAPON_GLOCK, text);
    if (ak && !gl) {
      weapon = WEAPON_AK47;
      official = ak;
    } else if (gl && !ak) {
      weapon = WEAPON_GLOCK;
      official = gl;
    } else if (ak && gl) {
      return {
        kind: "market",
        applied: false,
        status: "need !gen — weapon is ambiguous",
        rejected: ["weapon"],
      };
    }
  }

  if (!weapon || !official || !pattern || !floatM) {
    if (weapon && kitHint && !official && /fade/i.test(kitHint) && weapon === WEAPON_AK47) {
      return {
        kind: "market",
        applied: false,
        status: "rejected — Fade is not on AK-47",
        rejected: ["kit"],
      };
    }
    return {
      kind: "market",
      applied: false,
      status: "need !gen — inspect text is missing kit/seed/float",
      rejected: [],
    };
  }

  const seed = Number(pattern[1]);
  const floatAmt = Number(floatM[1]);
  const built = shareFromParts(weapon, String(official.paint_index), seed, floatAmt);
  if ("status" in built) {
    return { kind: "market", applied: false, status: built.status, rejected: built.rejected };
  }
  return {
    kind: "market",
    applied: true,
    status: `applied inspect text — ${weapon} kit ${built.share.official.paint_index} seed ${built.share.seed}`,
    rejected: built.rejected,
    share: built.share,
  };
}

function parseHexInspect(text: string): InspectPasteResult | null {
  const hex = extractHexPayload(text);
  if (!hex) return null;
  const decoded = decodeInspectHex(hex);
  if (!decoded || decoded.defindex == null || decoded.paintindex == null) {
    return {
      kind: "steam-hex",
      applied: false,
      hexDecoded: false,
      status: "need !gen — inspect hex did not decode to paint data",
      rejected: [],
    };
  }
  const weapon = resolveDefindex(decoded.defindex);
  if (!weapon) {
    return {
      kind: "steam-hex",
      applied: false,
      hexDecoded: true,
      status: "rejected — unknown defindex (need AK-47=7 or Glock-18=4)",
      rejected: ["defindex"],
    };
  }
  const slots = emptySlots();
  for (const st of decoded.stickers) {
    if (st.slot >= MAX_STICKER_LAYERS) continue;
    slots[st.slot] = {
      id: st.id,
      offsetX: 0,
      offsetY: 0,
      rotationDeg: 0,
      wear: st.wear,
    };
  }
  const built = shareFromParts(
    weapon,
    String(decoded.paintindex),
    decoded.paintseed ?? 0,
    decoded.paintwear ?? 0,
    slots,
    { nametag: decoded.nametag, kills: decoded.kills },
  );
  if ("status" in built) {
    return {
      kind: "steam-hex",
      applied: false,
      hexDecoded: true,
      status: built.status,
      rejected: built.rejected,
    };
  }
  return {
    kind: "steam-hex",
    applied: true,
    hexDecoded: true,
    status: `applied inspect proto — ${weapon} kit ${built.share.official.paint_index}`,
    rejected: built.rejected,
    share: built.share,
  };
}

/**
 * Parse a HUD paste. Apply only when kit/seed/float are present in the
 * paste (!gen / our query / market text / decoded hex proto).
 * S/A/D/M-only pastes are structured but not applied.
 */
export function parseInspectPaste(raw: string): InspectPasteResult {
  const text = (raw ?? "").trim();
  if (!text) return invalid("invalid paste");

  const tokens = extractSteamTokens(text);
  const gen = parseGen(text);
  if (gen) {
    if (tokens) gen.tokens = tokens;
    return gen;
  }

  const share = parseSharePaste(text);
  if (share) {
    if (tokens) share.tokens = tokens;
    return share;
  }

  const market = parseMarketText(text);
  if (market) {
    if (tokens) market.tokens = tokens;
    return market;
  }

  const hex = parseHexInspect(text);
  if (hex && hex.applied) {
    if (tokens) hex.tokens = tokens;
    return hex;
  }

  if (tokens) {
    const bits = [
      tokens.S != null ? `S=${tokens.S}` : null,
      tokens.A != null ? `A=${tokens.A}` : null,
      tokens.D != null ? `D=${tokens.D}` : null,
      tokens.M != null ? `M=${tokens.M}` : null,
    ].filter((x): x is string => x != null);
    return {
      kind: "steam-pointer",
      applied: false,
      status: `need !gen — S/A/D/M are GC pointers, not paint data (${bits.join(" ")})`,
      rejected: [],
      tokens,
      hexDecoded: false,
    };
  }

  if (hex) return hex;

  return invalid("invalid paste");
}

