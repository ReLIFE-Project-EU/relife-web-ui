/**
 * UnavailableCombinationsAlert — lists archetype/package combinations that
 * were excluded from the analysis. Yellow rather than red: the analysis
 * itself succeeded, these combinations were simply skipped.
 */

import { Alert, Badge, Group, Stack, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import { savingsAvailabilityLabel } from "../../../../services/savingsState";
import { getArchetypeSelectionLabel } from "../../../../utils/archetypeLabels";
import { RSE_UNAVAILABLE_REASONS } from "../../constants";
import { RSE_PACKAGES } from "../../services/rsePackageCatalog";
import type { RSEUnavailableReason, RSEWorkflowResult } from "../../types";

/** Skipped appraisals reuse the shared skip labels, as HRA and PRA do. */
const UNAVAILABLE_REASON_LABELS: Record<RSEUnavailableReason, string> = {
  [RSE_UNAVAILABLE_REASONS.missingCacheEntry]: "No results",
  [RSE_UNAVAILABLE_REASONS.emptyPortfolio]: "Empty portfolio",
  [RSE_UNAVAILABLE_REASONS.incompleteArchetypeRef]:
    "Incomplete archetype reference",
  [RSE_UNAVAILABLE_REASONS.duplicateArchetype]: "Duplicate archetype",
  [RSE_UNAVAILABLE_REASONS.invalidBuildingCount]: "Invalid property count",
  [RSE_UNAVAILABLE_REASONS.invalidFloorArea]: "Invalid floor area",
  [RSE_UNAVAILABLE_REASONS.invalidCacheEntry]: "Invalid results",
  [RSE_UNAVAILABLE_REASONS.costLookupFailed]: "Cost lookup failed",
  [RSE_UNAVAILABLE_REASONS.nonPositiveEnergySavings]:
    savingsAvailabilityLabel["no-savings"],
  [RSE_UNAVAILABLE_REASONS.fullySubsidized]:
    savingsAvailabilityLabel["fully-funded"],
  [RSE_UNAVAILABLE_REASONS.missingCarrierBreakdown]:
    savingsAvailabilityLabel["not-priceable"],
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
      <Stack gap={6}>
        {combinations.map((combo, index) => (
          <Group key={index} gap="xs" wrap="nowrap">
            <Text size="sm" style={{ flex: 1, minWidth: 0 }}>
              {getArchetypeSelectionLabel(combo.archetype)} —{" "}
              {RSE_PACKAGES[combo.packageId]?.label ?? combo.packageId}
            </Text>
            <Badge color="yellow" variant="light" radius="sm">
              {UNAVAILABLE_REASON_LABELS[combo.reason]}
            </Badge>
          </Group>
        ))}
      </Stack>
    </Alert>
  );
}
