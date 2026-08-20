import { describe, expect, it } from "vitest";
import {
  DEFAULT_ENV_LOOK,
  ENV_LOOK_IDS,
  ENV_LOOK_LIST,
  ENV_LOOKS,
  isEnvLookId,
  resolveEnvLook,
} from "./catalog";

describe("M9 environment catalog", () => {
  it("has known ids studio / warm / cool / sun and defaults to studio", () => {
    expect(ENV_LOOK_IDS).toEqual(["studio", "warm", "cool", "sun"]);
    expect(DEFAULT_ENV_LOOK).toBe("studio");
    expect(ENV_LOOK_LIST.map((look) => look.id)).toEqual(["studio", "warm", "cool", "sun"]);
    expect(ENV_LOOKS.studio.plate).toBe(0x14161a);
    expect(ENV_LOOKS.warm.plate).toBe(0x2a2218);
    expect(ENV_LOOKS.cool.plate).toBe(0x1a1e24);
    for (const look of ENV_LOOK_LIST) {
      expect(look.origin).toBe("authored");
    }
  });

  it("studio lights match the M6 RoomEnvironment inspect (do not retune default)", () => {
    const lights = ENV_LOOKS.studio.lights;
    expect(lights.hemiSky).toBe(0xd7e6ff);
    expect(lights.hemiGround).toBe(0x3d2a1c);
    expect(lights.hemiIntensity).toBe(1.22);
    expect(lights.keyColor).toBe(0xfff4e5);
    expect(lights.keyIntensity).toBe(2.55);
    expect(lights.keyPosition).toEqual([0.8, 1.2, 0.6]);
    expect(lights.fillColor).toBe(0xb7c8e0);
    expect(lights.fillIntensity).toBe(0.62);
    expect(lights.fillPosition).toEqual([-0.7, 0.3, -0.4]);
    expect(ENV_LOOKS.studio.environmentIntensity).toBe(1);
  });

  it("omitted / empty bg resolves to studio without rejection", () => {
    expect(resolveEnvLook(undefined)).toEqual({ id: "studio", rejected: false });
    expect(resolveEnvLook(null)).toEqual({ id: "studio", rejected: false });
    expect(resolveEnvLook("")).toEqual({ id: "studio", rejected: false });
    expect(resolveEnvLook("   ")).toEqual({ id: "studio", rejected: false });
  });

  it("accepts known ids case-insensitively", () => {
    expect(isEnvLookId("studio")).toBe(true);
    expect(isEnvLookId("WARM")).toBe(true);
    expect(isEnvLookId("cool")).toBe(true);
    expect(isEnvLookId("sun")).toBe(true);
    expect(resolveEnvLook("Warm")).toEqual({ id: "warm", rejected: false });
    expect(resolveEnvLook("SUN")).toEqual({ id: "sun", rejected: false });
  });

  it("rejects unknown ids (skincraft / inferno / dust2) and falls back to studio", () => {
    for (const raw of ["skincraft", "inferno", "dust2", "nope", "map"]) {
      expect(isEnvLookId(raw)).toBe(false);
      expect(resolveEnvLook(raw)).toEqual({ id: "studio", rejected: true });
    }
  });
});
