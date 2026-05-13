import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Group,
  NumberInput,
  Select,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { ErrorAlert } from "../../../components/shared/ErrorAlert";
import { StepNavigation } from "../../../components/shared/StepNavigation";
import {
  useRSEAvailableArchetypes,
  useStrategyExplorer,
} from "../hooks/useStrategyExplorer";
import type { RSEPortfolioDefinition } from "../types";

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
    return Array.from(set).sort();
  }, [availableArchetypes]);

  const getCategories = (country: string): string[] => {
    const set = new Set(
      availableArchetypes
        .filter((a) => a.country === country)
        .map((a) => a.category),
    );
    return Array.from(set).sort();
  };

  const getNames = (country: string, category: string): string[] => {
    return availableArchetypes
      .filter((a) => a.country === country && a.category === category)
      .map((a) => a.name)
      .sort();
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

      {rows.map((row) => (
        <Group key={row.id} gap="sm" align="flex-end" wrap="wrap">
          <Select
            label="Country"
            placeholder="Select country"
            data={countries}
            value={row.country}
            onChange={(value) => updateRow(row.id, { country: value ?? "" })}
            style={{ minWidth: 140 }}
          />
          <Select
            label="Category"
            placeholder="Select category"
            data={getCategories(row.country)}
            value={row.category}
            onChange={(value) => updateRow(row.id, { category: value ?? "" })}
            disabled={!row.country}
            style={{ minWidth: 180 }}
          />
          <Select
            label="Archetype"
            placeholder="Select archetype"
            data={getNames(row.country, row.category)}
            value={row.name}
            onChange={(value) => updateRow(row.id, { name: value ?? "" })}
            disabled={!row.category}
            style={{ minWidth: 200 }}
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
          >
            <IconTrash size={16} />
          </Button>
        </Group>
      ))}

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
