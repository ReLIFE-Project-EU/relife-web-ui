import { useEffect, useState } from "react";
import {
  loadEurostatTariffData,
  type EurostatTariffData,
  type TariffFuel,
} from "../api/eurostat";
import { APIError } from "../types/common";
import { auditLog } from "../utils/auditLogger";
import {
  pickTariffReference,
  fallbackTariffReference,
  type EnergyTariff,
} from "../services/energyTariffService";

/** One reference-data load per wizard; country selection stays synchronous. */
export function useEnergyTariff(
  fuel: TariffFuel,
  countries: string[],
  userValue: number | null,
): EnergyTariff {
  // Undefined is loading; null is a failed read.
  const [data, setData] = useState<EurostatTariffData | null>();

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    const timeout = window.setTimeout(() => controller.abort(), 15_000);
    loadEurostatTariffData(fuel, controller.signal)
      .then((loaded) => {
        if (!cancelled) setData(loaded);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        auditLog.error("api", `${fuel}-tariff.load.failed`, {
          message:
            error instanceof Error
              ? error.message
              : "Eurostat prices could not be loaded.",
          status: error instanceof APIError ? error.status : undefined,
        });
        setData(null);
      })
      .finally(() => window.clearTimeout(timeout));
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [fuel]);

  const defaultReference = fallbackTariffReference(fuel);
  const reference = data
    ? pickTariffReference(fuel, data.prices, data.flags, countries)
    : defaultReference;
  return {
    eurPerKwh: userValue ?? reference.eurPerKwh,
    reference,
    isUserValue: userValue !== null,
    isLoading: data === undefined,
  };
}
