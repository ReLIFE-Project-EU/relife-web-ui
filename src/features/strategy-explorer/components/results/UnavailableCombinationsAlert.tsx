/**
 * UnavailableCombinationsAlert — lists archetype/package combinations that
 * were excluded from the analysis. Yellow rather than red: the analysis
 * itself succeeded, these combinations were simply skipped.
 */

import { Alert, Badge, Group, Stack, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import { getArchetypeSelectionLabel } from "../../../../utils/archetypeLabels";
import { RSE_UNAVAILABLE_REASONS } from "../../constants";
import { RSE_PACKAGES } from "../../services/rsePackageCatalog";
import type { RSEUnavailableReason, RSEWorkflowResult } from "../../types";

const UNAVAILABLE_REASON_LABELS: Partial<Record<RSEUnavailableReason, string>> =
  {
    [RSE_UNAVAILABLE_REASONS.missingCacheEntry]: "missing cache entry",
    [RSE_UNAVAILABLE_REASONS.emptyPortfolio]: "empty portfolio",
    [RSE_UNAVAILABLE_REASONS.incompleteArchetypeRef]:
      "incomplete archetype reference",
    [RSE_UNAVAILABLE_REASONS.duplicateArchetype]: "duplicate archetype",
    [RSE_UNAVAILABLE_REASONS.invalidBuildingCount]: "invalid building count",
    [RSE_UNAVAILABLE_REASONS.invalidFloorArea]: "invalid floor area",
    [RSE_UNAVAILABLE_REASONS.invalidPackageData]: "invalid package data",
    [RSE_UNAVAILABLE_REASONS.invalidCacheEntry]: "invalid cache entry",
    [RSE_UNAVAILABLE_REASONS.nonPositiveEnergySavings]:
      "non-positive energy savings",
  };

interface UnavailableCombinationsAlertProps {
  combinations: RSEWorkflowResult["unavailableCombinations"];
}

export function UnavailableCombinationsAlert({
  combinations,
}: UnavailableCombinationsAlertProps) {
  return (
    <Alert
      color="yellow"
      icon={<IconAlertTriangle size={16} />}
      title="Some combinations were excluded"
    >
      <Text size="sm" mb="sm">
        The following archetype and package combinations could not be analyzed
        and are not part of the results:
      </Text>
      <Stack gap={6}>
        {combinations.map((combo, index) => (
          <Group key={index} gap="xs" wrap="nowrap">
            <Text size="sm" style={{ flex: 1, minWidth: 0 }}>
              {getArchetypeSelectionLabel(combo.archetype)} —{" "}
              {RSE_PACKAGES[combo.packageId]?.label ?? combo.packageId}
            </Text>
            <Badge color="yellow" variant="light" radius="sm">
              {UNAVAILABLE_REASON_LABELS[combo.reason] ?? combo.reason}
            </Badge>
          </Group>
        ))}
      </Stack>
    </Alert>
  );
}
