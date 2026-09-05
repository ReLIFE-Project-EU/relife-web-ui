import { Box, SimpleGrid, Stack, Text, Title, Tooltip } from "@mantine/core";
import { HEATING_SYSTEM_CONFLICT_MESSAGE } from "../../constants/relifeConcepts";
import { getMeasureSelectionState } from "../../services/measureNormalization";
import type {
  MeasureCategoryInfo,
  RenovationMeasure,
} from "../../services/types";
import type { RenovationMeasureId } from "../../types/renovation";
import { RenovationMeasureCard } from "./RenovationMeasureCard";

interface RenovationMeasureGridProps {
  categories: readonly MeasureCategoryInfo[];
  measures: readonly RenovationMeasure[];
  selectedIds: readonly RenovationMeasureId[];
  eligibleIds: readonly RenovationMeasureId[];
  onToggle: (measureId: RenovationMeasureId) => void;
  professional?: boolean;
}

export function RenovationMeasureGrid({
  categories,
  measures,
  selectedIds,
  eligibleIds,
  onToggle,
  professional = false,
}: RenovationMeasureGridProps) {
  return (
    <Stack gap="lg">
      {categories.map((category) => (
        <Box key={category.id}>
          <Title order={5} tt="uppercase" c="dimmed" size="sm" mb={2}>
            {category.label}
          </Title>
          <Text size="xs" c="dimmed" mb="sm">
            {category.description}
          </Text>
          <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} spacing="sm">
            {measures
              .filter((measure) => measure.category === category.id)
              .map((measure) => {
                const selection = getMeasureSelectionState(
                  measure.id,
                  selectedIds,
                  eligibleIds,
                );
                return (
                  <Tooltip
                    key={measure.id}
                    label={HEATING_SYSTEM_CONFLICT_MESSAGE}
                    disabled={!selection.mutuallyExclusiveDisabled}
                    multiline
                  >
                    <Box>
                      <RenovationMeasureCard
                        measure={
                          selection.isAnalysisEligible
                            ? { ...measure, isSupported: true }
                            : measure
                        }
                        isSelected={selection.isSelected}
                        disabled={selection.disabled}
                        onToggle={onToggle}
                        tooltipLabel={
                          professional
                            ? (measure.technicalDescription ??
                              measure.description)
                            : measure.description
                        }
                        tooltipWidth={professional ? 320 : 260}
                      />
                    </Box>
                  </Tooltip>
                );
              })}
          </SimpleGrid>
        </Box>
      ))}
    </Stack>
  );
}
