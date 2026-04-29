import type {
  ArchetypeMatchResult,
  PeriodAvailabilityResult,
} from "../../../../services/types";
import type { ArchetypeDetails } from "../../../../types/archetype";
import { constructionPeriodsEqual } from "../../../../utils/apiMappings";
import { getCountryDisplayName } from "../../../../utils/countries";

export type PeriodFallbackReason = "no-local-archetypes" | "no-local-periods";

/**
 * Structured description of a fallback-archetype situation, suitable for
 * rendering as a titled Alert with bulleted details.
 */
export interface PeriodFallbackInfo {
  /** Headline summarizing the fallback in one short sentence. */
  title: string;
  /** Why we fell back. */
  reason: PeriodFallbackReason;
  /** Building type label as shown to the user. */
  buildingType: string;
  /** Country detected from the user's pin. */
  detectedCountry: string;
  /** Country whose archetype catalog the fallback was drawn from. Null when same as detected. */
  sourceCountry: string | null;
  /** Construction period of the recommended archetype. Null if no period could be inferred. */
  recommendedPeriod: string | null;
}

export function buildPeriodFallbackMessage(
  result: PeriodAvailabilityResult | null,
  buildingType: string,
): PeriodFallbackInfo | null {
  if (!result || result.scope !== "fallback") {
    return null;
  }

  const detectedCountry = result.detectedCountry ?? "your country";
  const sourceCountry =
    result.sourceCountry && result.sourceCountry !== result.detectedCountry
      ? result.sourceCountry
      : null;
  const recommendedPeriod = result.recommendedPeriod ?? null;
  const reason: PeriodFallbackReason =
    result.reason === "no-local-periods"
      ? "no-local-periods"
      : "no-local-archetypes";

  let title: string;
  if (reason === "no-local-periods") {
    title = `No ${buildingType} archetypes in ${detectedCountry} for the selected period`;
  } else {
    title = `No ${buildingType} archetypes available in ${detectedCountry}`;
  }

  return {
    title,
    reason,
    buildingType,
    detectedCountry,
    sourceCountry,
    recommendedPeriod,
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
