/**
 * Color Utilities
 * Shared color mapping functions for consistent styling across components.
 */

/**
 * Get color for renovation scenario type.
 */
export function getScenarioColor(scenarioId: string): string {
  switch (scenarioId) {
    case "current":
      return "gray";
    case "mild":
      return "green";
    case "regular":
      return "blue";
    case "deep":
      return "violet";
    default:
      return getDeterministicColor(scenarioId);
  }
}

function getDeterministicColor(value: string): string {
  const palette = ["green", "blue", "teal", "cyan", "indigo", "lime"];
  const hash = [...value].reduce(
    (accumulator, character) => accumulator + character.charCodeAt(0),
    0,
  );

  return palette[hash % palette.length];
}

/** Green for a gain, red for a loss, neutral at zero or when unknown. */
export function gainLossColor(value: number | undefined): string | undefined {
  if (value === undefined || value === 0) return undefined;
  return value > 0 ? "green.8" : "red.8";
}
