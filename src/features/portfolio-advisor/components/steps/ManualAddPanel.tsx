/**
 * ManualAddPanel Component
 * Card for manually adding a building to the portfolio with shared archetype selection.
 */

import {
  Button,
  Card,
  Group,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useCallback, useRef, useState } from "react";
import {
  BuildingSelector,
  buildGeneratedBuildingName,
  type BuildingSelectorHandle,
  type BuildingSelectorSelection,
} from "../../../../components/building-selector";
import { usePortfolioAdvisorServices } from "../../hooks/usePortfolioAdvisorServices";
import type { PRABuilding } from "../../context/types";

export function ManualAddPanel({
  onAdd,
  onClose,
  withCard = true,
}: {
  onAdd: (building: PRABuilding) => void;
  /** Optional: invoked after a successful add, e.g. to close a host Drawer. */
  onClose?: () => void;
  /**
   * When false, render the form bare (no outer Card wrapper) — used when the
   * panel is hosted inside a Drawer. Defaults to true for backward compat.
   */
  withCard?: boolean;
}) {
  const { building: buildingService } = usePortfolioAdvisorServices();
  const [name, setName] = useState("");
  const [selection, setSelection] = useState<BuildingSelectorSelection | null>(
    null,
  );
  const selectorRef = useRef<BuildingSelectorHandle>(null);

  const handleAdd = useCallback(() => {
    if (!selection) return;

    const building: PRABuilding = {
      id: crypto.randomUUID(),
      name: name.trim() || buildGeneratedBuildingName(selection),
      source: "manual",
      category: selection.category,
      country: selection.country,
      archetypeCountry: selection.archetype.country,
      archetypeName: selection.archetype.name,
      archetypeFloorArea: selection.details.floorArea,
      modifications: selection.modifications,
      lat: selection.coords.lat,
      lng: selection.coords.lng,
      floorArea: selection.floorArea,
      constructionPeriod: selection.constructionPeriod,
      numberOfFloors: selection.numberOfFloors,
      propertyType: selection.category,
      floorNumber: selection.floorNumber,
      validationStatus: "valid",
    };

    onAdd(building);
    setName("");
    setSelection(null);
    selectorRef.current?.reset();
    onClose?.();
  }, [name, onAdd, onClose, selection]);

  const body = (
    <>
      {withCard && (
        <Group mb="md">
          <IconPlus size={20} />
          <Title order={4}>Add Building Manually</Title>
        </Group>
      )}

      <Stack gap="md">
        <TextInput
          label="Building name"
          description="Optional. A reference-based name is generated when left blank."
          placeholder="e.g., Office Building A"
          value={name}
          onChange={(event) => setName(event.currentTarget.value)}
        />

        <BuildingSelector
          ref={selectorRef}
          service={buildingService}
          host="pra"
          adjustmentScope="full"
          compact={!withCard}
          onSelectionChange={setSelection}
        />

        <Group justify="space-between" align="center">
          <Text size="sm" c={selection ? "dimmed" : "red"}>
            {selection
              ? "Reference building selected."
              : "Select a reference building before adding it."}
          </Text>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={handleAdd}
            disabled={!selection}
          >
            Add Building
          </Button>
        </Group>
      </Stack>
    </>
  );

  if (!withCard) {
    return body;
  }

  return (
    <Card withBorder radius="md" p="lg">
      {body}
    </Card>
  );
}
