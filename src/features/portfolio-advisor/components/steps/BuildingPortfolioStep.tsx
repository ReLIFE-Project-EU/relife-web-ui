/**
 * BuildingPortfolioStep Component
 * Step 0: Two-panel building input (CSV import + manual add) with building table.
 */

import {
  ActionIcon,
  Badge,
  Box,
  Card,
  Grid,
  Group,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { IconPencil, IconTrash } from "@tabler/icons-react";
import { useCallback } from "react";
import { usePortfolioAdvisor } from "../../hooks/usePortfolioAdvisor";
import { StepNavigation } from "../../../../components/shared/StepNavigation";
import type { PRABuilding } from "../../context/types";
import { CSVImportPanel } from "./CSVImportPanel";
import { ManualAddPanel } from "./ManualAddPanel";

export function BuildingPortfolioStep() {
  const { state, dispatch } = usePortfolioAdvisor();

  const handleCSVImport = useCallback(
    (buildings: PRABuilding[]) => {
      dispatch({ type: "APPEND_BUILDINGS", buildings });
    },
    [dispatch],
  );

  const handleManualAdd = useCallback(
    (building: PRABuilding) => {
      dispatch({ type: "ADD_BUILDING", building });
    },
    [dispatch],
  );

  const handleRemove = useCallback(
    (buildingId: string) => {
      dispatch({ type: "REMOVE_BUILDING", buildingId });
    },
    [dispatch],
  );

  const handleNext = () => {
    if (state.buildings.length > 0) {
      dispatch({ type: "SET_STEP", step: 1 });
    }
  };

  return (
    <Stack gap="xl">
      {/* Header */}
      <Box>
        <Title order={2} mb="xs">
          Building Portfolio
        </Title>
        <Text c="dimmed" size="sm">
          Import buildings from a CSV file or add them manually.
        </Text>
      </Box>

      {/* Two-panel input */}
      <Grid>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <CSVImportPanel onImport={handleCSVImport} />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <ManualAddPanel onAdd={handleManualAdd} />
        </Grid.Col>
      </Grid>

      {/* Building Table */}
      {state.buildings.length > 0 && (
        <Card withBorder radius="md" p="lg">
          <Group justify="space-between" mb="md">
            <Title order={4}>
              Buildings{" "}
              <Badge color="teal" variant="light" ml="xs">
                {state.buildings.length}
              </Badge>
            </Title>
          </Group>

          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Category</Table.Th>
                <Table.Th>Country</Table.Th>
                <Table.Th>Floor Area (m²)</Table.Th>
                <Table.Th>Archetype</Table.Th>
                <Table.Th>Source</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {state.buildings.map((building) => (
                <Table.Tr key={building.id}>
                  <Table.Td>{building.name}</Table.Td>
                  <Table.Td>{building.category}</Table.Td>
                  <Table.Td>{building.country}</Table.Td>
                  <Table.Td>{building.floorArea}</Table.Td>
                  <Table.Td>
                    {building.archetypeName ? (
                      <Group gap="xs">
                        <Text size="sm">
                          {building.archetypeName.split("_").pop()}
                        </Text>
                        {building.modifications &&
                          Object.keys(building.modifications).length > 0 && (
                            <Badge
                              size="xs"
                              color="orange"
                              variant="light"
                              leftSection={<IconPencil size={10} />}
                            >
                              Customized
                            </Badge>
                          )}
                      </Group>
                    ) : (
                      <Text size="sm" c="dimmed">
                        —
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      size="sm"
                      variant="light"
                      color={building.source === "csv" ? "blue" : "green"}
                    >
                      {building.source}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <ActionIcon
                      color="red"
                      variant="subtle"
                      onClick={() => handleRemove(building.id)}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      )}

      {/* Navigation */}
      <StepNavigation
        currentStep={0}
        totalSteps={4}
        onNext={handleNext}
        primaryDisabled={state.buildings.length === 0}
      />
    </Stack>
  );
}
