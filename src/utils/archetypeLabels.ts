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

const COUNTRY_CODES: Record<string, string> = {
  AT: "Austria",
  BE: "Belgium",
  BG: "Bulgaria",
  CY: "Cyprus",
  CZ: "Czech Republic",
  DE: "Germany",
  DK: "Denmark",
  EE: "Estonia",
  ES: "Spain",
  FI: "Finland",
  FR: "France",
  GR: "Greece",
  HR: "Croatia",
  HU: "Hungary",
  IE: "Ireland",
  IT: "Italy",
  LT: "Lithuania",
  LU: "Luxembourg",
  LV: "Latvia",
  MT: "Malta",
  NL: "Netherlands",
  PL: "Poland",
  PT: "Portugal",
  RO: "Romania",
  SE: "Sweden",
  SI: "Slovenia",
  SK: "Slovakia",
};

// Reverse lookup: "Greece" → "GR"
const NAME_TO_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(COUNTRY_CODES).map(([code, name]) => [name, code]),
);

export function countryNameToCode(name: string): string | undefined {
  return NAME_TO_CODE[name];
}

// "GR" → "🇬🇷"
export function countryFlag(isoCode: string): string {
  const upper = isoCode.toUpperCase();
  return (
    String.fromCodePoint(0x1f1e6 + upper.codePointAt(0)! - 65) +
    String.fromCodePoint(0x1f1e6 + upper.codePointAt(1)! - 65)
  );
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
  if (COUNTRY_CODES[first] && parts.length >= 2 && TYPE_CODES[parts[1]]) {
    const country = COUNTRY_CODES[first];
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
      const period = formatPeriod(parts.slice(2));
      return [second, type, ...(period ? [period] : [])].join(" · ");
    }
    // Legacy: {TYPE}_{PERIOD} (no country token)
    const period = formatPeriod(parts.slice(1));
    return [type, ...(period ? [period] : [])].join(" · ");
  }

  return name;
}
