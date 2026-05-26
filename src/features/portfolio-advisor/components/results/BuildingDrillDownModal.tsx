/**
 * BuildingDrillDownModal
 * Per-building results breakdown shown in a Mantine Modal.
 *
 * Pulls only existing fields from `BuildingAnalysisResult`. Falls back
 * gracefully when professional risk analytics are missing.
 */

import {
  Alert,
  Badge,
  Group,
  Modal,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import { IconArrowRight, IconInfoCircle } from "@tabler/icons-react";
import { EPCBadge } from "../../../../components/shared/EPCBadge";
import { ErrorAlert } from "../../../../components/shared/ErrorAlert";
import { MetricCard } from "../../../../components/shared/MetricCard";
import {
  calculatePercentChange,
  formatCurrency,
  formatDecimal,
  formatNumber,
} from "../../../../utils/formatters";
import { formatArchetypeName } from "../../../../utils/archetypeLabels";
import { CashFlowChart } from "../../../../components/shared/CashFlowChart";
import type { PRABuilding, BuildingAnalysisResult } from "../../context/types";
import { FinancialRiskAnalytics } from "./FinancialRiskAnalytics";

interface BuildingDrillDownModalProps {
  opened: boolean;
  onClose: () => void;
  building?: PRABuilding;
  result?: BuildingAnalysisResult;
  projectLifetime?: number;
}

export function BuildingDrillDownModal({
  opened,
  onClose,
  building,
  result,
  projectLifetime,
}: BuildingDrillDownModalProps) {
  const archetype = result?.estimation?.archetype;
  const renovated = result?.scenarios?.find((s) => s.id === "renovated");
  const fr = result?.financialResults;

  const energyBefore = result?.estimation?.annualEnergyNeeds;
  const energyAfter = renovated?.annualEnergyNeeds;
  const energyReduction =
    energyBefore !== undefined && energyAfter !== undefined && energyBefore > 0
      ? calculatePercentChange(energyBefore, energyAfter)
      : undefined;

  const epcBefore = result?.estimation?.estimatedEPC;
  const epcAfter = renovated?.epcClass;
  const cashFlowData = fr?.riskAssessment?.cashFlowData;
  const horizonYears =
    projectLifetime ??
    fr?.riskAssessment?.metadata.project_lifetime ??
    undefined;

  if (!building || !result) {
    return null;
  }

  const isError = result.status === "error";
  const wasAutoMatched = !building.archetypeName && !!archetype;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="xl"
      title={
        <Stack gap={2}>
          <Text fw={600} size="md">
            {building.name}
          </Text>
          <Group gap={6} wrap="wrap">
            <Text size="xs" c="dimmed">
              Matched archetype:{" "}
              {archetype ? (
                <Text span size="xs" c="dimmed" fw={500}>
                  {formatArchetypeName(archetype.name)}
                </Text>
              ) : (
                <Text span size="xs" c="dimmed" fs="italic">
                  not available
                </Text>
              )}
            </Text>
            {wasAutoMatched && (
              <Badge color="gray" variant="light" size="xs">
                Auto-matched
              </Badge>
            )}
            <Text size="xs" c="dimmed">
              · {formatNumber(building.floorArea)} m²
            </Text>
          </Group>
        </Stack>
      }
    >
      <Stack gap="md">
        {isError ? (
          <ErrorAlert
            error={result.error ?? "Analysis failed for this building."}
            title="Analysis error"
          />
        ) : (
          <>
            {/* Top metrics */}
            <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
              <MetricCard
                label="EPC shift"
                value={
                  epcBefore && epcAfter ? (
                    <Group gap={6} wrap="nowrap">
                      <EPCBadge epcClass={epcBefore} size="sm" estimated />
                      <IconArrowRight
                        size={14}
                        color="var(--mantine-color-gray-5)"
                      />
                      <EPCBadge epcClass={epcAfter} size="sm" estimated />
                    </Group>
                  ) : (
                    "—"
                  )
                }
              />
              <MetricCard
                label="Energy reduction"
                value={
                  energyReduction !== undefined
                    ? `${formatDecimal(energyReduction)}%`
                    : "—"
                }
              />
              <MetricCard
                label="Lifetime NPV"
                value={fr ? formatCurrency(fr.netPresentValue) : "—"}
                variant="highlight"
              />
              <MetricCard
                label="Payback"
                value={fr ? `${formatDecimal(fr.paybackTime)} years` : "—"}
              />
            </SimpleGrid>

            {/* No-savings hint */}
            {fr?.riskAssessment === null && renovated && (
              <Alert
                color="yellow"
                variant="light"
                icon={<IconInfoCircle size={16} />}
              >
                This building&apos;s current specifications already meet the
                targets for the selected renovation measures. Financial
                indicators are not meaningful here.
              </Alert>
            )}

            <FinancialRiskAnalytics financialResults={fr} />

            {cashFlowData && cashFlowData.years.length > 0 ? (
              <CashFlowChart
                data={cashFlowData}
                projectLifetime={horizonYears}
                title="Cash flow timeline"
              />
            ) : fr?.riskAssessment !== null && renovated ? (
              <Alert
                color="gray"
                variant="light"
                icon={<IconInfoCircle size={16} />}
              >
                Detailed cash-flow timeline not available for this building.
              </Alert>
            ) : null}
          </>
        )}
      </Stack>
    </Modal>
  );
}
