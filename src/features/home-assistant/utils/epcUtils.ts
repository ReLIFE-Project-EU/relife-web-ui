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
export const EPC_COLORS: Record<string, string> = {
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
export const EPC_ORDER = ["G", "F", "E", "D", "C", "B", "A", "A+"];

/**
 * Get the numeric index of an EPC class (0 = G, 7 = A+).
 * Returns -1 if not found.
 */
export function getEPCIndex(epcClass: string): number {
  return EPC_ORDER.indexOf(epcClass);
}

/**
 * Compare two EPC classes.
 * Returns positive if first is better, negative if worse, 0 if equal.
 */
export function compareEPC(epc1: string, epc2: string): number {
  return getEPCIndex(epc1) - getEPCIndex(epc2);
}

/**
 * Check if first EPC class is better than or equal to second.
 */
export function isEPCBetterOrEqual(epc1: string, epc2: string): boolean {
  return compareEPC(epc1, epc2) >= 0;
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
export const EPC_DESCRIPTIONS: Record<string, string> = {
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
