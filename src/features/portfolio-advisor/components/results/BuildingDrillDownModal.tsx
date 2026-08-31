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
import { ConceptMetricCard } from "../../../../components/shared/ConceptMetricCard";
import { EPCBadge } from "../../../../components/shared/EPCBadge";
import { ErrorAlert } from "../../../../components/shared/ErrorAlert";
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
              <ConceptMetricCard
                conceptId="operational-co2-emissions"
                value={
                  co2Before !== undefined && co2After !== undefined ? (
                    <Stack gap={0}>
                      <Group gap={6} wrap="nowrap">
                        <Text span size="lg" fw={600}>
                          {formatTonnageCo2(co2Before, { decimal: true })}
                        </Text>
                        <IconArrowRight
                          size={14}
                          color="var(--mantine-color-gray-5)"
                        />
                        <Text span size="lg" fw={600}>
                          {formatTonnageCo2(co2After, { decimal: true })}
                        </Text>
                      </Group>
                      {co2Before !== co2After ? (
                        <Text
                          size="xs"
                          fw={600}
                          c={co2After < co2Before ? "green" : "red"}
                        >
                          {co2After < co2Before ? "−" : "+"}
                          {formatTonnageCo2(Math.abs(co2After - co2Before), {
                            decimal: true,
                          })}
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
                    ? formatTonnageCo2(embodiedCarbonKg / 1000, {
                        decimal: true,
                      })
                    : "—"
                }
              />
              <ConceptMetricCard
                conceptId="whole-life-carbon"
                value={
                  lifetimeCarbonKg !== undefined
                    ? formatTonnageCo2(lifetimeCarbonKg / 1000, {
                        decimal: true,
                      })
                    : "—"
                }
              />
              {/* A skipped appraisal leaves placeholder zeros on the result, so
                  these read as a real €0 and a real payback unless gated. */}
              <MetricCard
                label="Lifetime NPV"
                value={
                  fr && appraised ? formatCurrency(fr.netPresentValue) : "—"
                }
                variant="highlight"
              />
              <MetricCard
                label="Payback"
                value={
                  fr && appraised
                    ? formatPaybackYears(
                        fr.paybackTime,
                        fr.riskAssessment?.metadata.project_lifetime,
                      )
                    : "—"
                }
              />
            </SimpleGrid>

            {/* No-savings hint */}
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

            {(result?.costSource?.capexFromLookup ||
              result?.costSource?.opexFromLookup) && (
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
    </Modal>
  );
}
