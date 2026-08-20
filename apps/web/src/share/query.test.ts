import { describe, expect, it } from "vitest";
import {
  KIT_CASE_HARDENED,
  KIT_JUNGLE_SPRAY,
  KIT_RED_LAMINATE,
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
