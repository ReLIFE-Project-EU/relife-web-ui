import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Group,
  NumberInput,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconCurrencyEuro,
  IconInfoCircle,
} from "@tabler/icons-react";
import { PACKAGE_SELECTION_MAX } from "../../constants";
import { useHomeAssistant } from "../../hooks/useHomeAssistant";
import { useHomeAssistantServices } from "../../hooks/useHomeAssistantServices";
import { checkCapexPerSqm } from "../../../../utils/inputSanityChecks";

export function PackageSelector() {
  const { state, dispatch } = useHomeAssistant();
  const { renovation } = useHomeAssistantServices();
  const { suggestedPackages, selectedPackageIds, packageFinancialInputs } =
    state;
  const floorArea = state.building.floorArea;
  const selectionLimitReached =
    selectedPackageIds.length >= PACKAGE_SELECTION_MAX;

  return (
    <Stack gap="sm">
      <Title order={5}>Suggested Evaluation Options</Title>
      <Text size="sm" c="dimmed">
        Select up to {PACKAGE_SELECTION_MAX} renovation options to compare.
        Insulation and window packages can also be ranked later based on your
        priorities. System upgrades, such as a condensing boiler, can be
        compared here but are not included in that ranking.
      </Text>

      <Alert variant="light" color="yellow" icon={<IconInfoCircle size={16} />}>
        CAPEX backend fallback is planned but not available yet. For now, each
        selected package requires its own CAPEX and annual maintenance values.
        The pre-filled defaults are starting estimates that you should adjust to
        match your project.
      </Alert>

      {selectionLimitReached && (
        <Alert variant="light" color="blue" icon={<IconInfoCircle size={16} />}>
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
                  <Group grow align="flex-start">
                    <NumberInput
                      label="Package CAPEX"
                      description="Required for now. Backend fallback is not enabled yet."
                      placeholder="e.g. 25000"
                      value={capex ?? ""}
                      onChange={(value) =>
                        dispatch({
                          type: "SET_PACKAGE_FINANCIAL_INPUT",
                          packageId: pkg.id,
                          field: "capex",
                          value: typeof value === "number" ? value : null,
                        })
                      }
                      min={0}
                      step={1000}
                      thousandSeparator=","
                      leftSection={<IconCurrencyEuro size={16} />}
                      error={
                        capex === null || capex <= 0
                          ? "Required — enter a positive value."
                          : undefined
                      }
                    />

                    <NumberInput
                      label="Annual maintenance cost"
                      description="Required by the current Financial API implementation."
                      placeholder="e.g. 500"
                      value={maintenanceCost ?? ""}
                      onChange={(value) =>
                        dispatch({
                          type: "SET_PACKAGE_FINANCIAL_INPUT",
                          packageId: pkg.id,
                          field: "annualMaintenanceCost",
                          value: typeof value === "number" ? value : null,
                        })
                      }
                      min={0}
                      step={100}
                      thousandSeparator=","
                      leftSection={<IconCurrencyEuro size={16} />}
                      suffix="/year"
                      error={
                        maintenanceCost === null || maintenanceCost < 0
                          ? "Required — enter zero or a positive value."
                          : undefined
                      }
                    />
                  </Group>

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
