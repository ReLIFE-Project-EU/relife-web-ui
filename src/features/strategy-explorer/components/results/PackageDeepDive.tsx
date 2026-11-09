/**
 * PackageDeepDive — detail panel for the selected renovation package.
 * Left column: stock-level impact aggregates. Right column: financials.
 * Below: the package's measure list and the per-archetype financial table.
 */

import { Table, Text } from "@mantine/core";
import {
  IconBolt,
  IconBuildingCommunity,
  IconCash,
  IconLeaf,
  IconTool,
  IconTrendingUp,
} from "@tabler/icons-react";
import { ConceptExplainer } from "../../../../components/shared/ConceptExplainer";
import { MetricEyebrow } from "../../../../components/shared/MetricEyebrow";
import {
  compactConceptLabel,
  relifeConcepts,
  type ConceptId,
  type ConceptPrefix,
} from "../../../../constants/relifeConcepts";
import { getArchetypeSelectionLabel } from "../../../../utils/archetypeLabels";
import { ReadingText } from "../../../../components/shared/ReadingText";
import {
  formatMetricValue,
  readMetric,
  readPooledPayback,
} from "../../../../services/appraisalReadout";
import {
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
import classes from "./StrategyResults.module.css";
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
          <Text component="h2" size="md" mb="0.6em">
            Stock impact
          </Text>
          <div className={shared.miniGrid}>
            <MiniMetric
              icon={<IconBuildingCommunity size={14} />}
              conceptId="modeled-property"
              value={formatNumber(aggregate.totalBuildings)}
            />
            {goal.kind === "financial" &&
            aggregate.renovatableBuildingsWithinBudget !== undefined ? (
              <MiniMetric
                icon={<IconBuildingCommunity size={14} />}
                conceptId="rse-renovatable-buildings"
                value={formatNumber(aggregate.renovatableBuildingsWithinBudget)}
              />
            ) : null}
            <MiniMetric
              icon={<IconBolt size={14} />}
              conceptId="rse-total-energy-savings"
              value={formatEnergy(aggregate.totalAnnualEnergySavingsKwh)}
            />
            <MiniMetric
              icon={<IconLeaf size={14} />}
              conceptId="rse-total-co2-reduction"
              value={formatTonnageCo2(aggregate.totalAnnualCo2ReductionTon)}
            />
            <MiniMetric
              icon={<IconBolt size={14} />}
              conceptId="rse-energy-saved-per-eur"
              value={`${formatDecimal(aggregate.energySavedPerEur)} kWh/€`}
            />
            <MiniMetric
              icon={<IconLeaf size={14} />}
              conceptId="rse-co2-reduced-per-eur"
              value={`${formatDecimal(aggregate.co2ReducedTonPerEur * 1000)} kg/€`}
            />
            <MiniMetric
              icon={<IconLeaf size={14} />}
              prefix="Total"
              conceptId="embodied-carbon"
              value={
                aggregate.totalEmbodiedCarbonTon !== undefined
                  ? formatTonnageCo2(aggregate.totalEmbodiedCarbonTon)
                  : "—"
              }
            />
            <MiniMetric
              icon={<IconLeaf size={14} />}
              prefix="Total"
              conceptId="whole-life-carbon"
              value={
                aggregate.totalWholeLifeCarbonTon !== undefined
                  ? formatTonnageCo2(aggregate.totalWholeLifeCarbonTon)
                  : "—"
              }
              hint="over the project lifetime"
            />
          </div>
        </div>

        <div>
          <Text component="h2" size="md" mb="0.6em">
            Financials
          </Text>
          <div className={shared.miniGrid}>
            <MiniMetric
              icon={<IconCash size={14} />}
              prefix="Total"
              conceptId="investment"
              value={formatCurrency(aggregate.totalCapexEur)}
              hint={
                hasIncentive
                  ? `${formatCurrency(aggregate.totalEffectiveCapexEur)} after incentives`
                  : "gross, before incentives"
              }
            />
            <MiniMetric
              icon={<IconTool size={14} />}
              prefix="Total"
              conceptId="annual-maintenance-cost"
              value={formatCurrency(aggregate.totalAnnualMaintenanceEur)}
            />
            <MiniMetric
              icon={<IconCash size={14} />}
              prefix="Total"
              conceptId="npv"
              value={
                aggregateNPV !== undefined
                  ? formatMetricValue("NPV", aggregateNPV)
                  : "—"
              }
              valueColor={
                aggregateNPV !== undefined && aggregateNPV < 0
                  ? "var(--mantine-color-red-7)"
                  : undefined
              }
            />
            <MiniMetric
              icon={<IconTrendingUp size={14} />}
              prefix="Portfolio"
              conceptId="roi"
              value={
                aggregateROI !== undefined
                  ? formatMetricValue("ROI", aggregateROI)
                  : "—"
              }
            />
            <MiniMetric
              icon={<IconTrendingUp size={14} />}
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
          className={classes.measures}
          style={
            {
              "--pkg-color": `var(--mantine-color-${color}-6)`,
            } as React.CSSProperties
          }
        >
          <div className={shared.measuresHead}>
            <Text size="sm" fw={600}>
              {pkg.measureIds.length}{" "}
              {pkg.measureIds.length === 1 ? "measure" : "measures"}
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

interface MiniMetricProps {
  icon: React.ReactNode;
  /** The shared concept the figure reports; it supplies the name and explainer. */
  conceptId: ConceptId;
  prefix?: ConceptPrefix;
  value: React.ReactNode;
  hint?: string;
  valueColor?: string;
}

function MiniMetric({
  icon,
  conceptId,
  prefix,
  value,
  hint,
  valueColor,
}: MiniMetricProps) {
  return (
    <div className={shared.miniCard}>
      {prefix ? <MetricEyebrow>{prefix}</MetricEyebrow> : null}
      <div className={shared.miniLabel}>
        {icon}
        {relifeConcepts[conceptId].label}
        <ConceptExplainer conceptId={conceptId} />
      </div>
      <div className={shared.miniValue} style={{ color: valueColor }}>
        {value}
      </div>
      {hint ? <div className={classes.miniHint}>{hint}</div> : null}
    </div>
  );
}
