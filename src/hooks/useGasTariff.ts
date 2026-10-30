import { useEffect, useState } from "react";
import { loadEurostatGasData, type EurostatGasData } from "../api/eurostat";
import { APIError } from "../types/common";
import { auditLog } from "../utils/auditLogger";
import {
  pickGasReference,
  planningGasReference,
  type GasTariff,
} from "../services/gasTariffService";

/** One reference-data load per wizard; country selection stays synchronous. */
export function useGasTariff(
  countries: string[],
  userValue: number | null,
): GasTariff {
  // Undefined is loading; null is a failed read.
  const [data, setData] = useState<EurostatGasData | null>();

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    const timeout = window.setTimeout(() => controller.abort(), 15_000);
    loadEurostatGasData(controller.signal)
      .then((loaded) => {
        if (!cancelled) setData(loaded);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        auditLog.error("api", "gas-tariff.load.failed", {
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
  }, []);

  const reference = data
    ? pickGasReference(data.prices, data.flags, countries)
    : planningGasReference();
  return {
    eurPerKwh: userValue ?? reference.eurPerKwh,
    reference,
    isUserValue: userValue !== null,
    isLoading: data === undefined,
  };
}
