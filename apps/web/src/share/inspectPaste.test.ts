import { describe, expect, it } from "vitest";
import { DEFINDEX_AK47, DEFINDEX_GLOCK, resolveDefindex } from "./defindex";
import {
  decodeInspectHex,
  encodePreviewBlockHex,
  extractSteamTokens,
  parseInspectPaste,
} from "./inspectPaste";
import { parseShareQuery, sameInspect, shareStateFromParsed } from "./query";

describe("defindex map (items_game)", () => {
  it("maps 7 → ak47 and 4 → glock", () => {
    expect(DEFINDEX_AK47).toBe(7);
    expect(DEFINDEX_GLOCK).toBe(4);
    expect(resolveDefindex(7)).toBe("ak47");
    expect(resolveDefindex(4)).toBe("glock");
    expect(resolveDefindex(9)).toBeUndefined();
  });
});

describe("!gen paste", () => {
  it("applies jaymie CH !gen 7 44 923 0.0558851957321166", () => {
    const r = parseInspectPaste("!gen 7 44 923 0.0558851957321166");
    expect(r.kind).toBe("gen");
    expect(r.applied).toBe(true);
    expect(r.share?.weapon).toBe("ak47");
    expect(r.share?.official.paint_index).toBe(44);
    expect(r.share?.official.name_en).toBe("Case Hardened");
    expect(r.share?.seed).toBe(923);
    expect(r.share?.float).toBeCloseTo(0.0558851957321166, 8);
    expect(r.rejected).not.toContain("kit");
  });

  it("applies Glock Fade !gen 4 38 with a legal FN float", () => {
    const r = parseInspectPaste("!gen 4 38 661 0.01");
    expect(r.applied).toBe(true);
    expect(r.share?.weapon).toBe("glock");
    expect(r.share?.official.paint_index).toBe(38);
    expect(r.share?.official.name_en).toBe("Fade");
    expect(r.share?.seed).toBe(661);
    expect(r.share?.float).toBeCloseTo(0.01, 8);
    expect(r.share?.float).toBeLessThanOrEqual(0.08);
  });

  it("rejects Fade on AK !gen 7 38", () => {
    const r = parseInspectPaste("!gen 7 38 1 0.01");
    expect(r.applied).toBe(false);
    expect(r.rejected).toContain("kit");
    expect(r.status.toLowerCase()).toMatch(/fade/);
  });

  it("accepts gen without bang and extra sticker pairs (s4 rejected)", () => {
    const r = parseInspectPaste("gen 7 44 923 0.0558851957321166 259 0.2 0 0 0 0 0 0 14 0.1");
    expect(r.applied).toBe(true);
    expect(r.share?.slots[0].id).toBe(259);
    expect(r.rejected).toContain("s4");
  });
});

describe("steam:// S/A/D/M", () => {
  const inventory =
    "steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20S76561198000000000A123456789D987654321";
  const market =
    "steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20M1942613263253050157A3765766699D16926734116702966411";

  it("extracts S/A/D and does not invent kit/seed/float", () => {
    const tokens = extractSteamTokens(inventory);
    expect(tokens?.S).toBe("76561198000000000");
    expect(tokens?.A).toBe("123456789");
    expect(tokens?.D).toBe("987654321");
    const r = parseInspectPaste(inventory);
    expect(r.kind).toBe("steam-pointer");
    expect(r.applied).toBe(false);
    expect(r.share).toBeUndefined();
    expect(r.tokens?.S).toBe("76561198000000000");
    expect(r.tokens?.D).toBe("987654321");
    expect(r.status).toMatch(/need !gen/i);
  });

  it("extracts M/A/D market inspect", () => {
    const r = parseInspectPaste(market);
    expect(r.applied).toBe(false);
    expect(r.tokens?.M).toBe("1942613263253050157");
    expect(r.tokens?.A).toBe("3765766699");
    expect(r.tokens?.D).toBe("16926734116702966411");
  });

  it("applies !gen when the paste also contains a steam:// pointer", () => {
    const r = parseInspectPaste(`${inventory}\n!gen 7 44 923 0.0558851957321166`);
    expect(r.applied).toBe(true);
    expect(r.kind).toBe("gen");
    expect(r.share?.official.paint_index).toBe(44);
    expect(r.tokens?.S).toBe("76561198000000000");
  });
});

describe("garbage paste", () => {
  it("rejects nonsense", () => {
    for (const raw of ["", "asdf", "hello world", "steam://store/730", "!genglove 1 2 3"]) {
      const r = parseInspectPaste(raw);
      expect(r.applied).toBe(false);
    }
    expect(parseInspectPaste("not a gen").kind).toBe("invalid");
  });
});

describe("our share URL via paste", () => {
  it("applies the existing query grammar", () => {
    const r = parseInspectPaste("http://127.0.0.1:5173/?weapon=ak47&kit=44&seed=923&float=0.056");
    expect(r.applied).toBe(true);
    expect(r.kind).toBe("share");
    expect(r.share?.weapon).toBe("ak47");
    expect(r.share?.official.paint_index).toBe(44);
    expect(r.share?.seed).toBe(923);
    expect(r.share?.float).toBeCloseTo(0.056, 8);
  });

  it("keeps existing parseShareQuery tests' CH URL stable", () => {
    const viaShare = parseShareQuery(new URLSearchParams("weapon=ak47&kit=44&seed=923&float=0.056"));
    const viaPaste = parseInspectPaste("weapon=ak47&kit=44&seed=923&float=0.056");
    expect(viaPaste.applied).toBe(true);
    expect(sameInspect(shareStateFromParsed(viaShare), shareStateFromParsed(viaPaste.share!))).toBe(true);
  });
});

describe("market / inspect text", () => {
  it("parses AK-47 | Case Hardened + Pattern + Float", () => {
    const r = parseInspectPaste(
      "AK-47 | Case Hardened (Factory New)\nPattern: 923\nFloat: 0.0558851957321166",
    );
    expect(r.applied).toBe(true);
    expect(r.kind).toBe("market");
    expect(r.share?.weapon).toBe("ak47");
    expect(r.share?.official.paint_index).toBe(44);
    expect(r.share?.seed).toBe(923);
    expect(r.share?.float).toBeCloseTo(0.0558851957321166, 8);
  });
});

describe("hex CEconItemPreviewDataBlock (cited field numbers)", () => {
  it("decodes a proto we encoded with SteamDatabase field numbers", () => {
    const hex = encodePreviewBlockHex({
      defindex: 7,
      paintindex: 44,
      paintseed: 923,
      paintwear: 0.0558851957321166,
    });
    const decoded = decodeInspectHex(hex);
    expect(decoded?.defindex).toBe(7);
    expect(decoded?.paintindex).toBe(44);
    expect(decoded?.paintseed).toBe(923);
    expect(decoded?.paintwear).toBeCloseTo(0.0558851957321166, 5);

    const r = parseInspectPaste(
      `steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20${hex}`,
    );
    expect(r.applied).toBe(true);
    expect(r.hexDecoded).toBe(true);
    expect(r.share?.official.paint_index).toBe(44);
    expect(r.share?.seed).toBe(923);
  });

  it("does not invent paint from a random hex D-like blob", () => {
    const r = parseInspectPaste(
      "steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20deadbeefcafebabe",
    );
    expect(r.applied).toBe(false);
    expect(r.hexDecoded).not.toBe(true);
  });
});
