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
import type { ConceptId } from "../../../../constants/relifeConcepts";
import { getArchetypeSelectionLabel } from "../../../../utils/archetypeLabels";
import {
  formatCurrency,
  formatDecimal,
  formatEnergy,
  formatNumber,
  formatTonnageCo2,
  formatYears,
} from "../../../../utils/formatters";
import { RSE_PACKAGES } from "../../services/rsePackageCatalog";
import type { RSEPackageAggregate, RSERenovationGoal } from "../../types";
import {
  decodeArchetypeKey,
  PACKAGE_COLORS,
  RSE_MEASURE_LABELS,
} from "./rseResultsVm";
import classes from "./StrategyResults.module.css";

interface PackageDeepDiveProps {
  aggregate: RSEPackageAggregate;
  goal: RSERenovationGoal;
}

export function PackageDeepDive({ aggregate, goal }: PackageDeepDiveProps) {
  const pkg = RSE_PACKAGES[aggregate.packageId];
  const color = PACKAGE_COLORS[aggregate.packageId];
  const { aggregateNPV, aggregateROI, aggregatePaybackYears } =
    aggregate.financialIndicators;
  const hasIncentive =
    aggregate.totalEffectiveCapexEur !== aggregate.totalCapexEur;

  return (
    <div className={classes.deep}>
      <div className={classes.deepCols}>
        <div>
          <Text component="h2" size="md" mb="0.6em">
            Stock impact
          </Text>
          <div className={classes.miniGrid}>
            <MiniMetric
              icon={<IconBuildingCommunity size={14} />}
              label="Buildings"
              value={formatNumber(aggregate.totalBuildings)}
            />
            {goal.kind === "financial" &&
            aggregate.renovatableBuildingsWithinBudget !== undefined ? (
              <MiniMetric
                icon={<IconBuildingCommunity size={14} />}
                label="Within budget"
                conceptId="rse-renovatable-buildings"
                value={formatNumber(aggregate.renovatableBuildingsWithinBudget)}
                hint="renovatable with this package"
              />
            ) : null}
            <MiniMetric
              icon={<IconBolt size={14} />}
              label="Energy savings"
              conceptId="rse-total-energy-savings"
              value={formatEnergy(aggregate.totalAnnualEnergySavingsKwh)}
              hint="per year"
            />
            <MiniMetric
              icon={<IconLeaf size={14} />}
              label="CO₂ reduction"
              conceptId="rse-total-co2-reduction"
              value={formatTonnageCo2(aggregate.totalAnnualCo2ReductionTon)}
              hint="per year"
            />
            <MiniMetric
              icon={<IconBolt size={14} />}
              label="Energy saved / €"
              conceptId="rse-energy-saved-per-eur"
              value={`${formatDecimal(aggregate.energySavedPerEur)} kWh/€`}
            />
            <MiniMetric
              icon={<IconLeaf size={14} />}
              label="CO₂ reduced / €"
              conceptId="rse-co2-reduced-per-eur"
              value={`${formatDecimal(aggregate.co2ReducedTonPerEur * 1000)} kg/€`}
            />
          </div>
        </div>

        <div>
          <Text component="h2" size="md" mb="0.6em">
            Financials
          </Text>
          <div className={classes.miniGrid}>
            <MiniMetric
              icon={<IconCash size={14} />}
              label="Investment"
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
              label="Annual maintenance"
              value={formatCurrency(aggregate.totalAnnualMaintenanceEur)}
              hint="per year"
            />
            <MiniMetric
              icon={<IconCash size={14} />}
              label="Aggregate NPV"
              conceptId="npv"
              value={
                aggregateNPV !== undefined ? formatCurrency(aggregateNPV) : "—"
              }
              valueColor={
                aggregateNPV !== undefined && aggregateNPV < 0
                  ? "var(--mantine-color-red-7)"
                  : undefined
              }
            />
            <MiniMetric
              icon={<IconTrendingUp size={14} />}
              label="Aggregate ROI"
              conceptId="roi"
              value={
                aggregateROI !== undefined
                  ? `${formatDecimal(aggregateROI * 100)}%`
                  : "—"
              }
            />
            <MiniMetric
              icon={<IconTrendingUp size={14} />}
              label="Aggregate payback"
              conceptId="payback-period"
              value={
                aggregatePaybackYears !== undefined
                  ? formatYears(aggregatePaybackYears)
                  : "—"
              }
            />
          </div>
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <div className={classes.deepEyebrow} style={{ marginBottom: 6 }}>
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
          <div className={classes.measuresHead}>
            <Text size="sm" fw={600}>
              {pkg.measureIds.length}{" "}
              {pkg.measureIds.length === 1 ? "measure" : "measures"}
            </Text>
          </div>
          <ul className={classes.measuresList}>
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
  const perArchetype = aggregate.financialIndicators.perArchetypeOnly;
  const archetypeKeys = perArchetype
    ? Array.from(
        new Set([
          ...Object.keys(perArchetype.IRR ?? {}),
          ...Object.keys(perArchetype.PBP ?? {}),
          ...Object.keys(perArchetype.DPP ?? {}),
        ]),
      ).sort()
    : [];

  if (archetypeKeys.length === 0) {
    return null;
  }

  return (
    <div style={{ marginTop: 18 }}>
      <div className={classes.deepEyebrow} style={{ marginBottom: 6 }}>
        Per-archetype indicators
      </div>
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Archetype</Table.Th>
            <Table.Th>Category</Table.Th>
            <Table.Th>IRR</Table.Th>
            <Table.Th>Payback</Table.Th>
            <Table.Th>Discounted payback</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {archetypeKeys.map((key) => {
            const archetype = decodeArchetypeKey(key);
            const irr = perArchetype?.IRR?.[key];
            const pbp = perArchetype?.PBP?.[key];
            const dpp = perArchetype?.DPP?.[key];
            return (
              <Table.Tr key={key}>
                <Table.Td>{getArchetypeSelectionLabel(archetype)}</Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed" component="span">
                    {archetype.category}
                  </Text>
                </Table.Td>
                <Table.Td>
                  {irr !== undefined ? `${formatDecimal(irr * 100)}%` : "—"}
                </Table.Td>
                <Table.Td>
                  {pbp !== undefined ? formatYears(pbp) : "—"}
                </Table.Td>
                <Table.Td>
                  {dpp !== undefined ? formatYears(dpp) : "—"}
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
  label: string;
  value: string;
  /** Concept backing this metric; renders the info-icon explainer. */
  conceptId?: ConceptId;
  hint?: string;
  valueColor?: string;
}

function MiniMetric({
  icon,
  label,
  value,
  conceptId,
  hint,
  valueColor,
}: MiniMetricProps) {
  return (
    <div className={classes.miniCard}>
      <div className={classes.miniLabel}>
        {icon}
        {label}
        {conceptId ? <ConceptExplainer conceptId={conceptId} /> : null}
      </div>
      <div className={classes.miniValue} style={{ color: valueColor }}>
        {value}
      </div>
      {hint ? <div className={classes.miniHint}>{hint}</div> : null}
    </div>
  );
}
