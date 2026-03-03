/**
 * Shared sanity-check heuristics for building input validation.
 * These functions return advisory warnings only — no input is blocked.
 */

export interface SanityCheckResult {
  warning: boolean;
  message: string;
}

/**
 * Returns a warning when CAPEX is below €20/m² relative to the given floor
 * area. Typical renovation costs are €50–500/m²; €20/m² is a generous lower
 * bound. Only meaningful when both values are positive.
 */
export function checkCapexPerSqm(
  capex: number,
  floorArea: number,
): SanityCheckResult {
  if (capex <= 0 || floorArea <= 0) {
    return { warning: false, message: "" };
  }

  const perSqm = capex / floorArea;

  if (perSqm < 20) {
    return {
      warning: true,
      message: `CAPEX seems low relative to building size (${perSqm.toFixed(1)} €/m²). Typical renovation costs are €50–500/m². Please verify the value.`,
    };
  }

  return { warning: false, message: "" };
}

/**
 * Returns a warning when the user floor area and the archetype floor area
 * differ by more than 3×. A large ratio means energy values are scaled
 * significantly beyond the archetype simulation.
 */
export function checkAreaArchetypeMismatch(
  userArea: number,
  archetypeArea: number,
): SanityCheckResult {
  if (userArea <= 0 || archetypeArea <= 0) {
    return { warning: false, message: "" };
  }

  const ratio = Math.max(userArea / archetypeArea, archetypeArea / userArea);

  if (ratio > 3) {
    return {
      warning: true,
      message: `Floor area (${userArea} m²) differs significantly from the matched archetype (${archetypeArea} m²) — ratio ${ratio.toFixed(1)}×. Energy results are scaled from the archetype simulation and may be less reliable.`,
    };
  }

  return { warning: false, message: "" };
}
