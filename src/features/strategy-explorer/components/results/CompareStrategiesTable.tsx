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
import { ConceptExplainer } from "../../../../components/shared/ConceptExplainer";
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
import { PackageDot, PackageScoreBar } from "./rseResultsAtoms";
import {
  getAggregateValue,
  RANKING_COLUMNS,
  type RankingColumn,
} from "./rseResultsVm";
import classes from "./StrategyResults.module.css";

const ALWAYS_ON_COLUMNS: RankingColumn[] = [
  { key: "totalBuildings", label: "Buildings", formatter: formatNumber },
  {
    key: "totalCapexEur",
    label: "Investment",
    formatter: formatCurrency,
    conceptId: "investment",
  },
  {
    key: "totalAnnualEnergySavingsKwh",
    label: "Energy savings",
    formatter: formatEnergy,
    conceptId: "rse-total-energy-savings",
  },
  {
    key: "totalAnnualCo2ReductionTon",
    label: "CO₂ reduction",
    formatter: formatTonnageCo2,
    conceptId: "rse-total-co2-reduction",
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
      <div className={classes.tableScroll}>
        <table className={classes.table} data-testid="rse-ranking-table">
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
                label="Score"
                sortKey="score"
                sort={sort}
                onSort={handleSort}
              />
              {metricColumns.map((col) => (
                <SortableTh
                  key={col.key}
                  label={col.label}
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
                  className={`${classes.row} ${isSel ? classes.sel : ""}`}
                  onClick={() => onSelectPackage(ranking.packageId)}
                >
                  <td>
                    <Text component="span" fw={700}>
                      {ranking.rank}
                    </Text>
                  </td>
                  <td>
                    <div className={classes.rowName}>
                      <PackageDot packageId={ranking.packageId} />
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
                      <PackageScoreBar
                        pct={ranking.score * 100}
                        packageId={ranking.packageId}
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
  label,
  sortKey,
  sort,
  onSort,
  conceptId,
}: {
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
