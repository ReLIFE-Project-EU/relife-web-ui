export interface CountryReferenceLocation {
  lat: number;
  lng: number;
}

interface CountryDefinition {
  code: string;
  displayName: string;
  aliases: string[];
  referenceLocation: CountryReferenceLocation;
}

const COUNTRY_DEFINITIONS: CountryDefinition[] = [
  {
    code: "AT",
    displayName: "Austria",
    aliases: [],
    referenceLocation: { lat: 48.21, lng: 16.37 },
  },
  {
    code: "BE",
    displayName: "Belgium",
    aliases: [],
    referenceLocation: { lat: 50.85, lng: 4.35 },
  },
  {
    code: "BG",
    displayName: "Bulgaria",
    aliases: [],
    referenceLocation: { lat: 42.7, lng: 23.32 },
  },
  {
    code: "CY",
    displayName: "Cyprus",
    aliases: [],
    referenceLocation: { lat: 35.17, lng: 33.36 },
  },
  {
    code: "CZ",
    displayName: "Czechia",
    aliases: ["Czech Republic"],
    referenceLocation: { lat: 50.08, lng: 14.44 },
  },
  {
    code: "DE",
    displayName: "Germany",
    aliases: [],
    referenceLocation: { lat: 52.52, lng: 13.41 },
  },
  {
    code: "DK",
    displayName: "Denmark",
    aliases: [],
    referenceLocation: { lat: 55.68, lng: 12.57 },
  },
  {
    code: "EE",
    displayName: "Estonia",
    aliases: [],
    referenceLocation: { lat: 59.44, lng: 24.75 },
  },
  {
    code: "ES",
    displayName: "Spain",
    aliases: [],
    referenceLocation: { lat: 40.42, lng: -3.7 },
  },
  {
    code: "FI",
    displayName: "Finland",
    aliases: [],
    referenceLocation: { lat: 60.17, lng: 24.94 },
  },
  {
    code: "FR",
    displayName: "France",
    aliases: [],
    referenceLocation: { lat: 48.86, lng: 2.35 },
  },
  {
    code: "GR",
    displayName: "Greece",
    aliases: [],
    referenceLocation: { lat: 37.98, lng: 23.73 },
  },
  {
    code: "HR",
    displayName: "Croatia",
    aliases: [],
    referenceLocation: { lat: 45.81, lng: 15.98 },
  },
  {
    code: "HU",
    displayName: "Hungary",
    aliases: [],
    referenceLocation: { lat: 47.5, lng: 19.04 },
  },
  {
    code: "IE",
    displayName: "Ireland",
    aliases: [],
    referenceLocation: { lat: 53.33, lng: -6.26 },
  },
  {
    code: "IT",
    displayName: "Italy",
    aliases: [],
    referenceLocation: { lat: 41.9, lng: 12.5 },
  },
  {
    code: "LT",
    displayName: "Lithuania",
    aliases: [],
    referenceLocation: { lat: 54.69, lng: 25.28 },
  },
  {
    code: "LU",
    displayName: "Luxembourg",
    aliases: [],
    referenceLocation: { lat: 49.61, lng: 6.13 },
  },
  {
    code: "LV",
    displayName: "Latvia",
    aliases: [],
    referenceLocation: { lat: 56.95, lng: 24.11 },
  },
  {
    code: "MT",
    displayName: "Malta",
    aliases: [],
    referenceLocation: { lat: 35.9, lng: 14.51 },
  },
  {
    code: "NL",
    displayName: "Netherlands",
    aliases: [],
    referenceLocation: { lat: 52.37, lng: 4.89 },
  },
  {
    code: "PL",
    displayName: "Poland",
    aliases: [],
    referenceLocation: { lat: 52.23, lng: 21.01 },
  },
  {
    code: "PT",
    displayName: "Portugal",
    aliases: [],
    referenceLocation: { lat: 38.72, lng: -9.14 },
  },
  {
    code: "RO",
    displayName: "Romania",
    aliases: [],
    referenceLocation: { lat: 44.43, lng: 26.1 },
  },
  {
    code: "SE",
    displayName: "Sweden",
    aliases: [],
    referenceLocation: { lat: 59.33, lng: 18.07 },
  },
  {
    code: "SI",
    displayName: "Slovenia",
    aliases: [],
    referenceLocation: { lat: 46.06, lng: 14.51 },
  },
  {
    code: "SK",
    displayName: "Slovakia",
    aliases: [],
    referenceLocation: { lat: 48.15, lng: 17.11 },
  },
];

const COUNTRY_BY_CODE = new Map(
  COUNTRY_DEFINITIONS.map((country) => [country.code, country]),
);

const NAME_TO_CODE = new Map<string, string>();
for (const country of COUNTRY_DEFINITIONS) {
  NAME_TO_CODE.set(country.displayName.toLowerCase(), country.code);
  for (const alias of country.aliases) {
    NAME_TO_CODE.set(alias.toLowerCase(), country.code);
  }
}

export const CANONICAL_COUNTRY_REFERENCE_LOCATIONS: Record<
  string,
  CountryReferenceLocation
> = Object.fromEntries(
  COUNTRY_DEFINITIONS.map((country) => [
    country.displayName,
    country.referenceLocation,
  ]),
);

export function getCountryCode(
  countryNameOrCode?: string | null,
): string | undefined {
  if (!countryNameOrCode) return undefined;

  const trimmed = countryNameOrCode.trim();
  if (!trimmed) return undefined;

  const upper = trimmed.toUpperCase();
  if (COUNTRY_BY_CODE.has(upper)) {
    return upper;
  }

  return NAME_TO_CODE.get(trimmed.toLowerCase());
}

export function getCountryDisplayName(
  countryNameOrCode?: string | null,
): string | undefined {
  const code = getCountryCode(countryNameOrCode);
  if (!code) return undefined;
  return COUNTRY_BY_CODE.get(code)?.displayName;
}

export function getCountryDisplayNameByCode(
  countryCode?: string | null,
): string | undefined {
  if (!countryCode) return undefined;
  return COUNTRY_BY_CODE.get(countryCode.toUpperCase())?.displayName;
}

export function normalizeCountryName(
  countryName?: string | null,
): string | undefined {
  const canonical = getCountryDisplayName(countryName);
  if (canonical) {
    return canonical;
  }

  const trimmed = countryName?.trim();
  return trimmed || undefined;
}

export function countryNamesEqual(
  left?: string | null,
  right?: string | null,
): boolean {
  if (!left || !right) return false;

  const leftCode = getCountryCode(left);
  const rightCode = getCountryCode(right);
  if (leftCode && rightCode) {
    return leftCode === rightCode;
  }

  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

export function getCountryReferenceLocation(
  countryNameOrCode?: string | null,
): CountryReferenceLocation | undefined {
  const code = getCountryCode(countryNameOrCode);
  if (!code) return undefined;
  return COUNTRY_BY_CODE.get(code)?.referenceLocation;
}

export function getCountryFlag(
  countryNameOrCode?: string | null,
): string | undefined {
  const code = getCountryCode(countryNameOrCode);
  if (!code || !/^[A-Z]{2}$/.test(code)) {
    return undefined;
  }

  return (
    String.fromCodePoint(0x1f1e6 + code.codePointAt(0)! - 65) +
    String.fromCodePoint(0x1f1e6 + code.codePointAt(1)! - 65)
  );
}

export function listCanonicalCountries(): string[] {
  return COUNTRY_DEFINITIONS.map((country) => country.displayName);
}
