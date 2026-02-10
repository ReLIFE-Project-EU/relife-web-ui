/**
 * Color Utilities
 * Shared color mapping functions for consistent styling across components.
 */

/**
 * Get color based on index/percentage value (0-100 scale).
 * Used for comfort, flexibility, and progress indicators.
 */
export function getIndexColor(value: number): string {
  if (value >= 80) return "green";
  if (value >= 60) return "lime";
  if (value >= 40) return "yellow";
  if (value >= 20) return "orange";
  return "red";
}

/**
 * Get color for renovation scenario type.
 */
export function getScenarioColor(scenarioId: string): string {
  switch (scenarioId) {
    case "mild":
      return "green";
    case "regular":
      return "blue";
    case "deep":
      return "violet";
    default:
      return "gray";
  }
}

/**
 * Get color for MCDA ranking position.
 * Returns Mantine color tokens for gold, silver, bronze medals.
 */
export function getRankColor(rank: number): string {
  switch (rank) {
    case 1:
      return "yellow"; // Gold
    case 2:
      return "gray.5"; // Silver
    case 3:
      return "orange.7"; // Bronze
    default:
      return "gray";
  }
}

/**
 * Get label for MCDA ranking position.
 */
export function getRankLabel(rank: number): string {
  switch (rank) {
    case 1:
      return "Best Match";
    case 2:
      return "2nd";
    case 3:
      return "3rd";
    default:
      return `${rank}th`;
  }
}
