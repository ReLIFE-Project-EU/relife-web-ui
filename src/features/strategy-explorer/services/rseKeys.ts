import type { RSEArchetypeRef, RSEPackageId } from "../types";

const RSE_KEY_SEPARATOR = "\u001f";

export function rseArchetypeKey(archetype: RSEArchetypeRef): string {
  return [archetype.country, archetype.category, archetype.name].join(
    RSE_KEY_SEPARATOR,
  );
}

export function rseArchetypePackageKey(
  archetype: RSEArchetypeRef,
  packageId: RSEPackageId,
): string {
  return [rseArchetypeKey(archetype), packageId].join(RSE_KEY_SEPARATOR);
}
