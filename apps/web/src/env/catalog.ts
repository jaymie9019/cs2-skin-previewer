/**
 * Named inspect lighting looks (M9).
 *
 * `bg=` in the share URL selects an environment (PMREM IBL), not just a
 * backdrop plate. Default is `studio` — the same RoomEnvironment bake as M6
 * — so Case Hardened / Red Laminate baselines stay in the same class.
 *
 * These are *our* looks (authored Three scenes → PMREM). They are not
 * Dust II / Inferno / Skincraft map probes. Official CS2 cubemaps we
 * found locally are documented in `assets/env/README.md` and are not
 * shipped (Valve IP).
 */
export const ENV_LOOK_IDS = ["studio", "warm", "cool", "sun"] as const;
export type EnvLookId = (typeof ENV_LOOK_IDS)[number];

export const DEFAULT_ENV_LOOK: EnvLookId = "studio";

export type EnvLights = {
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  keyColor: number;
  keyIntensity: number;
  keyPosition: readonly [number, number, number];
  fillColor: number;
  fillIntensity: number;
  fillPosition: readonly [number, number, number];
};

export type EnvLook = {
  id: EnvLookId;
  label: string;
  /** How the IBL was produced. None of these are ripped map videos. */
  origin: "authored";
  /** Solid plate behind the rifle (capture stays clean). */
  plate: number;
  environmentIntensity: number;
  lights: EnvLights;
  description: string;
};

/** M6 / M8 studio lights — do not retune or default CH looks like a new product. */
const STUDIO_LIGHTS: EnvLights = {
  hemiSky: 0xd7e6ff,
  hemiGround: 0x3d2a1c,
  hemiIntensity: 1.22,
  keyColor: 0xfff4e5,
  keyIntensity: 2.55,
  keyPosition: [0.8, 1.2, 0.6],
  fillColor: 0xb7c8e0,
  fillIntensity: 0.62,
  fillPosition: [-0.7, 0.3, -0.4],
};

export const ENV_LOOKS: Record<EnvLookId, EnvLook> = {
  studio: {
    id: "studio",
    label: "Studio",
    origin: "authored",
    plate: 0x14161a,
    environmentIntensity: 1,
    lights: STUDIO_LIGHTS,
    description: "RoomEnvironment PMREM (M6 default). Neutral studio.",
  },
  warm: {
    id: "warm",
    label: "Warm",
    origin: "authored",
    plate: 0x2a2218,
    environmentIntensity: 1.18,
    lights: {
      hemiSky: 0xffe8c4,
      hemiGround: 0x5a3a1c,
      hemiIntensity: 1.18,
      keyColor: 0xffd9a0,
      keyIntensity: 3.05,
      keyPosition: [1.0, 1.45, 0.45],
      fillColor: 0xc8b090,
      fillIntensity: 0.48,
      fillPosition: [-0.8, 0.25, -0.35],
    },
    description: "Dusty courtyard — warm sun + pale sky. Our look, not Dust II.",
  },
  cool: {
    id: "cool",
    label: "Cool",
    origin: "authored",
    plate: 0x1a1e24,
    environmentIntensity: 1.05,
    lights: {
      hemiSky: 0xc5d4ea,
      hemiGround: 0x2a3040,
      hemiIntensity: 1.32,
      keyColor: 0xe4eaf2,
      keyIntensity: 1.85,
      keyPosition: [0.5, 1.4, 0.7],
      fillColor: 0xa8b8d0,
      fillIntensity: 0.95,
      fillPosition: [-0.6, 0.5, -0.5],
    },
    description: "Overcast — cooler fill, softer key. Our look.",
  },
  sun: {
    id: "sun",
    label: "Sun",
    origin: "authored",
    plate: 0x1c1812,
    environmentIntensity: 1.22,
    lights: {
      hemiSky: 0xfff0d0,
      hemiGround: 0x3a2814,
      hemiIntensity: 1.08,
      keyColor: 0xfff2cc,
      keyIntensity: 3.35,
      keyPosition: [0.45, 1.7, 0.55],
      fillColor: 0x7a8aa0,
      fillIntensity: 0.38,
      fillPosition: [-0.9, 0.2, -0.45],
    },
    description: "High-sun key, more contrast. Our look, not a map extract.",
  },
};

export const ENV_LOOK_LIST: readonly EnvLook[] = ENV_LOOK_IDS.map((id) => ENV_LOOKS[id]);

export function isEnvLookId(value: string | null | undefined): value is EnvLookId {
  if (value == null) return false;
  return (ENV_LOOK_IDS as readonly string[]).includes(value.trim().toLowerCase());
}

/**
 * Parse a `bg=` token. Empty / omit → studio (not rejected).
 * Unknown (skincraft, inferno, …) → studio + rejected.
 */
export function resolveEnvLook(query: string | null | undefined): { id: EnvLookId; rejected: boolean } {
  if (query == null || query.trim() === "") {
    return { id: DEFAULT_ENV_LOOK, rejected: false };
  }
  const id = query.trim().toLowerCase();
  if (isEnvLookId(id)) return { id, rejected: false };
  return { id: DEFAULT_ENV_LOOK, rejected: true };
}

export function envLookPlateHex(id: EnvLookId): string {
  return `#${ENV_LOOKS[id].plate.toString(16).padStart(6, "0")}`;
}
