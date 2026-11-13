import { supabase } from "../auth";
import { APIError } from "../types/common";

export type TariffFuel = "gas" | "electricity";

export interface EurostatPrice {
  geo: string;
  period: string;
  value: number | null;
}

export interface EurostatQualityFlag {
  geo: string;
  period: string;
  status: "open" | "accepted" | "rejected";
}

export interface EurostatTariffData {
  prices: EurostatPrice[];
  flags: EurostatQualityFlag[];
}

// Household D2 gas (gross kWh) and DC electricity, including all taxes.
const TARIFF_SERIES = {
  gas: { dataset: "nrg_pc_202", siec: "G3000", band: "GJ20-199" },
  electricity: { dataset: "nrg_pc_204", siec: "E7000", band: "KWH2500-4999" },
};

async function readTariffRows<T>(
  fuel: TariffFuel,
  table: "eurostat_latest" | "eurostat_quality_flags",
  columns: string,
  signal: AbortSignal,
): Promise<T[]> {
  const series = TARIFF_SERIES[fuel];
  const rows: T[] = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error, status } = await supabase
      .from(table)
      .select(columns)
      .eq("dataset_code", series.dataset)
      .contains("dimensions", {
        freq: "S",
        siec: series.siec,
        nrg_cons: series.band,
        unit: "KWH",
        tax: "I_TAX",
        currency: "EUR",
      })
      .order("id")
      .range(offset, offset + pageSize - 1)
      .abortSignal(signal);

    if (error) {
      const failure = new APIError(status, error.message);
      failure.cause = error;
      throw failure;
    }

    rows.push(...(data as unknown as T[]));
    if (data.length < pageSize) return rows;
  }
}

export async function loadEurostatTariffData(
  fuel: TariffFuel,
  signal: AbortSignal,
): Promise<EurostatTariffData> {
  const [prices, flags] = await Promise.all([
    readTariffRows<EurostatPrice>(
      fuel,
      "eurostat_latest",
      "geo, period, value",
      signal,
    ),
    readTariffRows<EurostatQualityFlag>(
      fuel,
      "eurostat_quality_flags",
      "geo, period, status",
      signal,
    ),
  ]);
  return { prices, flags };
}
