/**
 * PackageDeepDive — detail panel for the selected renovation package.
 * Left column: stock-level impact aggregates. Right column: financials.
 * Below: the package's measure list and the per-archetype financial table.
 */

import { Table, Text } from "@mantine/core";
import { ConceptMetricCard } from "../../../../components/shared/ConceptMetricCard";
import {
  compactConceptLabel,
  relifeConcepts,
} from "../../../../constants/relifeConcepts";
import { gainLossColor } from "../../../../utils/colorUtils";
import { getArchetypeSelectionLabel } from "../../../../utils/archetypeLabels";
import { ReadingText } from "../../../../components/shared/ReadingText";
import {
  formatMetricValue,
  readMetric,
  readPooledPayback,
} from "../../../../services/appraisalReadout";
import {
  formatCount,
  formatCurrency,
  formatDecimal,
  formatEnergy,
  formatNumber,
  formatTonnageCo2,
} from "../../../../utils/formatters";
import { RSE_PACKAGES } from "../../services/rsePackageCatalog";
import type { RSEPackageAggregate, RSERenovationGoal } from "../../types";
import {
  decodeArchetypeKey,
  PACKAGE_COLORS,
  RSE_MEASURE_LABELS,
} from "./rseResultsVm";
import shared from "../../../../components/shared/ResultsLayout.module.css";

interface PackageDeepDiveProps {
  aggregate: RSEPackageAggregate;
  goal: RSERenovationGoal;
}

export function PackageDeepDive({ aggregate, goal }: PackageDeepDiveProps) {
  const pkg = RSE_PACKAGES[aggregate.packageId];
  const color = PACKAGE_COLORS[aggregate.packageId];
  const { aggregateNPV, aggregateROI, aggregatePayback } =
    aggregate.financialIndicators;
  const hasIncentive =
    aggregate.totalEffectiveCapexEur !== aggregate.totalCapexEur;

  return (
    <div className={shared.deep}>
      <div className={shared.deepCols}>
        <div>
          <h3 className={shared.deepHeading}>Stock impact</h3>
          <div className={shared.tileGrid}>
            <ConceptMetricCard
              conceptId="modeled-property"
              value={formatNumber(aggregate.totalBuildings)}
            />
            {goal.kind === "financial" &&
            aggregate.renovatableBuildingsWithinBudget !== undefined ? (
              <ConceptMetricCard
                conceptId="rse-renovatable-buildings"
                value={formatNumber(aggregate.renovatableBuildingsWithinBudget)}
              />
            ) : null}
            <ConceptMetricCard
              conceptId="rse-total-energy-savings"
              value={formatEnergy(aggregate.totalAnnualEnergySavingsKwh)}
            />
            <ConceptMetricCard
              conceptId="rse-total-co2-reduction"
              value={formatTonnageCo2(aggregate.totalAnnualCo2ReductionTon)}
            />
            <ConceptMetricCard
              conceptId="rse-energy-saved-per-eur"
              value={`${formatDecimal(aggregate.energySavedPerEur)} kWh/€`}
            />
            <ConceptMetricCard
              conceptId="rse-co2-reduced-per-eur"
              value={`${formatDecimal(aggregate.co2ReducedTonPerEur * 1000)} kg/€`}
            />
            <ConceptMetricCard
              prefix="Total"
              conceptId="embodied-carbon"
              value={
                aggregate.totalEmbodiedCarbonTon !== undefined
                  ? formatTonnageCo2(aggregate.totalEmbodiedCarbonTon)
                  : "—"
              }
            />
            <ConceptMetricCard
              prefix="Total"
              conceptId="whole-life-carbon"
              value={
                aggregate.totalWholeLifeCarbonTon !== undefined
                  ? formatTonnageCo2(aggregate.totalWholeLifeCarbonTon)
                  : "—"
              }
              footer="over the project lifetime"
            />
          </div>
        </div>

        <div>
          <h3 className={shared.deepHeading}>Financials</h3>
          <div className={shared.tileGrid}>
            <ConceptMetricCard
              prefix="Total"
              conceptId="investment"
              value={formatCurrency(aggregate.totalCapexEur)}
              footer={
                hasIncentive
                  ? `${formatCurrency(aggregate.totalEffectiveCapexEur)} after incentives`
                  : "gross, before incentives"
              }
            />
            <ConceptMetricCard
              prefix="Total"
              conceptId="annual-maintenance-cost"
              value={formatCurrency(aggregate.totalAnnualMaintenanceEur)}
            />
            <ConceptMetricCard
              prefix="Total"
              conceptId="npv"
              value={
                aggregateNPV !== undefined
                  ? formatMetricValue("NPV", aggregateNPV)
                  : "—"
              }
              valueColor={gainLossColor(aggregateNPV)}
            />
            <ConceptMetricCard
              prefix="Portfolio"
              conceptId="roi"
              value={
                aggregateROI !== undefined
                  ? formatMetricValue("ROI", aggregateROI)
                  : "—"
              }
            />
            <ConceptMetricCard
              prefix="Portfolio"
              conceptId="payback-period"
              value={
                <ReadingText reading={readPooledPayback(aggregatePayback)} />
              }
            />
          </div>
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <div className={shared.deepEyebrow} style={{ marginBottom: 6 }}>
          Measures included
        </div>
        <div
          className={shared.measures}
          style={
            {
              "--accent-color": `var(--mantine-color-${color}-6)`,
            } as React.CSSProperties
          }
        >
          <div className={shared.measuresHead}>
            <Text size="sm" fw={600}>
              {formatCount(pkg.measureIds.length, "measure")}
            </Text>
          </div>
          <ul className={shared.measuresList}>
            {pkg.measureIds.map((measureId) => (
              <li key={measureId}>{RSE_MEASURE_LABELS[measureId]}</li>
            ))}
          </ul>
        </div>
      </div>

      <PerArchetypeTable aggregate={aggregate} />
    </div>
  );
}

function PerArchetypeTable({ aggregate }: { aggregate: RSEPackageAggregate }) {
  const appraisals = aggregate.financialIndicators.perArchetypeAppraisals;
  const archetypeKeys = Object.keys(appraisals ?? {}).sort();

  if (!appraisals || archetypeKeys.length === 0) {
    return null;
  }

  return (
    <div style={{ marginTop: 18 }}>
      <div className={shared.deepEyebrow} style={{ marginBottom: 6 }}>
        Per-archetype indicators
      </div>
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Archetype</Table.Th>
            <Table.Th>Category</Table.Th>
            <Table.Th>{compactConceptLabel("irr")}</Table.Th>
            <Table.Th>{relifeConcepts["payback-period"].label}</Table.Th>
            <Table.Th>
              {compactConceptLabel("discounted-payback-period")}
            </Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {archetypeKeys.map((key) => {
            const archetype = decodeArchetypeKey(key);
            const appraisal = appraisals[key];
            return (
              <Table.Tr key={key}>
                <Table.Td>{getArchetypeSelectionLabel(archetype)}</Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed" component="span">
                    {archetype.category}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <ReadingText reading={readMetric(appraisal, "IRR")} />
                </Table.Td>
                <Table.Td>
                  <ReadingText reading={readMetric(appraisal, "PBP")} />
                </Table.Td>
                <Table.Td>
                  <ReadingText reading={readMetric(appraisal, "DPP")} />
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    </div>
  );
}
