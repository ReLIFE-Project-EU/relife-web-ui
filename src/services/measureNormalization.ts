import type { RenovationMeasureId } from "../types/renovation";

export function getMeasureSelectionState(
  measureId: RenovationMeasureId,
  selectedIds: readonly RenovationMeasureId[],
  eligibleIds: readonly RenovationMeasureId[],
) {
  const isSelected = selectedIds.includes(measureId);
  const isAnalysisEligible = eligibleIds.includes(measureId);
  const mutuallyExclusiveDisabled =
    !isSelected &&
    ((measureId === "condensing-boiler" &&
      selectedIds.includes("air-water-heat-pump")) ||
      (measureId === "air-water-heat-pump" &&
        selectedIds.includes("condensing-boiler")));
  return {
    isSelected,
    isAnalysisEligible,
    mutuallyExclusiveDisabled,
    disabled: !isAnalysisEligible || mutuallyExclusiveDisabled,
  };
}

/**
 * Heat pump and condensing boiler share the same server-side generation slot.
 * Prefer the heat pump when both appear in an imported or overridden selection.
 */
export function normalizeSystemSelection(
  measureIds: readonly RenovationMeasureId[],
): RenovationMeasureId[] {
  const hasHeatPump = measureIds.includes("air-water-heat-pump");
  const hasBoiler = measureIds.includes("condensing-boiler");

  if (hasHeatPump && hasBoiler) {
    console.warn(
      "Dropping 'condensing-boiler' because it is mutually exclusive with 'air-water-heat-pump'",
    );
    return measureIds.filter((id) => id !== "condensing-boiler");
  }

  return [...measureIds];
}
