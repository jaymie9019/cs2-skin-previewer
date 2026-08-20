/**
 * Viewer weapons (M11). AK-47 + Glock-18 from the same items_game pipeline.
 * Unknown tokens (awp, …) are rejected by the share parser.
 */

export const WEAPON_AK47 = "ak47";
export const WEAPON_GLOCK = "glock";

export type ViewerWeapon = typeof WEAPON_AK47 | typeof WEAPON_GLOCK;

const AK_ALIASES = ["ak47", "ak-47", "weapon_ak47", "ak"] as const;
const GLOCK_ALIASES = ["glock", "glock-18", "glock18", "weapon_glock", "weapon_glock18"] as const;

const ALIAS_TO_WEAPON = new Map<string, ViewerWeapon>([
  ...AK_ALIASES.map((a) => [a, WEAPON_AK47] as const),
  ...GLOCK_ALIASES.map((a) => [a, WEAPON_GLOCK] as const),
]);

export function isViewerWeaponQuery(query: string | null | undefined): boolean {
  if (query == null || query.trim() === "") return false;
  return ALIAS_TO_WEAPON.has(query.trim().toLowerCase());
}

export function resolveViewerWeapon(query: string | null | undefined): ViewerWeapon | undefined {
  if (!isViewerWeaponQuery(query)) return undefined;
  return ALIAS_TO_WEAPON.get((query ?? "").trim().toLowerCase());
}

export function weaponLabel(weapon: ViewerWeapon): string {
  return weapon === WEAPON_GLOCK ? "Glock-18" : "AK-47";
}

export function weaponCatalogTitle(weapon: ViewerWeapon): string {
  return weapon === WEAPON_GLOCK ? "Glock-18 kits" : "AK-47 kits";
}

export function defaultPaintIndex(weapon: ViewerWeapon): number {
  return weapon === WEAPON_GLOCK ? 38 : 44;
}
