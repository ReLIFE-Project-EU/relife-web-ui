/**
 * BuildingDrillDownModal
 * Per-building results breakdown shown in a Mantine Modal.
 *
 * Pulls only existing fields from `BuildingAnalysisResult`. Falls back
 * gracefully when `riskAssessment` or `cashFlowData` are missing.
 */

import {
  Alert,
  Badge,
  Box,
  Group,
  Modal,
  SimpleGrid,
  Stack,
  Table,
  Text,
} from "@mantine/core";
import { IconArrowRight, IconInfoCircle } from "@tabler/icons-react";
import { useMemo } from "react";
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
import type { PRABuilding, BuildingAnalysisResult } from "../../context/types";

interface BuildingDrillDownModalProps {
  opened: boolean;
  onClose: () => void;
  building?: PRABuilding;
  result?: BuildingAnalysisResult;
}

const MAX_VISIBLE_YEARS = 5;

export function BuildingDrillDownModal({
  opened,
  onClose,
  building,
  result,
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

  const cashFlow = useMemo(() => {
    const cfd = fr?.riskAssessment?.cashFlowData;
    if (!cfd || !cfd.years || cfd.years.length === 0) {
      return null;
    }
    const totalYears = cfd.years.length;
    const visibleCount = Math.min(MAX_VISIBLE_YEARS, totalYears);
    let runningCum = -(cfd.initial_investment ?? 0);
    const rows: Array<{
      year: number;
      capex: number;
      savings: number;
      net: number;
      cumulative: number;
    }> = [];
    if (cfd.initial_investment !== undefined) {
      rows.push({
        year: 0,
        capex: -cfd.initial_investment,
        savings: 0,
        net: -cfd.initial_investment,
        cumulative: runningCum,
      });
    }
    for (let i = 0; i < visibleCount; i++) {
      const inflow = cfd.annual_inflows[i] ?? 0;
      const outflow = cfd.annual_outflows[i] ?? 0;
      const net = cfd.annual_net_cash_flow?.[i] ?? inflow - outflow;
      runningCum = cfd.cumulative_cash_flow?.[i] ?? runningCum + net;
      rows.push({
        year: cfd.years[i] ?? i + 1,
        capex: 0,
        savings: inflow,
        net,
        cumulative: runningCum,
      });
    }
    return {
      rows,
      hiddenCount: Math.max(0, totalYears - visibleCount),
    };
  }, [fr]);

  if (!building || !result) {
    return null;
  }

  const isError = result.status === "error";

  const subtitle = [
    archetype ? formatArchetypeName(archetype.name) : null,
    `${formatNumber(building.floorArea)} m²`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="lg"
      title={
        <Stack gap={2}>
          <Text fw={600} size="md">
            {building.name}
          </Text>
          <Text size="xs" c="dimmed">
            {subtitle}
          </Text>
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

            {/* Cash-flow table */}
            <Box>
              <Group justify="space-between" mb="xs">
                <Text fw={600} size="sm">
                  Cash-flow breakdown
                </Text>
                {cashFlow && cashFlow.hiddenCount > 0 && (
                  <Badge size="sm" variant="light" color="gray">
                    +{cashFlow.hiddenCount} more years
                  </Badge>
                )}
              </Group>

              {cashFlow ? (
                <Table withTableBorder withColumnBorders={false} fz="sm">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Year</Table.Th>
                      <Table.Th ta="right">CAPEX / Investment</Table.Th>
                      <Table.Th ta="right">Savings</Table.Th>
                      <Table.Th ta="right">Net</Table.Th>
                      <Table.Th ta="right">Cumulative</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {cashFlow.rows.map((row) => (
                      <Table.Tr key={row.year}>
                        <Table.Td>Year {row.year}</Table.Td>
                        <Table.Td
                          ta="right"
                          c={row.capex < 0 ? "red.7" : "dimmed"}
                        >
                          {row.capex !== 0 ? formatCurrency(row.capex) : "—"}
                        </Table.Td>
                        <Table.Td
                          ta="right"
                          c={row.savings > 0 ? "green.7" : "dimmed"}
                        >
                          {row.savings > 0
                            ? `+${formatCurrency(row.savings)}`
                            : "—"}
                        </Table.Td>
                        <Table.Td
                          ta="right"
                          c={row.net >= 0 ? "green.7" : "red.7"}
                        >
                          {row.net >= 0 ? "+" : ""}
                          {formatCurrency(row.net)}
                        </Table.Td>
                        <Table.Td
                          ta="right"
                          fw={500}
                          c={row.cumulative >= 0 ? "green.7" : "red.7"}
                        >
                          {row.cumulative >= 0 ? "+" : ""}
                          {formatCurrency(row.cumulative)}
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              ) : (
                <Alert
                  color="gray"
                  variant="light"
                  icon={<IconInfoCircle size={16} />}
                >
                  Detailed cash-flow timeline not available for this building.
                </Alert>
              )}
            </Box>
          </>
        )}
      </Stack>
    </Modal>
  );
}
