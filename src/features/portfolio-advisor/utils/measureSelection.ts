import type {
  RenovationMeasureId,
  RenovationSelections,
} from "../../../types/renovation";
import type { PRABuilding } from "../context/types";

export interface CostOverrideValidity {
  capexInvalid: boolean;
  maintenanceInvalid: boolean;
}

/**
 * Validate the optional global cost overrides. A blank field (`null`) is valid
 * — it falls back to the Financial API reference-data lookup during analysis.
 * A present value must be a positive CAPEX / non-negative maintenance cost;
 * otherwise it would survive cost precedence and fail later in the pipeline.
 */
export function getCostOverrideValidity(
  renovation: Pick<
    RenovationSelections,
    "estimatedCapex" | "estimatedMaintenanceCost"
  >,
): CostOverrideValidity {
  return {
    capexInvalid:
      renovation.estimatedCapex !== null && !(renovation.estimatedCapex > 0),
    maintenanceInvalid:
      renovation.estimatedMaintenanceCost !== null &&
      renovation.estimatedMaintenanceCost < 0,
  };
}

export interface EffectiveBuildingSelection {
  name: string;
  measures: RenovationMeasureId[];
}

export interface PortfolioMeasureStatus {
  effectiveSelections: EffectiveBuildingSelection[];
  buildingsWithoutMeasures: EffectiveBuildingSelection[];
  buildingsWithoutAnalysisEligibleMeasures: EffectiveBuildingSelection[];
  hasValidSelections: boolean;
}

export function getPortfolioMeasureStatus(
  buildings: PRABuilding[],
  globalMeasures: RenovationMeasureId[],
  analysisEligibleMeasureIds: RenovationMeasureId[],
): PortfolioMeasureStatus {
  const analysisEligibleMeasureSet = new Set(analysisEligibleMeasureIds);
  const effectiveSelections = buildings.map((building) => ({
    name: building.name,
    measures: building.selectedMeasures ?? globalMeasures,
  }));

  const buildingsWithoutMeasures = effectiveSelections.filter(
    ({ measures }) => measures.length === 0,
  );
  const buildingsWithoutAnalysisEligibleMeasures = effectiveSelections.filter(
    ({ measures }) =>
      measures.length > 0 &&
      !measures.some((measureId) => analysisEligibleMeasureSet.has(measureId)),
  );

  return {
    effectiveSelections,
    buildingsWithoutMeasures,
    buildingsWithoutAnalysisEligibleMeasures,
    hasValidSelections:
      effectiveSelections.length > 0 &&
      buildingsWithoutMeasures.length === 0 &&
      buildingsWithoutAnalysisEligibleMeasures.length === 0,
  };
}
