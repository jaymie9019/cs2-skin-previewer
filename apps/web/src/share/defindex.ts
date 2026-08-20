/**
 * items_game `items` defindex → viewer weapon.
 *
 * Cited from the local CS2 dump (docs/ITEMS_GAME.md + data/raw/scripts/items/items_game.txt):
 *   items / "7" { "name" "weapon_ak47" }   (ITEMS_GAME.md §2, dump ~line 4777)
 *   items / "4" { "name" "weapon_glock" }  (same `items` map; pairing token weapon_glock)
 *
 * Only these two weapons are in the viewer. Any other defindex is rejected
 * (do not invent AWP / knife mappings).
 */
import { WEAPON_AK47, WEAPON_GLOCK, type ViewerWeapon } from "./weapons";

export const DEFINDEX_AK47 = 7;
export const DEFINDEX_GLOCK = 4;

const DEFINDEX_TO_WEAPON: Readonly<Record<number, ViewerWeapon>> = {
  [DEFINDEX_AK47]: WEAPON_AK47,
  [DEFINDEX_GLOCK]: WEAPON_GLOCK,
};

export function resolveDefindex(defindex: number): ViewerWeapon | undefined {
  if (!Number.isFinite(defindex)) return undefined;
  return DEFINDEX_TO_WEAPON[Math.floor(defindex)];
}

export function isKnownDefindex(defindex: number): boolean {
  return resolveDefindex(defindex) != null;
}

export function defindexOf(weapon: ViewerWeapon): number {
  return weapon === WEAPON_GLOCK ? DEFINDEX_GLOCK : DEFINDEX_AK47;
}
