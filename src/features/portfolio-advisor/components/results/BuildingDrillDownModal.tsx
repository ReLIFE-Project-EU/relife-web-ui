/**
 * BuildingDrillDownModal
 * Per-building results breakdown shown in a Mantine Modal.
 *
 * Pulls only existing fields from `BuildingAnalysisResult`. Falls back
 * gracefully when professional risk analytics are missing.
 *
 * The verdict (lifetime NPV and payback) sits in a sticky header rather than
 * in the metric grid, so it stays readable while the risk detail is scrolled.
 */

import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Group,
  Modal,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import { IconArrowRight, IconInfoCircle, IconX } from "@tabler/icons-react";
import { ConceptMetricCard } from "../../../../components/shared/ConceptMetricCard";
import { EPCBadge } from "../../../../components/shared/EPCBadge";
import { ErrorAlert } from "../../../../components/shared/ErrorAlert";
import { MetricEyebrow } from "../../../../components/shared/MetricEyebrow";
import {
  resolveSavingsAvailability,
  savingsAvailabilityExplanation,
  savingsAvailabilityLabel,
} from "../../../../services/savingsState";
import { MetricCard } from "../../../../components/shared/MetricCard";
import {
  formatCurrency,
  formatDecimal,
  formatNumber,
  formatPaybackYears,
  formatTonnageCo2,
  getEnergyReduction,
} from "../../../../utils/formatters";
import { computeLifetimeCarbonKgCo2e } from "../../../../services/carrierSavingsService";
import { formatArchetypeName } from "../../../../utils/archetypeLabels";
import { CashFlowChart } from "../../../../components/shared/CashFlowChart";
import { baselineScenarioOf, renovatedOf } from "../../services/scenarioLookup";
import type { PRABuilding, BuildingAnalysisResult } from "../../context/types";
import { FinancialRiskAnalytics } from "./FinancialRiskAnalytics";

const MODAL_WIDTH = 880;
const KG_PER_TONNE = 1000;

interface BuildingDrillDownModalProps {
  opened: boolean;
  onClose: () => void;
  building?: PRABuilding;
  result?: BuildingAnalysisResult;
  projectLifetime?: number;
}

/** One half of the header verdict: an uppercase eyebrow over a large figure. */
function VerdictStat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <Stack gap={0} align="flex-end">
      <MetricEyebrow>{label}</MetricEyebrow>
      <Text
        fz={22}
        fw={700}
        c={color}
        style={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}
      >
        {value}
      </Text>
    </Stack>
  );
}

export function BuildingDrillDownModal({
  opened,
  onClose,
  building,
  result,
  projectLifetime,
}: BuildingDrillDownModalProps) {
  const archetype = result?.estimation?.archetype;
  const renovated = result ? renovatedOf(result) : undefined;
  const baseline = result ? baselineScenarioOf(result) : undefined;
  const fr = result?.financialResults;

  const co2Before = baseline?.annualEmissionsTonCo2e;
  const co2After = renovated?.annualEmissionsTonCo2e;
  const embodiedCarbonKg = renovated?.embodiedCarbonKgCo2e;

  const energyReduction = getEnergyReduction(
    result?.estimation?.annualEnergyNeeds,
    renovated?.annualEnergyNeeds,
  );

  const epcBefore = result?.estimation?.estimatedEPC;
  const epcAfter = renovated?.epcClass;
  const cashFlowData = fr?.riskAssessment?.cashFlowData;
  const availability = resolveSavingsAvailability(renovated, fr);
  const appraised = availability === "appraised";
  const horizonYears =
    projectLifetime ?? fr?.riskAssessment?.metadata.project_lifetime;
  const lifetimeCarbonKg = computeLifetimeCarbonKgCo2e({
    embodiedCarbonKgCo2e: embodiedCarbonKg,
    annualOperationalEmissionsTonCo2e: co2After,
    projectLifetimeYears: horizonYears,
  });

  if (!building || !result) {
    return null;
  }

  const isError = result.status === "error";
  const wasAutoMatched = !building.archetypeName && !!archetype;
  // A skipped appraisal leaves placeholder zeros on the result, so these read
  // as a real €0 and a real payback unless gated.
  const showVerdict = !isError && fr && appraised;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size={MODAL_WIDTH}
      padding={0}
      withCloseButton={false}
    >
      <Box
        px="lg"
        py="md"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 1,
          backgroundColor: "var(--mantine-color-body)",
          borderBottom: "1px solid var(--mantine-color-gray-2)",
        }}
      >
        <Group
          justify="space-between"
          align="flex-start"
          wrap="nowrap"
          gap="md"
        >
          <Stack gap={3} style={{ minWidth: 0 }}>
            <Text fz="lg" fw={700}>
              {building.name}
            </Text>
            <Group gap={6} wrap="wrap">
              <Text size="xs" c="dimmed">
                {archetype ? (
                  formatArchetypeName(archetype.name)
                ) : (
                  <Text span size="xs" c="dimmed" fs="italic">
                    Matched archetype not available
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

          <Group gap="lg" wrap="nowrap" align="flex-start">
            {!isError && (
              <>
                <VerdictStat
                  label="Lifetime NPV"
                  value={showVerdict ? formatCurrency(fr.netPresentValue) : "—"}
                  color="relife.7"
                />
                <VerdictStat
                  label="Payback"
                  value={
                    showVerdict
                      ? formatPaybackYears(
                          fr.paybackTime,
                          fr.riskAssessment?.metadata.project_lifetime,
                        )
                      : "—"
                  }
                />
              </>
            )}
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={onClose}
              aria-label="Close building breakdown"
            >
              <IconX size={18} />
            </ActionIcon>
          </Group>
        </Group>
      </Box>

      <Box p="lg">
        <Stack gap="xl">
          {isError ? (
            <ErrorAlert
              error={result.error ?? "Analysis failed for this building."}
              title="Analysis error"
            />
          ) : (
            <>
              <Stack gap="xs">
                <MetricEyebrow>Energy &amp; carbon impact</MetricEyebrow>
                <SimpleGrid cols={{ base: 2, sm: 3, md: 5 }} spacing="sm">
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
                  <ConceptMetricCard
                    conceptId="operational-co2-emissions"
                    value={
                      co2Before !== undefined && co2After !== undefined ? (
                        <Stack gap={0}>
                          <Group gap="xs" wrap="nowrap" align="baseline">
                            <Text span fz="md" fw={500} c="dimmed">
                              {formatDecimal(co2Before)}
                            </Text>
                            <IconArrowRight
                              size={14}
                              color="var(--mantine-color-gray-5)"
                            />
                            <Text span fz={20} fw={600}>
                              {formatDecimal(co2After)}
                            </Text>
                          </Group>
                          {co2Before !== co2After ? (
                            <Text
                              fz={11}
                              fw={600}
                              c={co2After < co2Before ? "green" : "red"}
                            >
                              {co2After < co2Before ? "−" : "+"}
                              {formatTonnageCo2(
                                Math.abs(co2After - co2Before),
                                { decimal: true },
                              )}
                              /year
                            </Text>
                          ) : null}
                        </Stack>
                      ) : (
                        "—"
                      )
                    }
                  />
                  <ConceptMetricCard
                    conceptId="embodied-carbon"
                    value={
                      embodiedCarbonKg !== undefined
                        ? formatTonnageCo2(embodiedCarbonKg / KG_PER_TONNE, {
                            decimal: true,
                          })
                        : "—"
                    }
                  />
                  <ConceptMetricCard
                    conceptId="whole-life-carbon"
                    value={
                      lifetimeCarbonKg !== undefined
                        ? formatTonnageCo2(lifetimeCarbonKg / KG_PER_TONNE, {
                            decimal: true,
                          })
                        : "—"
                    }
                  />
                </SimpleGrid>
              </Stack>

              {!appraised && (
                <Alert
                  color={availability === "fully-funded" ? "teal" : "yellow"}
                  variant="light"
                  icon={<IconInfoCircle size={16} />}
                  title={savingsAvailabilityLabel[availability]}
                >
                  {savingsAvailabilityExplanation[availability]}
                </Alert>
              )}

              {(result.costSource?.capexFromLookup ||
                result.costSource?.opexFromLookup) && (
                <Alert
                  color="blue"
                  variant="light"
                  icon={<IconInfoCircle size={16} />}
                >
                  {result.costSource.capexFromLookup &&
                  result.costSource.opexFromLookup
                    ? "CAPEX and annual maintenance cost were estimated from EU reference data"
                    : result.costSource.capexFromLookup
                      ? "CAPEX was estimated from EU reference data"
                      : "Annual maintenance cost was estimated from EU reference data"}{" "}
                  (no cost override was set for this building).
                  {result.costSource.usesHeatingStopgap && (
                    <>
                      {" "}
                      The heating-system capacity was sized from floor area as a
                      temporary heuristic, so the heating portion of CAPEX is
                      preliminary.
                    </>
                  )}
                </Alert>
              )}

              <FinancialRiskAnalytics financialResults={fr} />

              {cashFlowData && cashFlowData.years.length > 0 ? (
                <CashFlowChart
                  data={cashFlowData}
                  projectLifetime={horizonYears}
                  title="Cash flow timeline"
                />
              ) : appraised ? (
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
      </Box>
    </Modal>
  );
}
