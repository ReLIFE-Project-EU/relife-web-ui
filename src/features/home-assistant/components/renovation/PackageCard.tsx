/**
 * PackageCard Component
 * Displays a single renovation package with selectable interventions.
 */

import {
  Badge,
  Card,
  Checkbox,
  Divider,
  Group,
  NumberInput,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { useEffect } from "react";
import { useHomeAssistant } from "../../hooks/useHomeAssistant";
import type { PackageId } from "../../context/types";
import { useHomeAssistantServices } from "../../hooks/useHomeAssistantServices";
import type { RenovationPackage } from "../../services";
import { formatCostPerSqm } from "../../utils/formatters";

interface PackageCardProps {
  package: RenovationPackage;
}

export function PackageCard({ package: pkg }: PackageCardProps) {
  const { state, dispatch } = useHomeAssistant();
  const { renovation } = useHomeAssistantServices();
  const packageId = pkg.id as PackageId;

  const isSelected = state.renovation.selectedPackages.includes(packageId);
  const selectedInterventions = state.renovation.interventions[packageId] || [];
  const currentCost =
    state.renovation.costs[packageId] || pkg.defaultCostPerSqm;

  // Initialize default interventions when package is selected
  useEffect(() => {
    if (isSelected && selectedInterventions.length === 0) {
      const defaults = renovation.getDefaultInterventions(packageId);
      if (defaults.length > 0) {
        dispatch({
          type: "SET_PACKAGE_INTERVENTIONS",
          packageId,
          interventions: defaults,
        });
      }
    }
  }, [
    isSelected,
    selectedInterventions.length,
    packageId,
    dispatch,
    renovation,
  ]);

  const handlePackageToggle = () => {
    dispatch({ type: "TOGGLE_PACKAGE", packageId });
  };

  const handleInterventionToggle = (interventionId: string) => {
    dispatch({ type: "TOGGLE_INTERVENTION", packageId, interventionId });
  };

  const handleCostChange = (value: number | string) => {
    if (typeof value === "number") {
      dispatch({ type: "UPDATE_PACKAGE_COST", packageId, cost: value });
    }
  };

  // Calculate badge color based on package type
  const badgeColor =
    packageId === "soft"
      ? "green"
      : packageId === "regular"
        ? "blue"
        : "violet";

  return (
    <Card
      withBorder
      radius="md"
      p="lg"
      style={{
        borderColor: isSelected
          ? `var(--mantine-color-${badgeColor}-5)`
          : undefined,
        borderWidth: isSelected ? 2 : 1,
      }}
    >
      <Stack gap="md">
        {/* Package header with checkbox */}
        <Group justify="space-between" align="flex-start">
          <Checkbox
            label={
              <Text fw={600} size="md">
                {pkg.name}
              </Text>
            }
            description={pkg.description}
            checked={isSelected}
            onChange={handlePackageToggle}
            styles={{
              body: { alignItems: "flex-start" },
              label: { paddingLeft: 8 },
              description: { paddingLeft: 8 },
            }}
          />
          <Badge color={badgeColor} variant="light">
            Max {formatCostPerSqm(pkg.maxCostPerSqm)}
          </Badge>
        </Group>

        {/* Interventions - only show when package is selected */}
        {isSelected && (
          <>
            <Divider />

            <Stack gap="xs">
              <Text size="sm" fw={500} c="dimmed">
                Included measures
              </Text>

              {pkg.interventions.map((intervention) => (
                <Group
                  key={intervention.id}
                  justify="space-between"
                  wrap="nowrap"
                >
                  <Checkbox
                    label={intervention.name}
                    checked={selectedInterventions.includes(intervention.id)}
                    onChange={() => handleInterventionToggle(intervention.id)}
                    size="sm"
                  />
                  <Tooltip
                    label={intervention.description}
                    position="left"
                    multiline
                    w={200}
                  >
                    <IconInfoCircle
                      size={16}
                      color="var(--mantine-color-gray-5)"
                      style={{ cursor: "help" }}
                    />
                  </Tooltip>
                </Group>
              ))}
            </Stack>

            <Divider />

            {/* Estimated cost input */}
            <NumberInput
              label="Estimated Cost"
              value={currentCost}
              onChange={handleCostChange}
              suffix=" €/m²"
              min={0}
              max={pkg.maxCostPerSqm}
              step={10}
              size="sm"
            />
          </>
        )}
      </Stack>
    </Card>
  );
}
