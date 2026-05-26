import type {
  ECMApplicationParams,
  ECMArchetypeParams,
  ECMCustomBuildingParams,
} from "../types/forecasting";
import type { RenovationMeasureId } from "../types/renovation";
import { PV_DEFAULTS, pvKwpFromFloorArea } from "./pvConfig.ts";

const U_VALUE_TARGETS: Partial<Record<RenovationMeasureId, number>> = {
  "wall-insulation": 0.25,
  "roof-insulation": 0.2,
  "floor-insulation": 0.25,
  windows: 1.4,
};

export const MEASURE_TO_ELEMENT: Partial<Record<RenovationMeasureId, string>> =
  {
    "wall-insulation": "wall",
    "roof-insulation": "roof",
    "floor-insulation": "slab",
    windows: "window",
  };

export const PV_MEASURE_ID: RenovationMeasureId = "pv";

const DEFAULT_HEAT_PUMP_COP = 3.2;

export type BuildECMParamsContext =
  | {
      kind: "archetype";
      archetype: {
        country: string;
        category: string;
        name: string;
      };
      floorArea: number | null;
    }
  | {
      kind: "custom";
      modifiedBui: unknown;
      modifiedSystem?: unknown;
      floorArea: number | null;
    };

export function buildECMParams(
  measureIds: readonly RenovationMeasureId[],
  context: BuildECMParamsContext,
): ECMApplicationParams {
  const elements = measureIds
    .map((measureId) => MEASURE_TO_ELEMENT[measureId])
    .filter((element): element is string => element !== undefined)
    .join(",");

  const commonParams: Partial<ECMCustomBuildingParams & ECMArchetypeParams> =
    {};

  if (elements) {
    commonParams.scenario_elements = elements;
  }

  const hasEnvelope = measureIds.some(
    (measureId) => MEASURE_TO_ELEMENT[measureId] !== undefined,
  );
  const hasPv = measureIds.includes(PV_MEASURE_ID);
  const hasGenerationChange =
    measureIds.includes("condensing-boiler") ||
    measureIds.includes("air-water-heat-pump");

  if (hasPv) {
    const pvKwp = pvKwpFromFloorArea(context.floorArea);
    if (pvKwp === null) {
      throw new Error(
        "PV measure requires a valid archetype floor area on the estimation",
      );
    }
    commonParams.use_pv = true;
    commonParams.pv_kwp = pvKwp;
    commonParams.pv_tilt_deg = PV_DEFAULTS.tiltDeg;
    commonParams.pv_azimuth_deg = PV_DEFAULTS.azimuthDeg;
    commonParams.pv_use_pvgis = PV_DEFAULTS.usePvgis;
    commonParams.pv_pvgis_loss_percent = PV_DEFAULTS.pvgisLossPercent;
    commonParams.annual_pv_yield_kwh_per_kwp = PV_DEFAULTS.annualYieldKwhPerKwp;
  }

  if (hasGenerationChange && !hasEnvelope && !hasPv) {
    commonParams.include_baseline = true;
  }

  for (const measureId of measureIds) {
    if (measureId === "condensing-boiler") {
      commonParams.uni_generation_mode = "condensing_boiler";
    }
    if (measureId === "air-water-heat-pump") {
      commonParams.use_heat_pump = true;
      commonParams.heat_pump_cop = DEFAULT_HEAT_PUMP_COP;
    }

    const target = U_VALUE_TARGETS[measureId];
    if (target === undefined) {
      continue;
    }

    if (measureId === "wall-insulation") {
      commonParams.u_wall = target;
    }
    if (measureId === "roof-insulation") {
      commonParams.u_roof = target;
    }
    if (measureId === "floor-insulation") {
      commonParams.u_slab = target;
    }
    if (measureId === "windows") {
      commonParams.u_window = target;
    }
  }

  return context.kind === "custom"
    ? ({
        bui: context.modifiedBui,
        system: context.modifiedSystem,
        ...commonParams,
      } as ECMCustomBuildingParams)
    : ({
        category: context.archetype.category,
        country: context.archetype.country,
        name: context.archetype.name,
        ...commonParams,
      } as ECMArchetypeParams);
}
