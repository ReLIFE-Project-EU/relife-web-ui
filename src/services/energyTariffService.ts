import type {
  EurostatPrice,
  EurostatQualityFlag,
  TariffFuel,
} from "../api/eurostat";
import { getCountryCode, getCountryDisplayName } from "../utils/countries";
import { auditLog, type AuditCtx } from "../utils/auditLogger";
import { formatFixed } from "../utils/formatters";
import { ENERGY_TARIFF_DEFAULTS } from "./carrierSavingsService";

export interface EnergyTariffOverrides {
  gasTariffEurPerKwh: number | null;
  electricityTariffEurPerKwh: number | null;
}

export interface TariffReference {
  eurPerKwh: number | null;
  source: "eurostat" | "planning-default" | "unavailable";
  geo: string | null;
  countryName: string | null;
  periods: string[];
  fallback: "multiple-countries" | "no-country-price" | "load-failed" | null;
}

export interface EnergyTariff {
  eurPerKwh: number | null;
  reference: TariffReference;
  isUserValue: boolean;
  isLoading: boolean;
}

export function fallbackTariffReference(fuel: TariffFuel): TariffReference {
  return {
    eurPerKwh: fuel === "gas" ? ENERGY_TARIFF_DEFAULTS.gasEurPerKwh : null,
    source: fuel === "gas" ? "planning-default" : "unavailable",
    geo: null,
    countryName: null,
    periods: [],
    fallback: "load-failed",
  };
}

export function pickTariffReference(
  fuel: TariffFuel,
  prices: EurostatPrice[],
  flags: EurostatQualityFlag[],
  countries: string[],
): TariffReference {
  const codes = [
    ...new Set(
      countries.map(
        (country) =>
          getCountryCode(country.toUpperCase() === "EL" ? "GR" : country) ??
          country,
      ),
    ),
  ];
  const country = countries[0];
  const code = codes[0];
  const multipleCountries = codes.length > 1;
  let geo =
    multipleCountries || !code ? "EU27_2020" : code === "GR" ? "EL" : code;
  let fallback: TariffReference["fallback"] = multipleCountries
    ? "multiple-countries"
    : null;
  const blocked = new Set(
    flags
      .filter((flag) => flag.status !== "accepted")
      .map((flag) => `${flag.geo}:${flag.period}`),
  );
  const usable = prices
    .filter(
      (price) =>
        price.value !== null &&
        Number.isFinite(price.value) &&
        price.value > 0 &&
        !blocked.has(`${price.geo}:${price.period}`),
    )
    .sort((a, b) => b.period.localeCompare(a.period));
  if (geo !== "EU27_2020" && !usable.some((price) => price.geo === geo)) {
    geo = "EU27_2020";
    fallback = "no-country-price";
  }
  const selected = usable.filter((price) => price.geo === geo).slice(0, 2);

  if (selected.length === 0) return fallbackTariffReference(fuel);

  return {
    eurPerKwh:
      selected.reduce((sum, price) => sum + price.value!, 0) / selected.length,
    source: "eurostat",
    geo: selected[0].geo,
    countryName: getCountryDisplayName(code) ?? country ?? null,
    periods: selected.map((price) => price.period).reverse(),
    fallback,
  };
}

function halfYearLabel(period: string): string {
  const [year, half] = period.split("-S");
  return `${half === "1" ? "January to June" : "July to December"} ${year}`;
}

function periodLabel(periods: string[]): string {
  if (periods.length === 1) return halfYearLabel(periods[0]);
  const [first, last] = periods;
  const [firstYear, firstHalf] = first.split("-S").map(Number);
  const [lastYear, lastHalf] = last.split("-S").map(Number);
  const consecutive = (lastYear - firstYear) * 2 + lastHalf - firstHalf === 1;
  if (!consecutive) return periods.map(halfYearLabel).join(" and ");
  return firstYear === lastYear
    ? `January to December ${firstYear}`
    : `July ${firstYear} to June ${lastYear}`;
}

export function tariffDescription(
  fuel: TariffFuel,
  tariff: EnergyTariff,
): string {
  const prefix = tariff.isUserValue ? "Your value. " : "";
  if (tariff.isLoading)
    return `${prefix}Loading Eurostat reference ${fuel} price...`;
  const { reference } = tariff;
  const eurostat = reference.source === "eurostat";
  const location =
    reference.geo === "EU27_2020" ? "EU average" : reference.countryName;
  if (!eurostat || reference.eurPerKwh === null)
    return `${prefix}${reference.source === "planning-default" ? "Planning default. " : ""}Eurostat reference unavailable.`;

  const note = tariff.isUserValue
    ? `${prefix}Eurostat reference: ${formatFixed(reference.eurPerKwh, 3)} €/kWh (${location}, ${periodLabel(reference.periods)}).`
    : reference.geo === "EU27_2020"
      ? `Eurostat EU average, ${periodLabel(reference.periods)}.`
      : `Eurostat household price for ${reference.countryName}, ${periodLabel(reference.periods)}.`;
  if (reference.fallback === "multiple-countries") {
    return `${note} Your buildings are in more than one country.`;
  }
  if (reference.fallback === "no-country-price") {
    return `${note} Eurostat has no ${fuel} price for ${reference.countryName}.`;
  }
  return note;
}

export function logEnergyTariff(
  fuel: TariffFuel,
  eurPerKwh: number | undefined,
  reference: TariffReference | undefined,
  auditCtx?: AuditCtx,
): void {
  const data = {
    eurPerKwh: eurPerKwh ?? fallbackTariffReference(fuel).eurPerKwh,
    reference,
  };
  auditLog.info("financial", `${fuel}-tariff.selected`, data, auditCtx);
  if (reference?.fallback) {
    auditLog.warn(
      "financial",
      `${fuel}-tariff.fallback`,
      { ...data, reason: reference.fallback },
      auditCtx,
    );
  }
}
