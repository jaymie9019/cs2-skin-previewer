import { describe, expect, it } from "vitest";
import {
  KIT_BLUE_LAMINATE,
  KIT_CASE_HARDENED,
  KIT_JUNGLE_SPRAY,
  KIT_RED_LAMINATE,
  KIT_REDLINE,
  KIT_SAFARI_MESH,
} from "../kits/catalog";
import { emptySlots } from "../stickers/slots";
import {
  WEAPON_AK47,
  formatQueryFloat,
  parseShareQuery,
  sameInspect,
  serializeShareQuery,
  shareStateFromParsed,
} from "./query";

function params(raw: string): URLSearchParams {
  return new URLSearchParams(raw);
}

describe("share URL parse / serialize", () => {
  it("round-trips weapon, kit, seed, float, and 4 sticker slots", () => {
    const slots = emptySlots();
    slots[0] = { id: 259, offsetX: 0.03, offsetY: -0.02, rotationDeg: 25, wear: 0.35 };
    slots[1] = { id: 14, offsetX: 0, offsetY: 0, rotationDeg: 0, wear: 0 };
    slots[2] = { id: 15, offsetX: -0.01, offsetY: 0.02, rotationDeg: -12, wear: 0.5 };
    slots[3] = { id: 13, offsetX: 0.1, offsetY: -0.1, rotationDeg: 180, wear: 1 };

    const original = {
      weapon: WEAPON_AK47,
      kit: KIT_JUNGLE_SPRAY,
      seed: 923,
      float: 0.056,
      slots,
      capture: false,
      fixed: false,
    };

    const encoded = serializeShareQuery(original);
    expect(encoded.get("weapon")).toBe("ak47");
    expect(encoded.get("kit")).toBe("122");
    expect(encoded.get("seed")).toBe("923");
    expect(encoded.get("float")).toBe("0.056");
    expect(encoded.get("s0")).toBe("259,0.03,-0.02,25,0.35");
    expect(encoded.get("s1")).toBe("14");
    expect(encoded.get("s2")).toBe("15,-0.01,0.02,-12,0.5");
    expect(encoded.get("s3")).toBe("13,0.1,-0.1,180,1");

    const parsed = parseShareQuery(encoded);
    expect(sameInspect(shareStateFromParsed(parsed), original)).toBe(true);
    expect(parsed.kit).toBe(KIT_JUNGLE_SPRAY);
    expect(parsed.rejected).toEqual([]);

    const again = parseShareQuery(serializeShareQuery(shareStateFromParsed(parsed)));
    expect(sameInspect(shareStateFromParsed(again), original)).toBe(true);
  });

  it("round-trips Case Hardened + Red Laminate floats used by baselines", () => {
    const ch = parseShareQuery(params("weapon=ak47&kit=44&seed=923&float=0.056"));
    expect(ch.kit).toBe(KIT_CASE_HARDENED);
    expect(ch.seed).toBe(923);
    expect(ch.float).toBeCloseTo(0.056, 8);
    expect(sameInspect(shareStateFromParsed(ch), shareStateFromParsed(parseShareQuery(serializeShareQuery(ch))))).toBe(
      true,
    );

    const lam = parseShareQuery(params("weapon=ak47&kit=14&seed=796&float=0.1412"));
    expect(lam.kit).toBe(KIT_RED_LAMINATE);
    expect(lam.seed).toBe(796);
    expect(lam.float).toBeCloseTo(0.1412, 8);
    expect(formatQueryFloat(lam.float)).toBe("0.1412");
    expect(sameInspect(shareStateFromParsed(lam), shareStateFromParsed(parseShareQuery(serializeShareQuery(lam))))).toBe(
      true,
    );
  });

  it("omitted weapon defaults to ak47 without rejection", () => {
    const q = parseShareQuery(params("kit=44&seed=1"));
    expect(q.weapon).toBe("ak47");
    expect(q.rejected).toEqual([]);
  });

  it("accepts weapon aliases", () => {
    expect(parseShareQuery(params("weapon=AK-47")).weapon).toBe("ak47");
    expect(parseShareQuery(params("weapon=weapon_ak47")).rejected).toEqual([]);
    expect(parseShareQuery(params("weapon=ak")).weapon).toBe("ak47");
  });

  it("preserves capture / fixed flags", () => {
    const q = parseShareQuery(params("kit=14&capture=1"));
    expect(q.capture).toBe(true);
    expect(serializeShareQuery(q).get("capture")).toBe("1");
  });
});

describe("invalid kit / s4 rejected", () => {
  it("rejects unknown kit (fade / 38 / 999) and falls back to Case Hardened", () => {
    for (const raw of ["kit=fade", "kit=38", "kit=999", "kit=nope"]) {
      const q = parseShareQuery(params(raw));
      expect(q.rejected).toContain("kit");
      expect(q.kit).toBe(KIT_CASE_HARDENED);
    }
  });

  it("rejects s4 (and s5) and does not apply a fifth layer", () => {
    const q = parseShareQuery(
      params("weapon=ak47&kit=122&seed=1&float=0.1&s0=259&s1=14&s2=15&s3=13&s4=278&s5=1"),
    );
    expect(q.slots).toHaveLength(4);
    expect(q.slots.map((s) => s.id)).toEqual([259, 14, 15, 13]);
    expect(q.rejected).toEqual(expect.arrayContaining(["s4", "s5"]));
    expect(serializeShareQuery(q).has("s4")).toBe(false);
  });

  it("rejects unknown weapon and invalid kit together with s4", () => {
    const q = parseShareQuery(params("weapon=awp&kit=fade&s4=259"));
    expect(q.weapon).toBe("ak47");
    expect(q.kit).toBe(KIT_CASE_HARDENED);
    expect(q.rejected.sort()).toEqual(["kit", "s4", "weapon"]);
  });
});

describe("M7 official catalog kits + wear clamp + view/bg", () => {
  it("resolves kit=72 / 226 / 282 to ViewerKits (Live) and serializes their index", () => {
    const safari = parseShareQuery(params("kit=72"));
    expect(safari.rejected).not.toContain("kit");
    expect(safari.official.paint_index).toBe(72);
    expect(safari.official.name_en).toBe("Safari Mesh");
    expect(safari.kit).toBe(KIT_SAFARI_MESH);
    expect(serializeShareQuery(safari).get("kit")).toBe("72");

    const blue = parseShareQuery(params("kit=226"));
    expect(blue.rejected).not.toContain("kit");
    expect(blue.official.paint_index).toBe(226);
    expect(blue.official.name_en).toBe("Blue Laminate");
    expect(blue.kit).toBe(KIT_BLUE_LAMINATE);
    expect(serializeShareQuery(blue).get("kit")).toBe("226");

    const redline = parseShareQuery(params("kit=282"));
    expect(redline.rejected).not.toContain("kit");
    expect(redline.kit).toBe(KIT_REDLINE);
    expect(serializeShareQuery(redline).get("kit")).toBe("282");
  });

  it("keeps leftover listed kits (180 Fire Serpent) as official + vanilla", () => {
    const fire = parseShareQuery(params("kit=180"));
    expect(fire.rejected).not.toContain("kit");
    expect(fire.official.paint_index).toBe(180);
    expect(fire.official.name_en).toBe("Fire Serpent");
    expect(fire.kit).toBeNull();
    expect(serializeShareQuery(fire).get("kit")).toBe("180");
  });

  it("clamps float to Blue Laminate 0.02–0.4 when wear is locked", () => {
    const high = parseShareQuery(params("kit=226&float=0.9"));
    expect(high.float).toBeCloseTo(0.4, 8);
    expect(high.rejected).not.toContain("float");
    expect(high.unlockWear).toBe(false);

    const low = parseShareQuery(params("kit=226&float=0.01"));
    expect(low.float).toBeCloseTo(0.02, 8);
  });

  it("keeps float 0.9 when unlock=1 (or wear=full)", () => {
    const unlocked = parseShareQuery(params("kit=226&unlock=1&float=0.9"));
    expect(unlocked.float).toBeCloseTo(0.9, 8);
    expect(unlocked.unlockWear).toBe(true);
    expect(serializeShareQuery(unlocked).get("unlock")).toBe("1");
    expect(serializeShareQuery(unlocked).get("float")).toBe("0.9");

    const viaWear = parseShareQuery(params("kit=226&wear=full&float=0.9"));
    expect(viaWear.unlockWear).toBe(true);
    expect(viaWear.float).toBeCloseTo(0.9, 8);
  });

  it("round-trips view=front and bg=warm", () => {
    const q = parseShareQuery(params("kit=44&seed=923&float=0.056&view=front&bg=warm"));
    expect(q.view).toBe("front");
    expect(q.bg).toBe("warm");
    expect(q.rejected).toEqual([]);
    const encoded = serializeShareQuery(q);
    expect(encoded.get("view")).toBe("front");
    expect(encoded.get("bg")).toBe("warm");
    const again = parseShareQuery(encoded);
    expect(sameInspect(shareStateFromParsed(again), shareStateFromParsed(q))).toBe(true);
  });

  it("omits default view/bg/unlock from the query string", () => {
    const q = parseShareQuery(params("kit=44&seed=1"));
    const encoded = serializeShareQuery(q);
    expect(encoded.has("view")).toBe(false);
    expect(encoded.has("bg")).toBe(false);
    expect(encoded.has("unlock")).toBe(false);
  });

  it("unknown view/bg fall back (and are rejected)", () => {
    const q = parseShareQuery(params("view=top&bg=inferno"));
    expect(q.view).toBe("inspect");
    expect(q.bg).toBe("studio");
    expect(q.rejected).toEqual(expect.arrayContaining(["view", "bg"]));
  });

  it("still rejects fade / 38 / 999 / s4", () => {
    for (const raw of ["kit=fade", "kit=38", "kit=999"]) {
      const q = parseShareQuery(params(raw));
      expect(q.rejected).toContain("kit");
      expect(q.kit).toBe(KIT_CASE_HARDENED);
      expect(q.official.paint_index).toBe(44);
    }
    const s4 = parseShareQuery(params("kit=72&s4=259"));
    expect(s4.official.paint_index).toBe(72);
    expect(s4.rejected).toContain("s4");
  });
});

describe("M9 bg= environment IBL looks", () => {
  it("round-trips bg=warm and bg=sun", () => {
    const warm = parseShareQuery(params("kit=44&seed=923&float=0.056&bg=warm"));
    expect(warm.bg).toBe("warm");
    expect(warm.rejected).toEqual([]);
    expect(serializeShareQuery(warm).get("bg")).toBe("warm");

    const sun = parseShareQuery(params("kit=44&bg=sun"));
    expect(sun.bg).toBe("sun");
    expect(serializeShareQuery(sun).get("bg")).toBe("sun");
    expect(sameInspect(shareStateFromParsed(parseShareQuery(serializeShareQuery(sun))), shareStateFromParsed(sun))).toBe(
      true,
    );
  });

  it("omitted bg defaults to studio and is not serialized", () => {
    const q = parseShareQuery(params("kit=44"));
    expect(q.bg).toBe("studio");
    expect(q.rejected).not.toContain("bg");
    expect(serializeShareQuery(q).has("bg")).toBe(false);
  });

  it("unknown bg=skincraft falls back to studio and is rejected", () => {
    const q = parseShareQuery(params("bg=skincraft"));
    expect(q.bg).toBe("studio");
    expect(q.rejected).toContain("bg");
    expect(serializeShareQuery(q).has("bg")).toBe(false);
  });
});

describe("M10 StatTrak / nametag / charm", () => {
  it("parses st=1 and omits default false on serialize", () => {
    const on = parseShareQuery(params("kit=44&st=1"));
    expect(on.stattrak).toBe(true);
    expect(on.kills).toBe(0);
    expect(on.rejected).not.toContain("st");
    expect(serializeShareQuery(on).get("st")).toBe("1");

    const off = parseShareQuery(params("kit=44"));
    expect(off.stattrak).toBe(false);
    expect(off.kills).toBe(0);
    expect(serializeShareQuery(off).has("st")).toBe(false);

    const zero = parseShareQuery(params("st=0"));
    expect(zero.stattrak).toBe(false);
    expect(serializeShareQuery(zero).has("st")).toBe(false);
  });

  it("accepts st=<kills> and kills= alias", () => {
    const viaSt = parseShareQuery(params("st=1234"));
    expect(viaSt.stattrak).toBe(true);
    expect(viaSt.kills).toBe(1234);
    expect(serializeShareQuery(viaSt).get("st")).toBe("1234");

    const viaKills = parseShareQuery(params("kills=42"));
    expect(viaKills.stattrak).toBe(true);
    expect(viaKills.kills).toBe(42);
    expect(serializeShareQuery(viaKills).get("st")).toBe("42");

    const both = parseShareQuery(params("st=1&kills=99"));
    expect(both.stattrak).toBe(true);
    expect(both.kills).toBe(99);
    expect(serializeShareQuery(both).get("st")).toBe("99");
  });

  it("ignores invalid st= (rejected, stays off)", () => {
    const q = parseShareQuery(params("st=nope"));
    expect(q.stattrak).toBe(false);
    expect(q.kills).toBe(0);
    expect(q.rejected).toContain("st");
    expect(serializeShareQuery(q).has("st")).toBe(false);
  });

  it("round-trips unicode nametag and clamps length", () => {
    const zh = parseShareQuery(params("name=" + encodeURIComponent("淬火AK")));
    expect(zh.nametag).toBe("淬火AK");
    expect(zh.rejected).not.toContain("name");
    expect(serializeShareQuery(zh).get("name")).toBe("淬火AK");
    const again = parseShareQuery(serializeShareQuery(shareStateFromParsed(zh)));
    expect(sameInspect(shareStateFromParsed(again), shareStateFromParsed(zh))).toBe(true);

    const long = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const clamped = parseShareQuery(params("name=" + encodeURIComponent(long)));
    expect(clamped.nametag).toHaveLength(20);
    expect(clamped.nametag).toBe("ABCDEFGHIJKLMNOPQRST");
  });

  it("omits empty nametag and rejects name=", () => {
    const empty = parseShareQuery(params("kit=44"));
    expect(empty.nametag).toBe("");
    expect(serializeShareQuery(empty).has("name")).toBe(false);

    const blank = parseShareQuery(params("name="));
    expect(blank.nametag).toBe("");
    expect(blank.rejected).toContain("name");
    expect(serializeShareQuery(blank).has("name")).toBe(false);
  });

  it("rejects charm= (stub, not applied)", () => {
    const q = parseShareQuery(params("kit=44&charm=1"));
    expect(q.rejected).toContain("charm");
    expect(serializeShareQuery(q).has("charm")).toBe(false);
  });

  it("sameInspect includes st / name and still matches M6 sticker URLs", () => {
    const a = parseShareQuery(params("kit=122&s0=259&st=1&name=jaymie"));
    const b = parseShareQuery(serializeShareQuery(shareStateFromParsed(a)));
    expect(sameInspect(shareStateFromParsed(a), shareStateFromParsed(b))).toBe(true);
    expect(b.stattrak).toBe(true);
    expect(b.nametag).toBe("jaymie");
    expect(b.slots[0].id).toBe(259);

    const noExtra = parseShareQuery(params("weapon=ak47&kit=44&seed=923&float=0.056&s0=259,0.02,-0.01,15,0.4"));
    expect(noExtra.stattrak).toBe(false);
    expect(noExtra.nametag).toBe("");
    expect(serializeShareQuery(noExtra).has("st")).toBe(false);
    expect(serializeShareQuery(noExtra).has("name")).toBe(false);
    expect(serializeShareQuery(noExtra).get("s0")).toBe("259,0.02,-0.01,15,0.4");
  });
});
