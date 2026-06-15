/**
 * EPC (Energy Performance Certificate) utilities
 * Provides color mapping and helper functions for EPC class display.
 */

// ─────────────────────────────────────────────────────────────────────────────
// EPC Color Mapping
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mantine color tokens for each EPC class.
 * Uses the format expected by Mantine Badge color prop.
 */
const EPC_COLORS: Record<string, string> = {
  "A+": "green.8",
  A: "green.6",
  B: "lime.6",
  C: "yellow.6",
  D: "orange.5",
  E: "orange.7",
  F: "red.6",
  G: "red.8",
};

/**
 * Get the Mantine color for an EPC class.
 */
export function getEPCColor(epcClass: string): string {
  return EPC_COLORS[epcClass] || "gray.6";
}

// ─────────────────────────────────────────────────────────────────────────────
// EPC Class Ordering
// ─────────────────────────────────────────────────────────────────────────────

/**
 * EPC classes ordered from worst to best.
 */
const EPC_ORDER = ["G", "F", "E", "D", "C", "B", "A", "A+"];

/**
 * Get the numeric index of an EPC class (0 = G, 7 = A+).
 * Returns -1 if not found.
 */
function getEPCIndex(epcClass: string): number {
  return EPC_ORDER.indexOf(epcClass);
}

/**
 * Calculate the number of class improvements between two EPC classes.
 */
export function getEPCImprovement(fromEPC: string, toEPC: string): number {
  return getEPCIndex(toEPC) - getEPCIndex(fromEPC);
}

// ─────────────────────────────────────────────────────────────────────────────
// EPC Descriptions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Human-readable descriptions for each EPC class.
 */
const EPC_DESCRIPTIONS: Record<string, string> = {
  "A+": "Excellent - Nearly zero energy building",
  A: "Very Good - High efficiency",
  B: "Good - Above average efficiency",
  C: "Average - Typical modern building",
  D: "Below Average - Room for improvement",
  E: "Poor - Significant improvements needed",
  F: "Very Poor - Major renovations recommended",
  G: "Lowest - Urgent action required",
};

/**
 * Get a description for an EPC class.
 */
export function getEPCDescription(epcClass: string): string {
  return EPC_DESCRIPTIONS[epcClass] || "Unknown EPC class";
}

// ─────────────────────────────────────────────────────────────────────────────
// EPC Energy Intensity Ranges (kWh/m²/year)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Approximate energy intensity ranges for each EPC class.
 */
export const EPC_ENERGY_RANGES: Record<string, { min: number; max: number }> = {
  "A+": { min: 0, max: 30 },
  A: { min: 30, max: 50 },
  B: { min: 50, max: 90 },
  C: { min: 90, max: 150 },
  D: { min: 150, max: 230 },
  E: { min: 230, max: 330 },
  F: { min: 330, max: 450 },
  G: { min: 450, max: Infinity },
};

/**
 * Resolve a scenario's energy intensity (kWh/m²/year): prefer the explicit
 * `epcEnergyIntensity`, otherwise derive it from annual energy needs and floor
 * area when both are available.
 */
export function getEnergyIntensity(
  scenario: { epcEnergyIntensity?: number; annualEnergyNeeds?: number },
  floorArea: number | null | undefined,
): number | undefined {
  return (
    scenario.epcEnergyIntensity ??
    (floorArea && floorArea > 0 && scenario.annualEnergyNeeds !== undefined
      ? scenario.annualEnergyNeeds / floorArea
      : undefined)
  );
}
