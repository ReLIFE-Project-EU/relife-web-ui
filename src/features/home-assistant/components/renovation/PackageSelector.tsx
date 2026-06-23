import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Group,
  Loader,
  NumberInput,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconCurrencyEuro,
  IconInfoCircle,
} from "@tabler/icons-react";
import type { ConceptId } from "../../../../constants/relifeConcepts";
import { PACKAGE_SELECTION_MAX } from "../../constants";
import { useHomeAssistant } from "../../hooks/useHomeAssistant";
import { useHomeAssistantServices } from "../../hooks/useHomeAssistantServices";
import { checkCapexPerSqm } from "../../../../utils/inputSanityChecks";
import { packageUsesHeatingStopgap } from "../../../../services/renovationActions";
import { ConceptLabel, ErrorAlert } from "../../../../components/shared";
import { browserNumberSeparators } from "../../../../utils/formatters";

/** Outline "Estimated" tag (with caveat) used to mark an auto-filled cost. */
function EstimatedTag() {
  return (
    <Tooltip label="Estimated from EU reference data — edit to override.">
      <Badge color="blue" variant="outline" size="xs">
        Estimated
      </Badge>
    </Tooltip>
  );
}

/** A single labelled cost input; shared by the CAPEX and maintenance fields. */
function PackageCostField(props: {
  conceptId: ConceptId;
  value: number | null;
  onChange: (value: number | null) => void;
  step: number;
  placeholder: string;
  error?: string;
  suffix?: string;
  autoEstimated?: boolean;
  disabled?: boolean;
}) {
  return (
    <NumberInput
      label={
        <Group gap="xs">
          <ConceptLabel conceptId={props.conceptId} />
          {props.autoEstimated && <EstimatedTag />}
        </Group>
      }
      placeholder={props.placeholder}
      value={props.value ?? ""}
      onChange={(value) =>
        props.onChange(typeof value === "number" ? value : null)
      }
      min={0}
      step={props.step}
      leftSection={<IconCurrencyEuro size={16} />}
      suffix={props.suffix}
      error={props.error}
      disabled={props.disabled}
      {...browserNumberSeparators}
    />
  );
}

interface PackageSelectorProps {
  /** Package ids whose cost estimate is currently in flight. */
  estimatingIds: ReadonlySet<string>;
  /** Per-package estimation error messages, keyed by package id. */
  errorsById: Readonly<Record<string, string>>;
  /** Re-run a package's estimate after a failure. */
  retry: (packageId: string) => void;
}

export function PackageSelector({
  estimatingIds,
  errorsById,
  retry,
}: PackageSelectorProps) {
  const { state, dispatch } = useHomeAssistant();
  const { renovation } = useHomeAssistantServices();
  const { suggestedPackages, selectedPackageIds, packageFinancialInputs } =
    state;
  const floorArea = state.building.floorArea;
  const selectionLimitReached =
    selectedPackageIds.length >= PACKAGE_SELECTION_MAX;

  return (
    <Stack gap="sm">
      <Title order={5}>Renovation options to compare</Title>
      <Text size="sm" c="dimmed">
        Choose up to {PACKAGE_SELECTION_MAX} options for the results comparison.
      </Text>

      <Text size="sm" c="dimmed">
        Costs are estimated automatically from EU reference data when you select
        an option. Review and adjust them to match your project.
      </Text>

      {selectionLimitReached && (
        <Alert variant="light" color="blue">
          You can compare up to {PACKAGE_SELECTION_MAX} packages at once.
          Deselect one package to choose another.
        </Alert>
      )}

      {suggestedPackages.map((pkg) => {
        const isSelected = selectedPackageIds.includes(pkg.id);
        const isDisabled = !isSelected && selectionLimitReached;
        const packageInput = packageFinancialInputs[pkg.id];
        const capex = packageInput?.capex ?? null;
        const maintenanceCost = packageInput?.annualMaintenanceCost ?? null;
        const capexAutoEstimated = packageInput?.capexAutoEstimated ?? false;
        const opexAutoEstimated = packageInput?.opexAutoEstimated ?? false;
        const isEstimating = estimatingIds.has(pkg.id);
        const estimateError = errorsById[pkg.id];
        // The heating cost lives in CAPEX, so the stopgap notice tracks the
        // CAPEX provenance specifically.
        const showHeatingNotice =
          capexAutoEstimated && packageUsesHeatingStopgap(pkg.measureIds);
        const capexWarning =
          isSelected &&
          capex !== null &&
          floorArea !== null &&
          floorArea > 0 &&
          capex > 0
            ? checkCapexPerSqm(capex, floorArea)
            : { warning: false, message: "" };

        return (
          <Card
            key={pkg.id}
            withBorder
            radius="md"
            p="md"
            bg={isSelected ? "green.0" : "gray.0"}
          >
            <Stack gap="md">
              <Group justify="space-between" align="flex-start">
                <Box>
                  <Group gap="xs" mb={4}>
                    <Text fw={600}>{pkg.label}</Text>
                    <Badge
                      color={isSelected ? "green" : "gray"}
                      variant={isSelected ? "filled" : "light"}
                    >
                      {isSelected ? "Selected" : "Available"}
                    </Badge>
                  </Group>
                  <Text size="sm">
                    Included measures:{" "}
                    {pkg.measureIds
                      .map(
                        (measureId) => renovation.getMeasure(measureId)?.name,
                      )
                      .join(", ")}
                  </Text>
                </Box>

                <Button
                  variant={isSelected ? "light" : "outline"}
                  color={isSelected ? "green" : "gray"}
                  onClick={() =>
                    dispatch({ type: "TOGGLE_PACKAGE", packageId: pkg.id })
                  }
                  disabled={isDisabled}
                >
                  {isSelected ? "Remove" : "Select"}
                </Button>
              </Group>

              {isSelected && (
                <Stack gap="sm">
                  {isEstimating && (
                    <Group gap="xs" py="xs">
                      <Loader size="sm" />
                      <Text size="sm" c="dimmed">
                        Estimating costs from EU reference data…
                      </Text>
                    </Group>
                  )}

                  <Group grow align="flex-start">
                    <PackageCostField
                      conceptId="investment"
                      value={capex}
                      autoEstimated={capexAutoEstimated}
                      disabled={isEstimating}
                      onChange={(value) =>
                        dispatch({
                          type: "SET_PACKAGE_FINANCIAL_INPUT",
                          packageId: pkg.id,
                          field: "capex",
                          value,
                        })
                      }
                      step={1000}
                      placeholder="e.g. 25000"
                      error={
                        capex === null || capex <= 0
                          ? "Enter a positive value."
                          : undefined
                      }
                    />

                    <PackageCostField
                      conceptId="annual-maintenance-cost"
                      value={maintenanceCost}
                      autoEstimated={opexAutoEstimated}
                      disabled={isEstimating}
                      onChange={(value) =>
                        dispatch({
                          type: "SET_PACKAGE_FINANCIAL_INPUT",
                          packageId: pkg.id,
                          field: "annualMaintenanceCost",
                          value,
                        })
                      }
                      step={100}
                      placeholder="e.g. 500"
                      suffix="/year"
                      error={
                        maintenanceCost === null || maintenanceCost < 0
                          ? "Enter zero or a positive value."
                          : undefined
                      }
                    />
                  </Group>

                  {showHeatingNotice && (
                    <Alert
                      color="blue"
                      variant="light"
                      icon={<IconInfoCircle size={16} />}
                      title="Heating cost is a rough estimate"
                    >
                      The heating system&apos;s size isn&apos;t available yet,
                      so its cost is approximated. Adjust the values if you have
                      a quote.
                    </Alert>
                  )}

                  {estimateError && (
                    <ErrorAlert
                      color="yellow"
                      title="Couldn't estimate costs"
                      error={
                        <Group justify="space-between" align="center">
                          <Text size="sm">
                            {estimateError} Enter the values manually or try
                            again.
                          </Text>
                          <Button
                            size="xs"
                            variant="light"
                            color="yellow"
                            onClick={() => retry(pkg.id)}
                          >
                            Retry
                          </Button>
                        </Group>
                      }
                    />
                  )}

                  {capexWarning.warning && (
                    <Alert
                      color="yellow"
                      icon={<IconAlertTriangle size={16} />}
                      variant="light"
                    >
                      {capexWarning.message}
                    </Alert>
                  )}
                </Stack>
              )}
            </Stack>
          </Card>
        );
      })}
    </Stack>
  );
}
