import {
  getCountryCode,
  getCountryDisplayName,
  getCountryDisplayNameByCode,
  getCountryFlag,
} from "./countries";
import { compareConstructionPeriods } from "./apiMappings";
import { extractConstructionPeriod } from "./archetypeModifier";

/**
 * Human-readable archetype label formatting.
 *
 * Backend archetype names use multiple conventions:
 *   New:  {CC}_{TYPE}_{PERIOD}    e.g. "GR_SFH_1946_1969", "IT_MFH_1980_1989"
 *   Old:  {TYPE}_{COUNTRY}_{PERIOD} e.g. "SFH_Greece_1946_1969"
 *   Legacy: {TYPE}_{PERIOD}          e.g. "SFH_0_1945" (Austria, no country token)
 */

const TYPE_CODES: Record<string, string> = {
  SFH: "Single-Family House",
  MFH: "Multi-Family House",
};

export function countryNameToCode(name: string): string | undefined {
  return getCountryCode(name);
}

// "GR" → "🇬🇷"
export function countryFlag(isoCode: string): string {
  return getCountryFlag(isoCode) ?? "";
}

function formatPeriod(parts: string[]): string {
  if (parts.length === 0) return "";
  // "0_1945" → "Pre-1945"
  if (parts.length === 2 && parts[0] === "0" && /^\d{4}$/.test(parts[1])) {
    return `Pre-${parts[1]}`;
  }
  // "1946_1969" → "1946–1969"
  if (
    parts.length === 2 &&
    /^\d{4}$/.test(parts[0]) &&
    /^\d{4}$/.test(parts[1])
  ) {
    return `${parts[0]}–${parts[1]}`;
  }
  // "2011_now" → "2011–Present"
  if (
    parts.length === 2 &&
    /^\d{4}$/.test(parts[0]) &&
    parts[1].toLowerCase() === "now"
  ) {
    return `${parts[0]}–Present`;
  }
  const raw = parts.join(" ");
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/**
 * Convert a raw archetype name into a human-readable label.
 *
 * @example
 * formatArchetypeName("GR_SFH_1946_1969")      // "Greece · Single-Family House · 1946–1969"
 * formatArchetypeName("SFH_Greece_1946_1969")   // "Greece · Single-Family House · 1946–1969"
 * formatArchetypeName("SFH_0_1945")             // "Single-Family House · Pre-1945"
 */
export function formatArchetypeName(name: string): string {
  const parts = name.split("_");
  if (parts.length < 2) return name;

  const first = parts[0];

  // New format: {CC}_{TYPE}_{PERIOD}  e.g. "GR_SFH_1946_1969"
  const countryByCode = getCountryDisplayNameByCode(first);
  if (countryByCode && parts.length >= 2 && TYPE_CODES[parts[1]]) {
    const country = countryByCode;
    const type = TYPE_CODES[parts[1]];
    const period = formatPeriod(parts.slice(2));
    return [country, type, ...(period ? [period] : [])].join(" · ");
  }

  // Old format: {TYPE}_{COUNTRY_NAME}_{PERIOD}  e.g. "SFH_Greece_1946_1969"
  if (TYPE_CODES[first]) {
    const type = TYPE_CODES[first];
    const second = parts[1];
    // If second token is a country name (starts with uppercase letter, not a digit)
    if (/^[A-Z]/.test(second) && !/^\d/.test(second)) {
      const country = getCountryDisplayName(second) ?? second;
      const period = formatPeriod(parts.slice(2));
      return [country, type, ...(period ? [period] : [])].join(" · ");
    }
    // Legacy: {TYPE}_{PERIOD} (no country token)
    const period = formatPeriod(parts.slice(1));
    return [type, ...(period ? [period] : [])].join(" · ");
  }

  return name;
}

export function formatArchetypeSelectionLabel(
  country: string,
  name: string,
): string {
  const displayCountry = getCountryDisplayName(country) ?? country;
  const formattedName = formatArchetypeName(name);

  if (formattedName.startsWith(displayCountry)) {
    return formattedName;
  }

  return `${displayCountry} · ${formattedName}`;
}

function getArchetypeSelectionIdentity(archetype: {
  country: string;
  name: string;
}): string {
  return `${archetype.country}:${archetype.name}`;
}

export function buildArchetypeSelectionLabels<
  T extends { country: string; name: string },
>(archetypes: T[]): Map<string, string> {
  const labelCounts = new Map<string, number>();

  archetypes.forEach((archetype) => {
    const label = formatArchetypeSelectionLabel(
      archetype.country,
      archetype.name,
    );
    labelCounts.set(label, (labelCounts.get(label) ?? 0) + 1);
  });

  return new Map(
    archetypes.map((archetype) => {
      const label = formatArchetypeSelectionLabel(
        archetype.country,
        archetype.name,
      );
      const resolvedLabel =
        (labelCounts.get(label) ?? 0) > 1
          ? `${label} (${archetype.name})`
          : label;

      return [getArchetypeSelectionIdentity(archetype), resolvedLabel];
    }),
  );
}

export function getArchetypeSelectionLabel(
  archetype: { country: string; name: string },
  labels?: Map<string, string>,
): string {
  return (
    labels?.get(getArchetypeSelectionIdentity(archetype)) ??
    formatArchetypeSelectionLabel(archetype.country, archetype.name)
  );
}

export function compareArchetypesForSelection(
  left: { country: string; name: string },
  right: { country: string; name: string },
): number {
  const leftCountry = getCountryDisplayName(left.country) ?? left.country;
  const rightCountry = getCountryDisplayName(right.country) ?? right.country;
  const countryComparison = leftCountry.localeCompare(rightCountry);

  if (countryComparison !== 0) {
    return countryComparison;
  }

  const periodComparison = compareConstructionPeriods(
    extractConstructionPeriod(left.name),
    extractConstructionPeriod(right.name),
  );
  if (periodComparison !== 0) {
    return periodComparison;
  }

  const labelComparison = formatArchetypeSelectionLabel(
    left.country,
    left.name,
  ).localeCompare(formatArchetypeSelectionLabel(right.country, right.name));

  if (labelComparison !== 0) {
    return labelComparison;
  }

  return left.name.localeCompare(right.name);
}
