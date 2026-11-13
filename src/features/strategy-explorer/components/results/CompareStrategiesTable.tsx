/**
 * CompareStrategiesTable — sortable comparison table at the bottom of the
 * results screen. One row per ranked package; row click syncs the shared
 * deep-dive selection. Goal-specific ranking columns come first, followed by
 * the always-on stock aggregates.
 */

import { useState } from "react";
import { Text } from "@mantine/core";
import {
  IconChevronDown,
  IconChevronUp,
  IconCrown,
  IconSelector,
} from "@tabler/icons-react";
import {
  compactConceptLabel,
  relifeConcepts,
  type ConceptPrefix,
} from "../../../../constants/relifeConcepts";
import { ConceptExplainer } from "../../../../components/shared/ConceptExplainer";
import { MetricEyebrow } from "../../../../components/shared/MetricEyebrow";
import {
  formatCurrency,
  formatEnergy,
  formatNumber,
  formatTonnageCo2,
} from "../../../../utils/formatters";
import { RSE_PACKAGES } from "../../services/rsePackageCatalog";
import type {
  RSEPackageAggregate,
  RSEPackageId,
  RSERankingResult,
  RSERenovationGoal,
} from "../../types";
import { ColorDot, ScoreBar } from "../../../../components/shared/ResultAtoms";
import {
  getAggregateValue,
  PACKAGE_COLORS,
  RANKING_COLUMNS,
  type RankingColumn,
} from "./rseResultsVm";
import classes from "./StrategyResults.module.css";
import shared from "../../../../components/shared/ResultsLayout.module.css";

const ALWAYS_ON_COLUMNS: RankingColumn[] = [
  {
    key: "totalBuildings",
    conceptId: "modeled-property",
    formatter: formatNumber,
  },
  {
    key: "totalCapexEur",
    conceptId: "investment",
    prefix: "Total",
    formatter: formatCurrency,
  },
  {
    key: "totalAnnualEnergySavingsKwh",
    conceptId: "rse-total-energy-savings",
    formatter: formatEnergy,
  },
  {
    key: "totalAnnualCo2ReductionTon",
    conceptId: "rse-total-co2-reduction",
    formatter: formatTonnageCo2,
  },
  {
    key: "totalEmbodiedCarbonTon",
    conceptId: "embodied-carbon",
    prefix: "Total",
    formatter: formatTonnageCo2,
  },
  {
    key: "totalWholeLifeCarbonTon",
    conceptId: "whole-life-carbon",
    prefix: "Total",
    formatter: formatTonnageCo2,
  },
];

interface SortState {
  key: string;
  dir: "asc" | "desc";
}

interface CompareStrategiesTableProps {
  rankings: RSERankingResult[];
  aggregates: RSEPackageAggregate[];
  goal: RSERenovationGoal;
  selectedPackageId: RSEPackageId;
  onSelectPackage: (packageId: RSEPackageId) => void;
}

export function CompareStrategiesTable({
  rankings,
  aggregates,
  goal,
  selectedPackageId,
  onSelectPackage,
}: CompareStrategiesTableProps) {
  const [sort, setSort] = useState<SortState>({ key: "rank", dir: "asc" });

  const goalColumns = RANKING_COLUMNS[goal.kind];
  const goalKeys = new Set(goalColumns.map((col) => col.key));
  const metricColumns = [
    ...goalColumns,
    ...ALWAYS_ON_COLUMNS.filter((col) => !goalKeys.has(col.key)),
  ];

  const aggregateByPackage = new Map(
    aggregates.map((agg) => [agg.packageId, agg]),
  );
  const rows = rankings.map((ranking) => ({
    ranking,
    aggregate: aggregateByPackage.get(ranking.packageId),
  }));

  const sortValue = (row: (typeof rows)[number]): number | undefined => {
    if (sort.key === "rank") return row.ranking.rank;
    if (sort.key === "score") return row.ranking.score;
    return row.aggregate
      ? getAggregateValue(row.aggregate, sort.key)
      : undefined;
  };
  const sortedRows = [...rows].sort((a, b) => {
    const av = sortValue(a);
    const bv = sortValue(b);
    if (av === undefined && bv === undefined) return 0;
    if (av === undefined) return 1;
    if (bv === undefined) return -1;
    return sort.dir === "asc" ? av - bv : bv - av;
  });

  const handleSort = (key: string) => {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "desc" },
    );
  };

  return (
    <section className={classes.compareCard} aria-label="Compare strategies">
      <div className={classes.compareCardHead}>
        <h3>Compare all strategies</h3>
        <Text size="xs" c="dimmed" component="span">
          Click a row to inspect it above
        </Text>
      </div>
      <div className={shared.tableScroll}>
        <table
          className={`${shared.table} ${classes.rankingTable}`}
          data-testid="rse-ranking-table"
        >
          <thead>
            <tr>
              <SortableTh
                label="Rank"
                sortKey="rank"
                sort={sort}
                onSort={handleSort}
              />
              <th>Package</th>
              <SortableTh
                label={relifeConcepts["ranking-score"].label}
                sortKey="score"
                sort={sort}
                onSort={handleSort}
              />
              {metricColumns.map((col) => (
                <SortableTh
                  key={col.key}
                  prefix={col.prefix}
                  label={compactConceptLabel(col.conceptId)}
                  sortKey={col.key}
                  sort={sort}
                  onSort={handleSort}
                  conceptId={col.conceptId}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map(({ ranking, aggregate }) => {
              const isSel = ranking.packageId === selectedPackageId;
              return (
                <tr
                  key={ranking.packageId}
                  className={`${shared.scen} ${isSel ? shared.sel : ""}`}
                  aria-selected={isSel}
                  onClick={() => onSelectPackage(ranking.packageId)}
                >
                  <td>
                    <Text component="span" fw={700}>
                      {ranking.rank}
                    </Text>
                  </td>
                  <td>
                    <div className={shared.rowName}>
                      <ColorDot color={PACKAGE_COLORS[ranking.packageId]} />
                      <span>{RSE_PACKAGES[ranking.packageId].label}</span>
                      {ranking.rank === 1 ? (
                        <IconCrown
                          size={14}
                          color="var(--mantine-color-relife-8)"
                        />
                      ) : null}
                    </div>
                  </td>
                  <td>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        justifyContent: "flex-end",
                      }}
                    >
                      <ScoreBar
                        color={PACKAGE_COLORS[ranking.packageId]}
                        pct={ranking.score * 100}
                      />
                      <Text component="span" fw={700} size="sm">
                        {formatNumber(ranking.score * 100)}
                      </Text>
                    </span>
                  </td>
                  {metricColumns.map((col) => {
                    const value = aggregate
                      ? getAggregateValue(aggregate, col.key)
                      : undefined;
                    const isNegativeNpv =
                      col.key === "aggregateNPV" &&
                      value !== undefined &&
                      value < 0;
                    return (
                      <td
                        key={col.key}
                        style={
                          isNegativeNpv
                            ? { color: "var(--mantine-color-red-7)" }
                            : undefined
                        }
                      >
                        {value !== undefined ? col.formatter(value) : "—"}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SortableTh({
  prefix,
  label,
  sortKey,
  sort,
  onSort,
  conceptId,
}: {
  prefix?: ConceptPrefix;
  label: string;
  sortKey: string;
  sort: SortState;
  onSort: (key: string) => void;
  conceptId?: RankingColumn["conceptId"];
}) {
  const active = sort.key === sortKey;
  const Icon = !active
    ? IconSelector
    : sort.dir === "asc"
      ? IconChevronUp
      : IconChevronDown;
  return (
    <th>
      {prefix ? <MetricEyebrow>{prefix}</MetricEyebrow> : null}
      <button
        type="button"
        className={`${classes.sortBtn} ${active ? classes.activeSort : ""}`}
        onClick={() => onSort(sortKey)}
      >
        {label}
        <Icon size={12} />
      </button>
      {conceptId ? <ConceptExplainer conceptId={conceptId} /> : null}
    </th>
  );
}
