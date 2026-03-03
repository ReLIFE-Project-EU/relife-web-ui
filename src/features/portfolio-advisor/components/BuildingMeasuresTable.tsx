/**
 * Table showing per-building measure override status.
 * Allows customizing or resetting measures per building.
 */

import { useState, useCallback } from "react";
import {
  ActionIcon,
  Badge,
  Card,
  Group,
  Table,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconArrowBackUp, IconSettings } from "@tabler/icons-react";
import type { RenovationMeasureId } from "../../../types/renovation";
import type { PRABuilding } from "../context/types";
import { usePortfolioAdvisor } from "../hooks/usePortfolioAdvisor";
import { BuildingMeasuresModal } from "./BuildingMeasuresModal";

export function BuildingMeasuresTable() {
  const { state, dispatch } = usePortfolioAdvisor();
  const [opened, { open, close }] = useDisclosure(false);
  const [selectedBuilding, setSelectedBuilding] = useState<PRABuilding | null>(
    null,
  );

  const handleCustomize = useCallback(
    (building: PRABuilding) => {
      setSelectedBuilding(building);
      open();
    },
    [open],
  );

  const handleSave = useCallback(
    (buildingId: string, measures: RenovationMeasureId[]) => {
      dispatch({ type: "SET_BUILDING_MEASURES", buildingId, measures });
    },
    [dispatch],
  );

  const handleReset = useCallback(
    (buildingId: string) => {
      dispatch({
        type: "SET_BUILDING_MEASURES",
        buildingId,
        measures: undefined,
      });
    },
    [dispatch],
  );

  if (state.buildings.length === 0) return null;

  const globalMeasureCount = state.renovation.selectedMeasures.length;
  const overrideCount = state.buildings.filter(
    (b) => b.selectedMeasures != null,
  ).length;

  return (
    <>
      <Card withBorder radius="md" p="lg">
        <Group justify="space-between" mb="md">
          <div>
            <Title order={4}>Per-Building Measures</Title>
            <Text size="sm" c="dimmed" mt={4}>
              Optionally customize renovation measures for individual buildings.
              Buildings without overrides use the portfolio selection above.
            </Text>
          </div>
          {overrideCount > 0 && (
            <Badge color="blue" variant="light" size="lg">
              {overrideCount} custom
            </Badge>
          )}
        </Group>

        <Table highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Building</Table.Th>
              <Table.Th>Measures</Table.Th>
              <Table.Th w={100}>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {state.buildings.map((building) => {
              const hasOverride = building.selectedMeasures != null;
              const measureCount = hasOverride
                ? building.selectedMeasures!.length
                : globalMeasureCount;

              return (
                <Table.Tr key={building.id}>
                  <Table.Td>
                    <Text size="sm" fw={500}>
                      {building.name}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    {hasOverride ? (
                      <Badge color="blue" variant="light">
                        Custom ({measureCount} measures)
                      </Badge>
                    ) : (
                      <Badge color="gray" variant="light">
                        Portfolio Default ({measureCount})
                      </Badge>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Tooltip label="Customize measures">
                        <ActionIcon
                          variant="subtle"
                          onClick={() => handleCustomize(building)}
                        >
                          <IconSettings size={16} />
                        </ActionIcon>
                      </Tooltip>
                      {hasOverride && (
                        <Tooltip label="Reset to portfolio default">
                          <ActionIcon
                            variant="subtle"
                            color="gray"
                            onClick={() => handleReset(building.id)}
                          >
                            <IconArrowBackUp size={16} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </Group>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </Card>

      <BuildingMeasuresModal
        building={selectedBuilding}
        opened={opened}
        onClose={close}
        onSave={handleSave}
        onReset={handleReset}
        globalMeasures={state.renovation.selectedMeasures}
      />
    </>
  );
}
