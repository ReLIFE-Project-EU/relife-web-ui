import type {
  ArchetypeMatchResult,
  PeriodAvailabilityResult,
} from "../../../../services/types";
import type { ArchetypeDetails } from "../../../../types/archetype";
import { constructionPeriodsEqual } from "../../../../utils/apiMappings";
import { getCountryDisplayName } from "../../../../utils/countries";

/**
 * User-facing fallback text for rendering as a titled Alert.
 */
export interface PeriodFallbackInfo {
  title: string;
  body: string;
}

export function buildPeriodFallbackMessage(
  result: PeriodAvailabilityResult | null,
  buildingType: string,
): PeriodFallbackInfo | null {
  if (!result || result.scope !== "fallback") {
    return null;
  }

  const detectedCountry = result.detectedCountry ?? "your country";
  const reason =
    result.reason === "no-local-periods"
      ? "no-local-periods"
      : "no-local-archetypes";

  let title: string;
  let body: string;
  if (reason === "no-local-periods") {
    title = `No ${buildingType} archetypes in ${detectedCountry} for the selected period`;
    body = `${detectedCountry} has ${buildingType} archetypes, but not for the selected construction period. We'll use the closest available reference from the wider European catalog. Review the matched country and period in the archetype card before continuing.`;
  } else {
    title = `No ${buildingType} archetypes available in ${detectedCountry}`;
    body = `No local ${buildingType} archetype is currently available for ${detectedCountry}. We'll use the closest available reference from the wider European catalog. Review the matched country and period in the archetype card before continuing.`;
  }

  return {
    title,
    body,
  };
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
