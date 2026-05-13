import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Badge,
  Box,
  Button,
  Card,
  Group,
  NumberInput,
  Select,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import {
  IconBuildingCommunity,
  IconPlus,
  IconRuler,
  IconStack2,
  IconTemperature,
  IconTrash,
  IconWindow,
} from "@tabler/icons-react";
import { ErrorAlert } from "../../../components/shared/ErrorAlert";
import { StepNavigation } from "../../../components/shared/StepNavigation";
import type { ArchetypeDetails } from "../../../types/archetype";
import {
  buildArchetypeSelectionLabels,
  formatArchetypeCategoryLabel,
  getArchetypeSelectionLabel,
} from "../../../utils/archetypeLabels";
import { getCountryDisplayName } from "../../../utils/countries";
import {
  formatArea,
  formatDecimal,
  formatNumber,
} from "../../../utils/formatters";
import {
  useRSEAvailableArchetypes,
  useStrategyExplorer,
} from "../hooks/useStrategyExplorer";
import { archetypePortfolioService } from "../services/archetypePortfolioService";
import type { RSEArchetypeRef, RSEPortfolioDefinition } from "../types";

interface PortfolioRow {
  id: number;
  country: string;
  category: string;
  name: string;
  buildingCount: number | "";
}

export function PortfolioStep() {
  const { dispatch } = useStrategyExplorer();
  const availableArchetypes = useRSEAvailableArchetypes();
  const [rows, setRows] = useState<PortfolioRow[]>([
    { id: 1, country: "", category: "", name: "", buildingCount: "" },
  ]);
  const [validationError, setValidationError] = useState<string | null>(null);

  const countries = useMemo(() => {
    const set = new Set(availableArchetypes.map((a) => a.country));
    return Array.from(set)
      .map((country) => ({
        value: country,
        label: getCountryDisplayName(country) ?? country,
      }))
      .sort((left, right) => left.label.localeCompare(right.label));
  }, [availableArchetypes]);

  const archetypeSelectionLabels = useMemo(
    () => buildArchetypeSelectionLabels(availableArchetypes),
    [availableArchetypes],
  );

  const getCategories = (country: string) => {
    const set = new Set(
      availableArchetypes
        .filter((a) => a.country === country)
        .map((a) => a.category),
    );
    return Array.from(set)
      .map((category) => ({
        value: category,
        label: formatArchetypeCategoryLabel(category),
      }))
      .sort((left, right) => left.label.localeCompare(right.label));
  };

  const getArchetypeOptions = (country: string, category: string) => {
    return availableArchetypes
      .filter((a) => a.country === country && a.category === category)
      .map((archetype) => ({
        value: archetype.name,
        label: getArchetypeSelectionLabel(archetype, archetypeSelectionLabels),
      }))
      .sort((left, right) => left.label.localeCompare(right.label));
  };

  const findSelectedArchetype = (
    row: PortfolioRow,
  ): RSEArchetypeRef | undefined => {
    return availableArchetypes.find(
      (archetype) =>
        archetype.country === row.country &&
        archetype.category === row.category &&
        archetype.name === row.name,
    );
  };

  const updateRow = (id: number, partial: Partial<PortfolioRow>) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const updated = { ...row, ...partial };
        if ("country" in partial) {
          updated.category = "";
          updated.name = "";
        }
        if ("category" in partial) {
          updated.name = "";
        }
        return updated;
      }),
    );
    setValidationError(null);
  };

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      {
        id: Date.now(),
        country: "",
        category: "",
        name: "",
        buildingCount: "",
      },
    ]);
  };

  const removeRow = (id: number) => {
    setRows((prev) => prev.filter((row) => row.id !== id));
    setValidationError(null);
  };

  const validate = (): RSEPortfolioDefinition | null => {
    if (rows.length === 0) {
      setValidationError("Please add at least one archetype.");
      return null;
    }

    const selections: RSEPortfolioDefinition["selections"] = [];
    const seen = new Set<string>();

    for (const row of rows) {
      if (!row.country || !row.category || !row.name) {
        setValidationError(
          "Please complete the archetype selection for every row.",
        );
        return null;
      }
      if (
        row.buildingCount === "" ||
        row.buildingCount <= 0 ||
        !Number.isInteger(row.buildingCount)
      ) {
        setValidationError("Building counts must be positive whole numbers.");
        return null;
      }

      const key = `${row.country}\u001f${row.category}\u001f${row.name}`;
      if (seen.has(key)) {
        setValidationError("Each archetype can only be selected once.");
        return null;
      }
      seen.add(key);

      selections.push({
        archetype: {
          country: row.country,
          category: row.category,
          name: row.name,
        },
        buildingCount: row.buildingCount,
      });
    }

    return { selections };
  };

  const handleNext = () => {
    const portfolio = validate();
    if (portfolio) {
      dispatch({ type: "SET_PORTFOLIO", portfolio });
      dispatch({ type: "SET_STEP", step: 1 });
    }
  };

  return (
    <Stack gap="xl">
      <Box>
        <Title order={2} mb="xs">
          Building Portfolio
        </Title>
        <Text c="dimmed" size="sm">
          Select archetypes and assign building counts to define your stock.
        </Text>
      </Box>

      <ErrorAlert error={validationError} />

      {rows.map((row) => {
        const selectedArchetype = findSelectedArchetype(row);

        return (
          <Stack key={row.id} gap="xs">
            <Group gap="sm" align="flex-end" wrap="wrap">
              <Select
                label="Country"
                placeholder="Select country"
                data={countries}
                value={row.country}
                onChange={(value) =>
                  updateRow(row.id, { country: value ?? "" })
                }
                style={{ minWidth: 140 }}
              />
              <Select
                label="Category"
                placeholder="Select category"
                data={getCategories(row.country)}
                value={row.category}
                onChange={(value) =>
                  updateRow(row.id, { category: value ?? "" })
                }
                disabled={!row.country}
                style={{ minWidth: 180 }}
              />
              <Select
                label="Archetype"
                placeholder="Select archetype"
                data={getArchetypeOptions(row.country, row.category)}
                value={row.name}
                onChange={(value) => updateRow(row.id, { name: value ?? "" })}
                disabled={!row.category}
                searchable
                nothingFoundMessage="No archetypes match your search"
                style={{ minWidth: 280 }}
              />
              <NumberInput
                label="Buildings"
                placeholder="Count"
                value={row.buildingCount}
                onChange={(val) =>
                  updateRow(row.id, {
                    buildingCount: typeof val === "number" ? val : "",
                  })
                }
                min={1}
                step={1}
                style={{ minWidth: 100 }}
              />
              <Button
                variant="subtle"
                color="red"
                onClick={() => removeRow(row.id)}
                disabled={rows.length <= 1}
                aria-label="Remove archetype"
              >
                <IconTrash size={16} />
              </Button>
            </Group>

            {selectedArchetype ? (
              <SelectedArchetypeCard
                key={archetypeKey(selectedArchetype)}
                archetype={selectedArchetype}
                label={getArchetypeSelectionLabel(
                  selectedArchetype,
                  archetypeSelectionLabels,
                )}
              />
            ) : null}
          </Stack>
        );
      })}

      <Button
        variant="light"
        leftSection={<IconPlus size={16} />}
        onClick={addRow}
      >
        Add archetype
      </Button>

      <StepNavigation
        currentStep={0}
        totalSteps={4}
        onNext={handleNext}
        nextLabel="Choose goal"
      />
    </Stack>
  );
}

function SelectedArchetypeCard({
  archetype,
  label,
}: {
  archetype: RSEArchetypeRef;
  label: string;
}) {
  const [details, setDetails] = useState<ArchetypeDetails | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    archetypePortfolioService
      .getArchetypeDetails(archetype)
      .then((loadedDetails) => {
        if (!cancelled) {
          setDetails(loadedDetails);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadFailed(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [archetype]);

  return (
    <Card withBorder bg="gray.0" radius="md" p="md">
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Group gap="sm" align="flex-start" wrap="nowrap">
            <ThemeIcon size="lg" variant="light" color="blue">
              <IconBuildingCommunity size={18} />
            </ThemeIcon>
            <Box style={{ minWidth: 0 }}>
              <Text size="sm" fw={700}>
                {label}
              </Text>
              <Text size="xs" c="dimmed">
                ID: {archetype.name}
              </Text>
            </Box>
          </Group>
          <Badge variant="light" color="blue">
            {formatArchetypeCategoryLabel(archetype.category)}
          </Badge>
        </Group>

        {!details && !loadFailed ? (
          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xs">
            <Skeleton height={58} radius="sm" />
            <Skeleton height={58} radius="sm" />
            <Skeleton height={58} radius="sm" />
            <Skeleton height={58} radius="sm" />
          </SimpleGrid>
        ) : details ? (
          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xs">
            <ArchetypeMetric
              icon={<IconRuler size={14} />}
              label="Floor area"
              value={formatArea(details.floorArea)}
            />
            <ArchetypeMetric
              icon={<IconStack2 size={14} />}
              label="Floors"
              value={formatNumber(details.numberOfFloors)}
            />
            <ArchetypeMetric
              icon={<IconWindow size={14} />}
              label="Window area"
              value={formatArea(details.totalWindowArea)}
            />
            <ArchetypeMetric
              icon={<IconTemperature size={14} />}
              label="Heating setpoint"
              value={`${formatDecimal(details.setpoints.heatingSetpoint)} °C`}
            />
            <ArchetypeMetric
              icon={<IconRuler size={14} />}
              label="Wall U-value"
              value={`${formatDecimal(details.thermalProperties.wallUValue)} W/m²K`}
            />
            <ArchetypeMetric
              icon={<IconRuler size={14} />}
              label="Roof U-value"
              value={`${formatDecimal(details.thermalProperties.roofUValue)} W/m²K`}
            />
            <ArchetypeMetric
              icon={<IconWindow size={14} />}
              label="Window U-value"
              value={`${formatDecimal(details.thermalProperties.windowUValue)} W/m²K`}
            />
            <ArchetypeMetric
              icon={<IconRuler size={14} />}
              label="Floor height"
              value={`${formatDecimal(details.floorHeight)} m`}
            />
          </SimpleGrid>
        ) : loadFailed ? (
          <Text size="xs" c="dimmed">
            Characteristic details could not be loaded. The selected archetype
            can still be used for analysis.
          </Text>
        ) : null}
      </Stack>
    </Card>
  );
}

function archetypeKey(archetype: RSEArchetypeRef): string {
  return [archetype.country, archetype.category, archetype.name].join("\u001f");
}

function ArchetypeMetric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Box
      p="xs"
      bg="white"
      style={{
        border: "1px solid var(--mantine-color-gray-2)",
        borderRadius: "var(--mantine-radius-sm)",
      }}
    >
      <Group gap="xs" wrap="nowrap" align="flex-start">
        <ThemeIcon size="sm" variant="light" color="gray">
          {icon}
        </ThemeIcon>
        <Box style={{ minWidth: 0 }}>
          <Text size="10px" c="dimmed" tt="uppercase" fw={700}>
            {label}
          </Text>
          <Text size="sm" fw={600}>
            {value}
          </Text>
        </Box>
      </Group>
    </Box>
  );
}
