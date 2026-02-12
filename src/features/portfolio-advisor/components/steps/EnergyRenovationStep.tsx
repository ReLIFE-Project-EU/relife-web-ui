/**
 * EnergyRenovationStep Component
 * Step 1: Renovation measure selection and project settings.
 */

import {
  Alert,
  Badge,
  Box,
  Card,
  Grid,
  Group,
  NumberInput,
  SimpleGrid,
  Slider,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from "@mantine/core";
import {
  IconBolt,
  IconInfoCircle,
  IconLeaf,
  IconSolarPanel,
} from "@tabler/icons-react";
import { memo, useCallback, useMemo, type ReactNode } from "react";
import { StepNavigation } from "../../../../components/shared/StepNavigation";
import type { RenovationMeasureId } from "../../../../types/renovation";
import type {
  MeasureCategory,
  RenovationMeasure,
} from "../../../../services/types";
import { usePortfolioAdvisor } from "../../hooks/usePortfolioAdvisor";
import { usePortfolioAdvisorServices } from "../../hooks/usePortfolioAdvisorServices";

// ─────────────────────────────────────────────────────────────────────────────
// Category Icons
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<MeasureCategory, ReactNode> = {
  envelope: <IconBolt size={20} />,
  systems: <IconSolarPanel size={20} />,
  renewable: <IconLeaf size={20} />,
};

// ─────────────────────────────────────────────────────────────────────────────
// Measure Card
// ─────────────────────────────────────────────────────────────────────────────

const MeasureCard = memo(function MeasureCard({
  measure,
  measureId,
  selected,
  onToggle,
}: {
  measure: RenovationMeasure;
  measureId: RenovationMeasureId;
  selected: boolean;
  onToggle: (measureId: RenovationMeasureId) => void;
}) {
  const handleClick = useCallback(
    () => onToggle(measureId),
    [onToggle, measureId],
  );

  return (
    <UnstyledButton onClick={handleClick} w="100%">
      <Card
        withBorder
        radius="md"
        p="md"
        style={{
          borderColor: selected ? "var(--mantine-color-teal-6)" : undefined,
          backgroundColor: selected ? "var(--mantine-color-teal-0)" : undefined,
          cursor: "pointer",
        }}
      >
        <Group justify="space-between" mb="xs">
          <Text fw={500} size="sm">
            {measure.name}
          </Text>
          {!measure.isSupported && (
            <Badge size="xs" color="gray" variant="light">
              Coming Soon
            </Badge>
          )}
          {selected && (
            <Badge size="xs" color="teal" variant="filled">
              Selected
            </Badge>
          )}
        </Group>
        <Text size="xs" c="dimmed">
          {measure.description}
        </Text>
      </Card>
    </UnstyledButton>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Project Lifetime Marks
// ─────────────────────────────────────────────────────────────────────────────

const LIFETIME_MARKS = [
  { value: 5, label: "5y" },
  { value: 10, label: "10y" },
  { value: 15, label: "15y" },
  { value: 20, label: "20y" },
  { value: 25, label: "25y" },
  { value: 30, label: "30y" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function EnergyRenovationStep() {
  const { state, dispatch } = usePortfolioAdvisor();
  const { renovation } = usePortfolioAdvisorServices();

  const selectedMeasures = state.renovation.selectedMeasures;
  const unsupportedSelected = selectedMeasures.filter(
    (m) => !renovation.getMeasure(m)?.isSupported,
  );
  const hasSupportedMeasure = selectedMeasures.some(
    (m) => renovation.getMeasure(m)?.isSupported,
  );

  const categorizedMeasures = useMemo(
    () =>
      renovation.getCategories().map((cat) => ({
        cat,
        measures: renovation.getMeasuresByCategory(cat.id),
      })),
    [renovation],
  );

  const handleToggle = useCallback(
    (measureId: RenovationMeasureId) => {
      dispatch({ type: "TOGGLE_MEASURE", measureId });
    },
    [dispatch],
  );

  const handlePrevious = () => {
    dispatch({ type: "SET_STEP", step: 0 });
  };

  const handleNext = () => {
    if (selectedMeasures.length > 0 && hasSupportedMeasure) {
      dispatch({ type: "SET_STEP", step: 2 });
    }
  };

  return (
    <Stack gap="xl">
      {/* Header */}
      <Box>
        <Title order={2} mb="xs">
          Energy & Renovation Options
        </Title>
        <Text c="dimmed" size="sm">
          Select renovation measures and configure project settings for all
          buildings in the portfolio.
        </Text>
      </Box>

      {/* Renovation Measures */}
      <Card withBorder radius="md" p="lg">
        <Title order={4} mb="md">
          Renovation Measures
        </Title>
        <Text size="sm" c="dimmed" mb="lg">
          Select the measures to apply across the portfolio. Each building will
          be evaluated with these measures.
        </Text>

        {categorizedMeasures.map(({ cat, measures }) => (
          <Box key={cat.id} mb="lg">
            <Group gap="xs" mb="sm">
              {CATEGORY_ICONS[cat.id]}
              <Text fw={600} size="sm">
                {cat.label}
              </Text>
            </Group>
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
              {measures.map((measure) => (
                <MeasureCard
                  key={measure.id}
                  measure={measure}
                  measureId={measure.id}
                  selected={selectedMeasures.includes(measure.id)}
                  onToggle={handleToggle}
                />
              ))}
            </SimpleGrid>
          </Box>
        ))}
      </Card>

      {unsupportedSelected.length > 0 && (
        <Alert
          color="yellow"
          icon={<IconInfoCircle size={16} />}
          title="Limited Simulation Support"
        >
          The following measures are not yet supported for simulation:{" "}
          <Text span fw={700}>
            {unsupportedSelected
              .map((m) => renovation.getMeasure(m)?.name)
              .join(", ")}
          </Text>
          . Only envelope measures (wall, roof, windows) will be simulated at
          this time.
        </Alert>
      )}

      {/* Optional Cost Overrides */}
      <Card withBorder radius="md" p="lg">
        <Title order={4} mb="md">
          Optional Cost Overrides
        </Title>
        <Text size="sm" c="dimmed" mb="md">
          Leave blank to let the system estimate costs from its database.
        </Text>
        <Grid>
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <NumberInput
              label="Total CAPEX (EUR)"
              placeholder="Auto-estimated"
              value={state.renovation.estimatedCapex ?? ""}
              onChange={(val) =>
                dispatch({
                  type: "SET_ESTIMATED_CAPEX",
                  capex: typeof val === "number" ? val : null,
                })
              }
              min={0}
              thousandSeparator=","
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <NumberInput
              label="Annual Maintenance Cost (EUR/year)"
              placeholder="Auto-estimated"
              value={state.renovation.estimatedMaintenanceCost ?? ""}
              onChange={(val) =>
                dispatch({
                  type: "SET_ESTIMATED_MAINTENANCE_COST",
                  cost: typeof val === "number" ? val : null,
                })
              }
              min={0}
              thousandSeparator=","
            />
          </Grid.Col>
        </Grid>
      </Card>

      {/* Project Settings */}
      <Card withBorder radius="md" p="lg">
        <Title order={4} mb="md">
          Project Settings
        </Title>
        <Box maw={500}>
          <Text size="sm" mb="xs">
            Project Lifetime: {state.projectLifetime} years
          </Text>
          <Slider
            value={state.projectLifetime}
            onChange={(val) =>
              dispatch({ type: "SET_PROJECT_LIFETIME", years: val })
            }
            min={1}
            max={30}
            marks={LIFETIME_MARKS}
            label={(val) => `${val} years`}
          />
        </Box>
      </Card>

      {/* Navigation */}
      <StepNavigation
        currentStep={1}
        totalSteps={4}
        onPrevious={handlePrevious}
        onNext={handleNext}
        primaryDisabled={!hasSupportedMeasure}
      />
    </Stack>
  );
}
