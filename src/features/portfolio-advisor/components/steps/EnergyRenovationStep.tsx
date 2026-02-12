/**
 * EnergyRenovationStep Component
 * Step 1: Renovation measure selection and project settings.
 */

import {
  Alert,
  Badge,
  Box,
  Card,
  Checkbox,
  Grid,
  Group,
  NumberInput,
  SimpleGrid,
  Slider,
  Stack,
  Text,
  Tooltip,
  Title,
  UnstyledButton,
} from "@mantine/core";
import {
  IconBuildingEstate,
  IconBolt,
  IconFlame,
  IconHome,
  IconInfoCircle,
  IconSolarPanel,
  IconSun,
  IconWall,
  IconWindow,
} from "@tabler/icons-react";
import { StepNavigation } from "../../../../components/shared/StepNavigation";
import type { RenovationMeasureId } from "../../../../types/renovation";
import type { RenovationMeasure } from "../../../../services/types";
import { usePortfolioAdvisor } from "../../hooks/usePortfolioAdvisor";
import { usePortfolioAdvisorServices } from "../../hooks/usePortfolioAdvisorServices";

// ─────────────────────────────────────────────────────────────────────────────
// Measure Card
// ─────────────────────────────────────────────────────────────────────────────

function getMeasureIcon(measureId: RenovationMeasureId) {
  const iconProps = { size: 24, stroke: 1.5 };

  switch (measureId) {
    case "wall-insulation":
      return <IconWall {...iconProps} />;
    case "roof-insulation":
      return <IconHome {...iconProps} />;
    case "floor-insulation":
      return <IconBuildingEstate {...iconProps} />;
    case "windows":
      return <IconWindow {...iconProps} />;
    case "air-water-heat-pump":
      return <IconBolt {...iconProps} />;
    case "condensing-boiler":
      return <IconFlame {...iconProps} />;
    case "pv":
      return <IconSolarPanel {...iconProps} />;
    case "solar-thermal":
      return <IconSun {...iconProps} />;
    default:
      return <IconBolt {...iconProps} />;
  }
}

function getCategoryColor(category: string): string {
  switch (category) {
    case "envelope":
      return "blue";
    case "systems":
      return "orange";
    case "renewable":
      return "green";
    default:
      return "gray";
  }
}

function getCategoryLabel(category: string): string {
  switch (category) {
    case "envelope":
      return "Envelope";
    case "systems":
      return "Systems";
    case "renewable":
      return "Renewables";
    default:
      return "Other";
  }
}

function MeasureCard({
  measure,
  selected,
  onToggle,
  disabled,
}: {
  measure: RenovationMeasure;
  selected: boolean;
  onToggle: (measureId: RenovationMeasureId) => void;
  disabled?: boolean;
}) {
  const handleClick = () => !disabled && onToggle(measure.id);
  const categoryColor = getCategoryColor(measure.category);
  const categoryLabel = getCategoryLabel(measure.category);

  return (
    <UnstyledButton onClick={handleClick} w="100%">
      <Card
        withBorder
        radius="lg"
        p="lg"
        shadow={selected ? "md" : "sm"}
        bg={selected ? `${categoryColor}.0` : disabled ? "gray.0" : "white"}
        style={{
          borderColor: selected
            ? `var(--mantine-color-${categoryColor}-5)`
            : undefined,
          borderWidth: selected ? 2 : 1,
          cursor: disabled ? "not-allowed" : "pointer",
          transition: "border-color 150ms ease, box-shadow 150ms ease",
          opacity: disabled ? 0.7 : 1,
        }}
      >
        <Stack gap="md">
          <Group justify="space-between" align="flex-start" wrap="nowrap">
            <Group gap="sm" wrap="nowrap" align="flex-start">
              <Text c={categoryColor}>{getMeasureIcon(measure.id)}</Text>
              <Stack gap={4}>
                <Text fw={600} size="sm">
                  {measure.name}
                </Text>
              </Stack>
            </Group>
            <Tooltip
              label={measure.description}
              position="left"
              multiline
              w={260}
            >
              <IconInfoCircle
                size={16}
                color="var(--mantine-color-gray-5)"
                style={{ cursor: "help", flexShrink: 0 }}
                onClick={(event) => event.stopPropagation()}
              />
            </Tooltip>
          </Group>

          <Group justify="space-between" align="center">
            <Badge color={categoryColor} variant={selected ? "filled" : "light"}>
              {categoryLabel}
            </Badge>
            <Checkbox
              checked={selected}
              onChange={handleClick}
              label={
                <Text fw={500} size="sm">
                  {selected ? "Selected" : "Select"}
                </Text>
              }
              onClick={(event) => event.stopPropagation()}
              disabled={disabled}
              styles={{
                body: { alignItems: "center" },
                label: { paddingLeft: 8 },
                input: { cursor: disabled ? "not-allowed" : "pointer" },
              }}
            />
          </Group>

          {!measure.isSupported && (
            <Badge color="yellow" size="sm" variant="light" fullWidth>
              Coming Soon
            </Badge>
          )}
        </Stack>
      </Card>
    </UnstyledButton>
  );
}

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

  const categorizedMeasures = renovation.getCategories().map((cat) => ({
    cat,
    measures: renovation.getMeasuresByCategory(cat.id),
  }));

  const handleToggle = (measureId: RenovationMeasureId) => {
    dispatch({ type: "TOGGLE_MEASURE", measureId });
  };

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
            <Title order={5} tt="uppercase" c="dimmed" size="sm" mb="xs">
              {cat.label}
            </Title>
            <Text size="xs" c="dimmed" mb="sm">
              {cat.description}
            </Text>
            <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} spacing="sm">
              {measures.map((measure) => (
                <MeasureCard
                  key={measure.id}
                  measure={measure}
                  selected={selectedMeasures.includes(measure.id)}
                  onToggle={handleToggle}
                  disabled={!measure.isSupported}
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
