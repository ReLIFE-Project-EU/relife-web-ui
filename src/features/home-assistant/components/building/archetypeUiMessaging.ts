import type {
  ArchetypeMatchResult,
  PeriodAvailabilityResult,
} from "../../../../services/types";
import type { ArchetypeDetails } from "../../../../types/archetype";
import { constructionPeriodsEqual } from "../../../../utils/apiMappings";
import { getCountryDisplayName } from "../../../../utils/countries";

export function buildPeriodFallbackMessage(
  result: PeriodAvailabilityResult | null,
  buildingType: string,
): string | null {
  if (!result || result.scope !== "fallback") {
    return null;
  }

  const country = result.detectedCountry ?? "your country";
  const sourceCountry =
    result.sourceCountry && result.sourceCountry !== result.detectedCountry
      ? ` from ${result.sourceCountry}`
      : "";
  const recommendedPeriod =
    result.recommendedPeriod ?? "the closest available period";

  if (result.reason === "no-local-periods") {
    return `No ${buildingType} reference archetypes in ${country} match the selected construction period. ${recommendedPeriod} was preselected using the closest available reference archetype${sourceCountry}. You can continue, but this fallback may not be the optimal match.`;
  }

  return `No ${buildingType} reference archetypes are currently available in ${country}. ${recommendedPeriod} was preselected from the wider European archetype catalog${sourceCountry}. You can continue, but this fallback may not be the optimal match.`;
}

export function extractArchetypePeriod(name: string): string | null {
  const parts = name.split("_");
  if (parts.length < 2) return null;

  const first = parts[0];
  let periodParts: string[];

  if (/^[A-Z]{2}$/.test(first) && parts.length >= 3) {
    periodParts = parts.slice(2);
  } else if (/^[A-Z]{2,3}$/.test(first) && parts.length >= 2) {
    const second = parts[1];
    if (/^[A-Z]/.test(second) && !/^\d/.test(second)) {
      periodParts = parts.slice(2);
    } else {
      periodParts = parts.slice(1);
    }
  } else {
    return null;
  }

  if (periodParts.length === 0) return null;
  if (
    periodParts.length === 2 &&
    periodParts[0] === "0" &&
    /^\d{4}$/.test(periodParts[1])
  ) {
    return `Pre-${periodParts[1]}`;
  }
  if (
    periodParts.length === 2 &&
    /^\d{4}$/.test(periodParts[0]) &&
    /^\d{4}$/.test(periodParts[1])
  ) {
    return `${periodParts[0]}–${periodParts[1]}`;
  }
  if (
    periodParts.length === 2 &&
    /^\d{4}$/.test(periodParts[0]) &&
    periodParts[1].toLowerCase() === "now"
  ) {
    return `${periodParts[0]}–Present`;
  }
  return periodParts.join(" ");
}

export function buildMatchDeltaMessages(
  matchResult: ArchetypeMatchResult,
  details: ArchetypeDetails,
  selectedPeriod: string | null | undefined,
): string[] {
  const { scoreBreakdown, detectedCountry } = matchResult;
  const userCountry =
    getCountryDisplayName(detectedCountry) ??
    getCountryDisplayName(details.country) ??
    details.country;
  const archetypeCountry =
    getCountryDisplayName(details.country) ?? details.country;
  const archetypePeriod = extractArchetypePeriod(details.name);
  const messages: string[] = [];

  if (scoreBreakdown.countryScore === 0) {
    if (userCountry !== archetypeCountry) {
      messages.push(
        `Country: your building is in ${userCountry}, but no suitable local ${details.category} archetype was available for the selected period, so a ${archetypeCountry} reference home was used.`,
      );
    } else {
      messages.push(
        `Country: no suitable local ${details.category} archetype was available for the selected period, so the closest country match was used.`,
      );
    }
  }

  if (
    selectedPeriod &&
    archetypePeriod &&
    !constructionPeriodsEqual(selectedPeriod, archetypePeriod)
  ) {
    messages.push(
      `Construction period: you selected ${selectedPeriod}, but the closest available archetype period is ${archetypePeriod}.`,
    );
  }

  return messages;
}
