import type { RenovationMeasureId } from "../../../types/renovation";
import type { PRABuilding } from "../context/types";

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
