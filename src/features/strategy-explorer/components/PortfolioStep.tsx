import { useEffect, useMemo, useState } from "react";
import { Badge, Box, Button, Group, Stack, Text, Title } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { ErrorAlert } from "../../../components/shared/ErrorAlert";
import { StepNavigation } from "../../../components/shared/StepNavigation";
import {
  buildArchetypeSelectionLabels,
  formatArchetypeCategoryLabel,
  getArchetypeSelectionLabel,
} from "../../../utils/archetypeLabels";
import { getCountryDisplayName } from "../../../utils/countries";
import { formatNumber } from "../../../utils/formatters";
import {
  useRSEAvailableArchetypes,
  useStrategyExplorer,
} from "../hooks/useStrategyExplorer";
import { rseForecastingCacheService } from "../services/rseForecastingCacheService";
import type { RSEArchetypeRef, RSEPortfolioDefinition } from "../types";
import { ArchetypeDetailsPanel } from "./portfolio/ArchetypeDetailsPanel";
import {
  ArchetypeRowCard,
  type PortfolioRow,
} from "./portfolio/ArchetypeRowCard";
import classes from "./StrategySteps.module.css";

export function PortfolioStep() {
  const { dispatch } = useStrategyExplorer();
  const availableArchetypes = useRSEAvailableArchetypes();
  const [rows, setRows] = useState<PortfolioRow[]>([
    { id: 1, country: "", category: "", name: "", buildingCount: "" },
  ]);
  const [validationError, setValidationError] = useState<string | null>(null);
  // Archetypes with at least one published cache entry. `null` while loading
  // or when coverage could not be determined — annotation is advisory only;
  // the post-run "excluded combinations" alert remains the safety net.
  const [cachedArchetypeKeys, setCachedArchetypeKeys] =
    useState<Set<string> | null>(null);

  useEffect(() => {
    let cancelled = false;

    rseForecastingCacheService
      .listCachedArchetypes()
      .then((refs) => {
        if (!cancelled) {
          setCachedArchetypeKeys(new Set(refs.map(archetypeKey)));
        }
      })
      .catch((error: unknown) => {
        console.warn(
          "RSE cache coverage could not be loaded; archetype availability will only be reported after running the analysis.",
          error,
        );
      });

    return () => {
      cancelled = true;
    };
  }, []);

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
      .map((archetype) => {
        const label = getArchetypeSelectionLabel(
          archetype,
          archetypeSelectionLabels,
        );
        const uncached =
          cachedArchetypeKeys !== null &&
          !cachedArchetypeKeys.has(archetypeKey(archetype));

        return {
          value: archetype.name,
          label: uncached ? `${label} — no published results yet` : label,
          disabled: uncached,
        };
      })
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

  const completedSelections = rows.filter(
    (row) => row.country && row.category && row.name,
  ).length;
  const totalBuildings = rows.reduce(
    (sum, row) =>
      sum + (typeof row.buildingCount === "number" ? row.buildingCount : 0),
    0,
  );

  return (
    <Stack gap="xl">
      <Group justify="space-between" align="flex-start" wrap="wrap">
        <Box>
          <Title order={2} mb="xs">
            Building Portfolio
          </Title>
          <Text c="dimmed" size="sm">
            Describe your building stock as reference archetypes, each with the
            number of buildings it represents.
          </Text>
        </Box>
        {completedSelections > 0 ? (
          <Badge variant="light" color="relife.7" size="lg" radius="sm">
            {completedSelections}{" "}
            {completedSelections === 1 ? "archetype" : "archetypes"} ·{" "}
            {formatNumber(totalBuildings)}{" "}
            {totalBuildings === 1 ? "building" : "buildings"}
          </Badge>
        ) : null}
      </Group>

      <ErrorAlert error={validationError} />

      <Stack gap="md">
        {rows.map((row, index) => {
          const selectedArchetype = findSelectedArchetype(row);

          return (
            <ArchetypeRowCard
              key={row.id}
              row={row}
              index={index}
              countryOptions={countries}
              categoryOptions={getCategories(row.country)}
              archetypeOptions={getArchetypeOptions(row.country, row.category)}
              selectedArchetype={selectedArchetype}
              selectedLabel={
                selectedArchetype
                  ? getArchetypeSelectionLabel(
                      selectedArchetype,
                      archetypeSelectionLabels,
                    )
                  : undefined
              }
              canRemove={rows.length > 1}
              onChange={(partial) => updateRow(row.id, partial)}
              onRemove={() => removeRow(row.id)}
            >
              {selectedArchetype ? (
                <ArchetypeDetailsPanel
                  key={archetypeKey(selectedArchetype)}
                  archetype={selectedArchetype}
                />
              ) : null}
            </ArchetypeRowCard>
          );
        })}

        <Button
          variant="subtle"
          color="relife.7"
          fullWidth
          h={48}
          radius="md"
          leftSection={<IconPlus size={16} />}
          onClick={addRow}
          className={classes.addButton}
        >
          Add another archetype
        </Button>
      </Stack>

      <StepNavigation
        currentStep={0}
        totalSteps={4}
        onNext={handleNext}
        nextLabel="Choose goal"
      />
    </Stack>
  );
}

function archetypeKey(archetype: RSEArchetypeRef): string {
  return [archetype.country, archetype.category, archetype.name].join("\u001f");
}
