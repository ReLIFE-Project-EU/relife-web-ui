import { relifeConcepts } from "../../../constants/relifeConcepts";
import { RENOVATION_MEASURES } from "../../../services/mock/data/renovationMeasures";
import { serializeCsv } from "../../../utils/csvExport";
import type { CalibrationResults } from "../hooks/useCalibration";
import {
  BUILDING_CASES,
  CALIBRATION_COUNTRIES,
  COST_PROBES,
  costCaseId,
} from "../referenceCases";

export type CalibrationTableKind = "costs" | "buildings" | "energy";
type CsvRow = Record<string, string | number | undefined>;

export function buildCalibrationCsv(
  kind: CalibrationTableKind,
  results: CalibrationResults,
  completedAt: Date,
): string {
  const timestamp = completedAt.toISOString();
  let rows: CsvRow[];
  let headers: string[];

  if (kind === "costs") {
    headers = [
      "Country",
      "Measure ID",
      "Renovation",
      "Reference action",
      "Quantity",
      "Quantity unit",
      "CAPEX (EUR)",
      "CAPEX per area (EUR/m²)",
      "Status",
      "Error",
      "Calculated at (UTC)",
    ];
    rows = COST_PROBES.flatMap((probe) =>
      CALIBRATION_COUNTRIES.map((country) => {
        const state = results.costs[costCaseId(country, probe)];
        const value = state?.status === "success" ? state.value : undefined;
        return {
          Country: country,
          "Measure ID": probe.measureId,
          Renovation: RENOVATION_MEASURES.find(
            (measure) => measure.id === probe.measureId,
          )!.name,
          "Reference action": probe.action.action,
          Quantity: probe.action.area_m2 ?? probe.action.capacity_kw,
          "Quantity unit":
            probe.action.area_m2 !== undefined
              ? "m²"
              : probe.measureId === "pv"
                ? "kWp"
                : "kW",
          "CAPEX (EUR)": value?.capex,
          "CAPEX per area (EUR/m²)": value?.euroPerM2,
          Status: state?.status ?? "not_run",
          Error: state?.status === "error" ? state.message : undefined,
          "Calculated at (UTC)": timestamp,
        };
      }),
    );
  } else {
    const contextHeaders = [
      "Country",
      "Construction period",
      "Archetype ID",
      "Building type",
      "Floor area (m²)",
      "Heating setpoint (°C)",
      "Cooling setpoint (°C)",
      "Latitude (degrees)",
      "Longitude (degrees)",
      "Weather source",
      "Building inputs status",
      "Building inputs error",
    ];
    const metricHeaders =
      kind === "buildings"
        ? [
            "Wall U-value (W/m²K)",
            "Roof U-value (W/m²K)",
            "Window U-value (W/m²K)",
            "Infiltration (air changes/hour)",
          ]
        : [
            "Heating demand (kWh/m²/year)",
            "Cooling demand (kWh/m²/year)",
            `${relifeConcepts["system-energy-consumption"].label} – delivered (kWh/m²/year)`,
            `${relifeConcepts["primary-energy"].label} (kWh/m²/year)`,
          ];
    headers = [
      ...contextHeaders,
      ...metricHeaders,
      ...(kind === "energy" ? ["Energy status", "Energy error"] : []),
      "Calculated at (UTC)",
    ];
    rows = BUILDING_CASES.map((reference) => {
      const buildingState = results.buildings[reference.name];
      const building =
        buildingState?.status === "success" ? buildingState.value : undefined;
      const energyState = results.energy[reference.name];
      const energy =
        energyState?.status === "success" ? energyState.value : undefined;
      const row: CsvRow = {
        Country: reference.country,
        "Construction period":
          reference.period === "2011-now" ? "2011–present" : "1946–1969",
        "Archetype ID": reference.name,
        "Building type": "Single-family house",
        "Floor area (m²)": building?.floorArea,
        "Heating setpoint (°C)": building?.setpoints.heatingSetpoint,
        "Cooling setpoint (°C)": building?.setpoints.coolingSetpoint,
        "Latitude (degrees)": building?.location.lat,
        "Longitude (degrees)": building?.location.lng,
        "Weather source": building ? "PVGIS" : undefined,
        "Building inputs status": buildingState?.status ?? "not_run",
        "Building inputs error":
          buildingState?.status === "error" ? buildingState.message : undefined,
        "Calculated at (UTC)": timestamp,
      };
      if (kind === "buildings") {
        metricHeaders.forEach((header, index) => {
          row[header] = [
            building?.thermalProperties.wallUValue,
            building?.thermalProperties.roofUValue,
            building?.thermalProperties.windowUValue,
            building?.bui.building_parameters.airflow_rates.infiltration_rate,
          ][index];
        });
      } else {
        metricHeaders.forEach((header, index) => {
          row[header] = [
            energy?.heating,
            energy?.cooling,
            energy?.delivered,
            energy?.primary,
          ][index];
        });
        row["Energy status"] = energyState?.status ?? "not_run";
        row["Energy error"] =
          energyState?.status === "error" ? energyState.message : undefined;
      }
      return row;
    });
  }

  return serializeCsv(
    rows,
    headers.map((header) => ({
      key: header,
      header,
      value: (row) => row[header],
    })),
  );
}
