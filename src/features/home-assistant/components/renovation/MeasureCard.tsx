import type { RenovationMeasureId } from "../../context/types";
import type { RenovationMeasure } from "../../services";
import { RenovationMeasureCard } from "../../../../components/shared/RenovationMeasureCard";

interface MeasureCardProps {
  measure: RenovationMeasure;
  isSelected: boolean;
  onToggle: (measureId: RenovationMeasureId) => void;
  disabled?: boolean;
}

export function MeasureCard({
  measure,
  isSelected,
  onToggle,
  disabled,
}: MeasureCardProps) {
  return (
    <RenovationMeasureCard
      measure={measure}
      isSelected={isSelected}
      onToggle={onToggle}
      disabled={disabled}
    />
  );
}
