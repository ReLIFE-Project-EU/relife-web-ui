import type { RenovationMeasureId } from "../../../types/renovation";
import type { PRABuilding } from "../context/types";

export interface EffectiveBuildingSelection {
  name: string;
  measures: RenovationMeasureId[];
}

export interface PortfolioMeasureStatus {
  effectiveSelections: EffectiveBuildingSelection[];
  buildingsWithoutMeasures: EffectiveBuildingSelection[];
  buildingsWithoutRankableMeasures: EffectiveBuildingSelection[];
  hasValidSelections: boolean;
}

export function getPortfolioMeasureStatus(
  buildings: PRABuilding[],
  globalMeasures: RenovationMeasureId[],
  rankableMeasureIds: RenovationMeasureId[],
): PortfolioMeasureStatus {
  const rankableMeasureSet = new Set(rankableMeasureIds);
  const effectiveSelections = buildings.map((building) => ({
    name: building.name,
    measures: building.selectedMeasures ?? globalMeasures,
  }));

  const buildingsWithoutMeasures = effectiveSelections.filter(
    ({ measures }) => measures.length === 0,
  );
  const buildingsWithoutRankableMeasures = effectiveSelections.filter(
    ({ measures }) =>
      measures.length > 0 &&
      !measures.some((measureId) => rankableMeasureSet.has(measureId)),
  );

  return {
    effectiveSelections,
    buildingsWithoutMeasures,
    buildingsWithoutRankableMeasures,
    hasValidSelections:
      effectiveSelections.length > 0 &&
      buildingsWithoutMeasures.length === 0 &&
      buildingsWithoutRankableMeasures.length === 0,
  };
}
