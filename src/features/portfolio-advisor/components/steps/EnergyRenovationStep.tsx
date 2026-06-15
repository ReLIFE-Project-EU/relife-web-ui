/**
 * EnergyRenovationStep Component
 * Step 1: Renovation measure selection and project settings.
 */

import {
  Accordion,
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Divider,
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
  IconAlertTriangle,
  IconInfoCircle,
  IconSparkles,
} from "@tabler/icons-react";
import { StepNavigation } from "../../../../components/shared/StepNavigation";
import { MeasureEffectSummary } from "../../../../components/shared/MeasureEffectSummary";
import { checkCapexPerSqm } from "../../../../utils/inputSanityChecks";
import { getMeasureIcon } from "../../../../utils/measureIcons";
import type { RenovationMeasureId } from "../../../../types/renovation";
import type { RenovationMeasure } from "../../../../services/types";
import { SUGGESTED_PACKAGE } from "../../constants";
import { usePortfolioAdvisor } from "../../hooks/usePortfolioAdvisor";
import { usePortfolioAdvisorServices } from "../../hooks/usePortfolioAdvisorServices";
import {
  getCostOverrideValidity,
  getPortfolioMeasureStatus,
} from "../../utils/measureSelection";
import { BuildingMeasuresTable } from "../BuildingMeasuresTable";

// ─────────────────────────────────────────────────────────────────────────────
// Measure Card
// ─────────────────────────────────────────────────────────────────────────────

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

  return (
    <UnstyledButton onClick={handleClick} w="100%" disabled={disabled}>
      <Card
        withBorder
        radius="md"
        p="md"
        bg={selected ? "relife.0" : disabled ? "gray.0" : "white"}
        style={{
          borderColor: selected ? "var(--mantine-color-relife-7)" : undefined,
          borderWidth: selected ? 2 : 1,
          cursor: disabled ? "not-allowed" : "pointer",
          transition: "border-color 150ms ease, box-shadow 150ms ease",
          opacity: disabled ? 0.7 : 1,
        }}
      >
        <Stack gap="sm">
          <Group justify="space-between" align="flex-start" wrap="nowrap">
            <Group gap="sm" wrap="nowrap" align="flex-start">
              <Box
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "var(--mantine-radius-md)",
                  display: "grid",
                  placeItems: "center",
                  backgroundColor: selected
                    ? "var(--mantine-color-relife-7)"
                    : "var(--mantine-color-gray-1)",
                  color: selected ? "white" : "var(--mantine-color-gray-7)",
                  flexShrink: 0,
                }}
              >
                {getMeasureIcon(measure.id)}
              </Box>
              <Stack gap={2} style={{ minWidth: 0 }}>
                <Text fw={600} size="sm">
                  {measure.name}
                </Text>
              </Stack>
            </Group>
            <Tooltip
              label={measure.technicalDescription ?? measure.description}
              position="left"
              multiline
              w={320}
            >
              <IconInfoCircle
                size={16}
                color="var(--mantine-color-gray-5)"
                style={{ cursor: "help", flexShrink: 0 }}
                onClick={(event) => event.stopPropagation()}
              />
            </Tooltip>
          </Group>

          <MeasureEffectSummary measureId={measure.id} compact />

          <Group justify="space-between" align="center">
            {!measure.isSupported ? (
              <Badge color="yellow" size="xs" variant="light">
                Coming soon
              </Badge>
            ) : (
              <span />
            )}
            <Checkbox
              checked={selected}
              onChange={handleClick}
              label={
                <Text size="xs" fw={500} c={selected ? "relife.8" : "dimmed"}>
                  {selected ? "Selected" : "Select"}
                </Text>
              }
              onClick={(event) => event.stopPropagation()}
              disabled={disabled}
              styles={{
                body: { alignItems: "center" },
                label: { paddingLeft: 6 },
                input: { cursor: disabled ? "not-allowed" : "pointer" },
              }}
            />
          </Group>
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
  const hasHeatPump = selectedMeasures.includes("air-water-heat-pump");
  const hasBoiler = selectedMeasures.includes("condensing-boiler");
  const hasPv = selectedMeasures.includes("pv");
  const analysisEligibleMeasures = renovation
    .getAnalysisEligibleMeasures()
    .map((measure) => measure.id);
  const isAnalysisEligibleMeasure = (measureId: RenovationMeasureId) =>
    analysisEligibleMeasures.includes(measureId);
  const unsupportedSelected = selectedMeasures.filter(
    (measureId) => !isAnalysisEligibleMeasure(measureId),
  );
  // Cost overrides are optional: a blank field falls back to the Financial API
  // reference-data lookup during analysis. A value that is present but invalid
  // (CAPEX not > 0, negative maintenance) still blocks navigation — surfaced as
  // per-input errors below.
  const { capexInvalid, maintenanceInvalid } = getCostOverrideValidity(
    state.renovation,
  );
  const {
    buildingsWithoutMeasures,
    buildingsWithoutAnalysisEligibleMeasures,
    hasValidSelections,
  } = getPortfolioMeasureStatus(
    state.buildings,
    selectedMeasures,
    analysisEligibleMeasures,
  );
  const canProceed = hasValidSelections && !capexInvalid && !maintenanceInvalid;

  const buildingsWithOverrides = state.buildings.filter(
    (b) =>
      (b.selectedMeasures !== undefined && b.selectedMeasures.length > 0) ||
      (b.modifications && Object.keys(b.modifications).length > 0),
  ).length;

  const categorizedMeasures = renovation.getCategories().map((cat) => ({
    cat,
    measures: renovation.getMeasuresByCategory(cat.id),
  }));

  const handleToggle = (measureId: RenovationMeasureId) => {
    dispatch({ type: "TOGGLE_MEASURE", measureId });
  };

  const applyPackage = (measures: RenovationMeasureId[]) => {
    dispatch({ type: "SET_MEASURES", measures });
  };

  const handlePrevious = () => {
    dispatch({ type: "SET_STEP", step: 0 });
  };

  // CAPEX sanity check: warn when the global CAPEX is low relative to the
  // average floor area of the buildings that will actually use it (i.e. those
  // without a per-building estimatedCapex override).
  const globalCapexBuildings = state.buildings.filter(
    (b) => b.estimatedCapex == null,
  );
  const avgFloorArea =
    globalCapexBuildings.length > 0
      ? globalCapexBuildings.reduce((sum, b) => sum + b.floorArea, 0) /
        globalCapexBuildings.length
      : 0;
  const capexWarning =
    globalCapexBuildings.length > 0 &&
    state.renovation.estimatedCapex !== null &&
    avgFloorArea > 0
      ? checkCapexPerSqm(state.renovation.estimatedCapex, avgFloorArea)
      : { warning: false, message: "" };

  const handleNext = () => {
    if (canProceed) {
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
          Pick the renovation measures to evaluate, then tune the project
          settings used for the calculation.
        </Text>
      </Box>

      {/* Renovation Measures */}
      <Card withBorder radius="md" p="lg">
        <Group justify="space-between" mb="md" wrap="wrap">
          <Box>
            <Title order={4}>Renovation Measures</Title>
            <Text size="sm" c="dimmed">
              Select the measures to apply across the portfolio. Each building
              will be evaluated with these measures.
            </Text>
          </Box>
          <Group gap="xs">
            <Button
              variant="subtle"
              size="xs"
              onClick={() => applyPackage([])}
              disabled={selectedMeasures.length === 0}
            >
              Clear
            </Button>
            <Button
              variant="light"
              size="xs"
              leftSection={<IconSparkles size={14} />}
              onClick={() => applyPackage(SUGGESTED_PACKAGE)}
            >
              Suggested package
            </Button>
          </Group>
        </Group>

        {categorizedMeasures.map(({ cat, measures }) => (
          <Box key={cat.id} mb="lg">
            <Title order={5} tt="uppercase" c="dimmed" size="sm" mb={2}>
              {cat.label}
            </Title>
            <Text size="xs" c="dimmed" mb="sm">
              {cat.description}
            </Text>
            <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} spacing="sm">
              {measures.map((measure) => {
                const isAnalysisEligible = isAnalysisEligibleMeasure(
                  measure.id,
                );
                const isSelected = selectedMeasures.includes(measure.id);
                const mutuallyExclusiveDisabled =
                  !isSelected &&
                  ((measure.id === "condensing-boiler" && hasHeatPump) ||
                    (measure.id === "air-water-heat-pump" && hasBoiler));
                const displayMeasure = isAnalysisEligible
                  ? { ...measure, isSupported: true }
                  : measure;

                return (
                  <Tooltip
                    key={measure.id}
                    label="Mutually exclusive with the selected heating system"
                    disabled={!mutuallyExclusiveDisabled}
                    multiline
                  >
                    <Box>
                      <MeasureCard
                        measure={displayMeasure}
                        selected={isSelected}
                        onToggle={handleToggle}
                        disabled={
                          !isAnalysisEligible || mutuallyExclusiveDisabled
                        }
                      />
                    </Box>
                  </Tooltip>
                );
              })}
            </SimpleGrid>
          </Box>
        ))}
      </Card>

      {hasPv && (
        <Alert
          variant="light"
          color="blue"
          icon={<IconInfoCircle size={16} />}
          title="About PV assumptions"
        >
          We estimate solar production for each building from its floor area,
          using a typical south-facing roof setup. Real output depends on roof
          direction, shade, and available space.
        </Alert>
      )}

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
          . These measures are currently excluded from portfolio analysis.
        </Alert>
      )}

      <Alert
        color="blue"
        icon={<IconInfoCircle size={16} />}
        title="Current Analysis Scope"
      >
        Portfolio analysis currently evaluates envelope, supported system, and
        photovoltaic measures. Ranking readiness depends on complete technical
        and financial data for each analyzed scenario.
      </Alert>

      {buildingsWithoutAnalysisEligibleMeasures.length > 0 && (
        <Alert
          color="red"
          icon={<IconInfoCircle size={16} />}
          title="At least one analyzable measure is required"
        >
          The current portfolio analysis flow cannot proceed until each building
          has at least one analyzable measure in its effective selection.
          Supported measures are wall, roof, floor, windows, condensing boiler,
          air-water heat pump, and photovoltaic panels. Affected buildings:{" "}
          <Text span fw={700}>
            {buildingsWithoutAnalysisEligibleMeasures
              .slice(0, 5)
              .map(({ name }) => name)
              .join(", ")}
            {buildingsWithoutAnalysisEligibleMeasures.length > 5 ? ", ..." : ""}
          </Text>
          .
        </Alert>
      )}

      {buildingsWithoutMeasures.length > 0 && (
        <Alert
          color="red"
          icon={<IconInfoCircle size={16} />}
          title="Each building needs a measure selection"
        >
          The current portfolio analysis flow cannot proceed while some
          buildings have no effective renovation measures. Affected buildings:{" "}
          <Text span fw={700}>
            {buildingsWithoutMeasures
              .slice(0, 5)
              .map(({ name }) => name)
              .join(", ")}
            {buildingsWithoutMeasures.length > 5 ? ", ..." : ""}
          </Text>
          .
        </Alert>
      )}

      {/* Per-Building Measure Overrides — collapsed by default to give the
          measure grid above breathing room. */}
      <Accordion variant="separated" radius="md" multiple>
        <Accordion.Item value="overrides">
          <Accordion.Control>
            <Group gap="sm">
              <Title order={5}>Per-building overrides</Title>
              <Text size="sm" c="dimmed">
                Optional. Customize measures and modifications for individual
                buildings.
              </Text>
              {buildingsWithOverrides > 0 && (
                <Badge color="orange" variant="light" size="sm">
                  {buildingsWithOverrides} customized
                </Badge>
              )}
            </Group>
          </Accordion.Control>
          <Accordion.Panel>
            <BuildingMeasuresTable />
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>

      {/* Project Settings & Cost Overrides — merged into a single card */}
      <Card withBorder radius="md" p="lg">
        <Title order={4} mb="xs">
          Project settings & cost overrides
        </Title>
        <Text size="sm" c="dimmed" mb="md">
          Used as defaults for buildings that don&apos;t override these values
          individually.
        </Text>

        <Box pb="xl" mb="md">
          <Text size="sm" mb="xs">
            Project Lifetime: {state.projectLifetime} years
          </Text>
          <Text size="xs" c="dimmed" mb="sm">
            Horizon used for NPV, ROI and payback computations.
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

        <Divider my="md" label="Cost overrides" labelPosition="left" />

        <Alert
          variant="light"
          color="blue"
          icon={<IconInfoCircle size={16} />}
          mb="md"
        >
          Leave these blank to estimate each building&apos;s CAPEX/OPEX
          automatically from EU reference data during analysis. Enter a value to
          override the estimate for all buildings without a per-building cost.
        </Alert>
        <Grid>
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <NumberInput
              label="Total CAPEX (EUR)"
              description="Override applied to buildings without a per-building CAPEX. Leave blank to auto-estimate."
              placeholder="Auto-estimated from reference data"
              value={state.renovation.estimatedCapex ?? ""}
              onChange={(val) =>
                dispatch({
                  type: "SET_ESTIMATED_CAPEX",
                  capex: typeof val === "number" ? val : null,
                })
              }
              min={1}
              thousandSeparator=","
              error={
                capexInvalid
                  ? "CAPEX must be greater than 0, or leave blank to auto-estimate."
                  : undefined
              }
            />
            {capexWarning.warning && (
              <Alert
                color="yellow"
                icon={<IconAlertTriangle size={16} />}
                variant="light"
                mt="xs"
              >
                {capexWarning.message}
              </Alert>
            )}
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <NumberInput
              label="Annual Maintenance Cost (EUR/year)"
              description="Override post-renovation O&M cost. Leave blank to auto-estimate."
              placeholder="Auto-estimated from reference data"
              value={state.renovation.estimatedMaintenanceCost ?? ""}
              onChange={(val) =>
                dispatch({
                  type: "SET_ESTIMATED_MAINTENANCE_COST",
                  cost: typeof val === "number" ? val : null,
                })
              }
              min={0}
              thousandSeparator=","
              error={
                maintenanceInvalid
                  ? "Maintenance cost cannot be negative."
                  : undefined
              }
            />
          </Grid.Col>
        </Grid>
      </Card>

      {/* Navigation */}
      <StepNavigation
        currentStep={1}
        totalSteps={4}
        onPrevious={handlePrevious}
        previousLabel="Back to building portfolio"
        onNext={handleNext}
        nextLabel="Configure financing"
        primaryDisabled={!canProceed}
      />
    </Stack>
  );
}
