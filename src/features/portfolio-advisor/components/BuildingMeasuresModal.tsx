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
} from "@mantine/core";
import { IconArrowBackUp } from "@tabler/icons-react";
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
  const rankableMeasures = renovation
    .getRankableMeasures()
    .map((measure) => measure.id);
  const localNonRankableMeasures = localMeasures.filter(
    (measureId) =>
      renovation.getMeasure(measureId)?.isSupported &&
      !rankableMeasures.includes(measureId),
  );
  const hasRankableMeasure = localMeasures.some((measureId) =>
    rankableMeasures.includes(measureId),
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
        color={localNonRankableMeasures.length > 0 ? "yellow" : "blue"}
        mb="lg"
      >
        This workflow currently analyzes envelope measures only: wall, roof,
        floor, and windows.
        {localNonRankableMeasures.length > 0 && (
          <>
            {" "}
            The following selected measures are excluded from the current
            analysis:{" "}
            <Text span fw={700}>
              {localNonRankableMeasures
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
              {measures.map((measure) => (
                <Checkbox
                  key={measure.id}
                  label={measure.name}
                  checked={localMeasures.includes(measure.id)}
                  onChange={() => handleToggle(measure.id)}
                  disabled={!measure.isSupported}
                  description={!measure.isSupported ? "Coming soon" : undefined}
                />
              ))}
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
            disabled={localMeasures.length === 0 || !hasRankableMeasure}
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
