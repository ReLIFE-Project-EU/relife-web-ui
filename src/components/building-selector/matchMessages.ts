import type { ArchetypeDetails } from "../../types/archetype";
import type { ArchetypeMatchResult } from "../../services/types";
import { constructionPeriodsEqual } from "../../utils/apiMappings";
import {
  getArchetypePeriod,
  getDisplayCountry,
  getMatchStatus,
} from "./buildingSelectorUtils";

export function buildMatchFallbackText(
  matchResult: ArchetypeMatchResult | null,
  details: ArchetypeDetails | null,
  selectedPeriod: string | null,
): string | null {
  if (!matchResult || !details || getMatchStatus(matchResult) === "exact") {
    return null;
  }

  const messages: string[] = [];
  const detectedCountry = getDisplayCountry(matchResult.detectedCountry);
  const referenceCountry = getDisplayCountry(details.country);
  const archetypePeriod = getArchetypePeriod(details);

  if (detectedCountry && detectedCountry !== referenceCountry) {
    messages.push(
      `The building is in ${detectedCountry}, but the closest available reference is from ${referenceCountry}.`,
    );
  }

  if (
    selectedPeriod &&
    archetypePeriod &&
    !constructionPeriodsEqual(selectedPeriod, archetypePeriod)
  ) {
    messages.push(
      `The selected period is ${selectedPeriod}; the closest available reference period is ${archetypePeriod}.`,
    );
  }

  return messages.length > 0
    ? messages.join(" ")
    : "No exact local reference is available for these inputs, so the closest available reference is used.";
}
