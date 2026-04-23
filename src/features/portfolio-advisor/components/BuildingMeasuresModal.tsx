/**
 * Modal for selecting per-building renovation measures.
 * Uses simple checkboxes grouped by category for a lightweight UI.
 */

import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Group,
  Modal,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { IconArrowBackUp } from "@tabler/icons-react";
import { measureEffectProfiles } from "../../../constants/relifeConcepts";
import type { RenovationMeasureId } from "../../../types/renovation";
import type { PRABuilding } from "../context/types";
import { usePortfolioAdvisorServices } from "../hooks/usePortfolioAdvisorServices";

interface BuildingMeasuresModalProps {
  building: PRABuilding | null;
  opened: boolean;
  onClose: () => void;
  onSave: (buildingId: string, measures: RenovationMeasureId[]) => void;
  onReset: (buildingId: string) => void;
  globalMeasures: RenovationMeasureId[];
}

/**
 * Inner content rendered with a key tied to building.id so React
 * resets local state each time a different building is selected.
 */
function ModalContent({
  building,
  onClose,
  onSave,
  onReset,
  globalMeasures,
}: Omit<BuildingMeasuresModalProps, "opened">) {
  const { renovation } = usePortfolioAdvisorServices();

  const initialMeasures = building?.selectedMeasures ?? [...globalMeasures];
  const [localMeasures, setLocalMeasures] =
    useState<RenovationMeasureId[]>(initialMeasures);
  const hasHeatPump = localMeasures.includes("air-water-heat-pump");
  const hasBoiler = localMeasures.includes("condensing-boiler");
  const analysisEligibleMeasures = renovation
    .getAnalysisEligibleMeasures()
    .map((measure) => measure.id);
  const rankableMeasures = renovation
    .getRankableMeasures()
    .map((measure) => measure.id);
  const localAnalysisEligibleButNonRankableMeasures = localMeasures.filter(
    (measureId) =>
      analysisEligibleMeasures.includes(measureId) &&
      !rankableMeasures.includes(measureId),
  );
  const localUnsupportedMeasures = localMeasures.filter(
    (measureId) => !analysisEligibleMeasures.includes(measureId),
  );
  const hasAnalysisEligibleMeasure = localMeasures.some((measureId) =>
    analysisEligibleMeasures.includes(measureId),
  );

  const handleToggle = (measureId: RenovationMeasureId) => {
    setLocalMeasures((prev) =>
      prev.includes(measureId)
        ? prev.filter((id) => id !== measureId)
        : [...prev, measureId],
    );
  };

  const handleSave = () => {
    if (building) {
      onSave(building.id, localMeasures);
      onClose();
    }
  };

  const handleReset = () => {
    if (building) {
      onReset(building.id);
      onClose();
    }
  };

  const categorizedMeasures = renovation.getCategories().map((cat) => ({
    cat,
    measures: renovation.getMeasuresByCategory(cat.id),
  }));

  const hasOverride = building?.selectedMeasures != null;

  return (
    <>
      <Text size="sm" c="dimmed" mb="lg">
        Select renovation measures for this building. These will override the
        portfolio-level selection.
      </Text>

      <Alert
        color={
          localUnsupportedMeasures.length > 0 ||
          localAnalysisEligibleButNonRankableMeasures.length > 0
            ? "yellow"
            : "blue"
        }
        mb="lg"
      >
        This workflow can analyze envelope measures, condensing-boiler,
        air-water heat-pump, and photovoltaic panels. Only envelope scenarios
        participate in ranking.
        {localAnalysisEligibleButNonRankableMeasures.length > 0 && (
          <>
            {" "}
            The following selected non-envelope measures will be analyzed, but
            excluded from ranking:{" "}
            <Text span fw={700}>
              {localAnalysisEligibleButNonRankableMeasures
                .map((measureId) => renovation.getMeasure(measureId)?.name)
                .join(", ")}
            </Text>
            .
          </>
        )}
        {localUnsupportedMeasures.length > 0 && (
          <>
            {" "}
            The following selected measures are still excluded from analysis:{" "}
            <Text span fw={700}>
              {localUnsupportedMeasures
                .map((measureId) => renovation.getMeasure(measureId)?.name)
                .join(", ")}
            </Text>
            .
          </>
        )}
      </Alert>

      <Stack gap="md">
        {categorizedMeasures.map(({ cat, measures }) => (
          <Box key={cat.id}>
            <Title order={5} tt="uppercase" c="dimmed" size="sm" mb="xs">
              {cat.label}
            </Title>
            <Stack gap="xs">
              {measures.map((measure) => {
                const isSelected = localMeasures.includes(measure.id);
                const isAnalysisEligible = analysisEligibleMeasures.includes(
                  measure.id,
                );
                const mutuallyExclusiveDisabled =
                  !isSelected &&
                  ((measure.id === "condensing-boiler" && hasHeatPump) ||
                    (measure.id === "air-water-heat-pump" && hasBoiler));

                return (
                  <Tooltip
                    key={measure.id}
                    label="Mutually exclusive with the selected heating system"
                    disabled={!mutuallyExclusiveDisabled}
                    multiline
                  >
                    <Box>
                      <Checkbox
                        label={measure.name}
                        checked={isSelected}
                        onChange={() => handleToggle(measure.id)}
                        disabled={
                          !isAnalysisEligible || mutuallyExclusiveDisabled
                        }
                        description={
                          isAnalysisEligible
                            ? measureEffectProfiles[measure.id].summary
                            : "Coming soon"
                        }
                      />
                    </Box>
                  </Tooltip>
                );
              })}
            </Stack>
          </Box>
        ))}
      </Stack>

      <Group justify="space-between" mt="xl">
        <Button
          variant="subtle"
          color="gray"
          leftSection={<IconArrowBackUp size={16} />}
          onClick={handleReset}
          disabled={!hasOverride}
        >
          Reset to Portfolio Default
        </Button>
        <Group>
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={localMeasures.length === 0 || !hasAnalysisEligibleMeasure}
          >
            Save
          </Button>
        </Group>
      </Group>
    </>
  );
}

export function BuildingMeasuresModal({
  building,
  opened,
  onClose,
  onSave,
  onReset,
  globalMeasures,
}: BuildingMeasuresModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Title order={4}>Measures for {building?.name ?? "Building"}</Title>
      }
      size="md"
    >
      {building && (
        <ModalContent
          key={building.id}
          building={building}
          onClose={onClose}
          onSave={onSave}
          onReset={onReset}
          globalMeasures={globalMeasures}
        />
      )}
    </Modal>
  );
}
