import type { ReactNode } from "react";
import {
  ActionIcon,
  Badge,
  Box,
  Card,
  Grid,
  Group,
  NumberInput,
  Select,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import { IconBuildingCommunity, IconTrash } from "@tabler/icons-react";
import { formatArchetypeCategoryLabel } from "../../../../utils/archetypeLabels";
import { browserNumberSeparators } from "../../../../utils/formatters";
import type { RSEArchetypeRef } from "../../types";
import classes from "../StrategySteps.module.css";

export interface PortfolioRow {
  id: number;
  country: string;
  category: string;
  name: string;
  buildingCount: number | "";
  /** Dwelling floor area (m²); apartment-like categories only. */
  unitFloorArea?: number | "";
}

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface ArchetypeRowCardProps {
  row: PortfolioRow;
  index: number;
  countryOptions: SelectOption[];
  categoryOptions: SelectOption[];
  archetypeOptions: SelectOption[];
  selectedArchetype?: RSEArchetypeRef;
  selectedLabel?: string;
  canRemove: boolean;
  onChange: (partial: Partial<PortfolioRow>) => void;
  onRemove: () => void;
  /** Details panel slot, rendered below the inputs when an archetype is selected. */
  children?: ReactNode;
}

/**
 * One entry of the building stock: an archetype selection (country →
 * category → archetype) paired with the number of dwellings it represents.
 * Purely presentational; selection state and validation live in PortfolioStep.
 */
export function ArchetypeRowCard({
  row,
  index,
  countryOptions,
  categoryOptions,
  archetypeOptions,
  selectedArchetype,
  selectedLabel,
  canRemove,
  onChange,
  onRemove,
  children,
}: ArchetypeRowCardProps) {
  const isComplete = selectedArchetype !== undefined;

  return (
    <Card withBorder radius="md" p="md" className={classes.rowCard}>
      <Stack gap="md">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Group
            gap="sm"
            align="flex-start"
            wrap="nowrap"
            style={{ minWidth: 0 }}
          >
            <ThemeIcon
              size="lg"
              radius="md"
              variant="light"
              color={isComplete ? "relife.7" : "gray"}
            >
              <IconBuildingCommunity size={18} />
            </ThemeIcon>
            <Box style={{ minWidth: 0 }}>
              <Text size="sm" fw={700} truncate>
                {isComplete && selectedLabel
                  ? selectedLabel
                  : `Archetype ${index + 1}`}
              </Text>
              <Text size="xs" c="dimmed" truncate>
                {isComplete
                  ? `ID: ${selectedArchetype.name}`
                  : "Pick a reference building and how many dwellings it represents"}
              </Text>
            </Box>
          </Group>

          <Group gap="xs" wrap="nowrap">
            {isComplete ? (
              <Badge variant="light" color="relife.7" visibleFrom="sm">
                {formatArchetypeCategoryLabel(selectedArchetype.category)}
              </Badge>
            ) : null}
            <Tooltip label="Remove archetype" disabled={!canRemove}>
              <ActionIcon
                variant="subtle"
                color="red"
                onClick={onRemove}
                disabled={!canRemove}
                aria-label="Remove archetype"
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>

        <Grid gutter="sm">
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Select
              label="Country"
              placeholder="Select country"
              data={countryOptions}
              value={row.country}
              onChange={(value) => onChange({ country: value ?? "" })}
              searchable
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Select
              label="Category"
              placeholder="Select category"
              data={categoryOptions}
              value={row.category}
              onChange={(value) => onChange({ category: value ?? "" })}
              disabled={!row.country}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 8, md: 4 }}>
            <Select
              label="Archetype"
              placeholder="Select archetype"
              data={archetypeOptions}
              value={row.name}
              onChange={(value) => onChange({ name: value ?? "" })}
              disabled={!row.category}
              searchable
              nothingFoundMessage="No archetypes match your search"
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 4, md: 2 }}>
            <NumberInput
              label="Dwellings"
              placeholder="Count"
              value={row.buildingCount}
              onChange={(val) =>
                onChange({
                  buildingCount: typeof val === "number" ? val : "",
                })
              }
              min={1}
              step={1}
              {...browserNumberSeparators}
            />
          </Grid.Col>
        </Grid>

        {children}
      </Stack>
    </Card>
  );
}
