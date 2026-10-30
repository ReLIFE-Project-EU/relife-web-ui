import { supabase } from "../auth";
import { APIError } from "../types/common";

export interface EurostatGasPrice {
  geo: string;
  period: string;
  value: number | null;
}

export interface EurostatGasQualityFlag {
  geo: string;
  period: string;
  status: "open" | "accepted" | "rejected";
}

export interface EurostatGasData {
  prices: EurostatGasPrice[];
  flags: EurostatGasQualityFlag[];
}

// The household D2 series ingested by the data layer: EUR per gross kWh,
// including all taxes. Apply the same dimensions to prices and review flags.
const GAS_DIMENSIONS = {
  freq: "S",
  siec: "G3000",
  nrg_cons: "GJ20-199",
  unit: "KWH",
  tax: "I_TAX",
  currency: "EUR",
};

async function readGasRows<T>(
  table: "eurostat_latest" | "eurostat_quality_flags",
  columns: string,
  signal: AbortSignal,
): Promise<T[]> {
  const rows: T[] = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error, status } = await supabase
      .from(table)
      .select(columns)
      .eq("dataset_code", "nrg_pc_202")
      .contains("dimensions", GAS_DIMENSIONS)
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

export async function loadEurostatGasData(
  signal: AbortSignal,
): Promise<EurostatGasData> {
  const [prices, flags] = await Promise.all([
    readGasRows<EurostatGasPrice>(
      "eurostat_latest",
      "geo, period, value",
      signal,
    ),
    readGasRows<EurostatGasQualityFlag>(
      "eurostat_quality_flags",
      "geo, period, status",
      signal,
    ),
  ]);
  return { prices, flags };
}
