import type { EurostatGasPrice, EurostatGasQualityFlag } from "../api/eurostat";
import { getCountryCode, getCountryDisplayName } from "../utils/countries";
import { auditLog, type AuditCtx } from "../utils/auditLogger";
import { formatFixed } from "../utils/formatters";
import { ENERGY_TARIFF_DEFAULTS } from "./carrierSavingsService";

export interface GasReference {
  eurPerKwh: number;
  source: "eurostat" | "planning-default";
  geo: string | null;
  countryName: string | null;
  periods: string[];
  fallback: "multiple-countries" | "no-country-price" | "load-failed" | null;
}

export interface GasTariff {
  eurPerKwh: number;
  reference: GasReference;
  isUserValue: boolean;
  isLoading: boolean;
}

export function planningGasReference(): GasReference {
  return {
    eurPerKwh: ENERGY_TARIFF_DEFAULTS.gasEurPerKwh,
    source: "planning-default",
    geo: null,
    countryName: null,
    periods: [],
    fallback: "load-failed",
  };
}

export function pickGasReference(
  prices: EurostatGasPrice[],
  flags: EurostatGasQualityFlag[],
  countries: string[],
): GasReference {
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
  let fallback: GasReference["fallback"] = multipleCountries
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
        !blocked.has(`${price.geo}:${price.period}`),
    )
    .sort((a, b) => b.period.localeCompare(a.period));
  if (geo !== "EU27_2020" && !usable.some((price) => price.geo === geo)) {
    geo = "EU27_2020";
    fallback = "no-country-price";
  }
  const selected = usable.filter((price) => price.geo === geo).slice(0, 2);

  if (selected.length === 0) return planningGasReference();

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

export function gasTariffDescription(tariff: GasTariff): string {
  if (tariff.isLoading) return "Loading Eurostat reference gas price...";
  const { reference } = tariff;
  const eurostat = reference.source === "eurostat";
  const location =
    reference.geo === "EU27_2020" ? "EU average" : reference.countryName;
  if (tariff.isUserValue) {
    const price = `${formatFixed(reference.eurPerKwh, 3)} €/kWh`;
    return eurostat
      ? `Your value. Eurostat reference: ${price} (${location}, ${periodLabel(reference.periods)}).`
      : `Your value. Planning default: ${price}. Eurostat prices could not be loaded.`;
  }
  if (!eurostat)
    return "Planning default. Eurostat prices could not be loaded.";

  const note =
    reference.geo === "EU27_2020"
      ? `Eurostat EU average, ${periodLabel(reference.periods)}.`
      : `Eurostat household price for ${reference.countryName}, ${periodLabel(reference.periods)}.`;
  if (reference.fallback === "multiple-countries") {
    return `${note} Your buildings are in more than one country.`;
  }
  if (reference.fallback === "no-country-price") {
    return `${note} Eurostat has no gas price for ${reference.countryName}.`;
  }
  return note;
}

export function logGasTariff(
  eurPerKwh: number,
  reference: GasReference | undefined,
  auditCtx?: AuditCtx,
): void {
  const data = { eurPerKwh, reference };
  auditLog.info("financial", "gas-tariff.selected", data, auditCtx);
  if (reference?.fallback) {
    auditLog.warn(
      "financial",
      "gas-tariff.fallback",
      { ...data, reason: reference.fallback },
      auditCtx,
    );
  }
}
