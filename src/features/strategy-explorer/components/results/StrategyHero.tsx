/**
 * StrategyHero — top hero band of the RSE Results screen.
 * Combines the top-ranked package card (left) with the analysis-goal summary
 * and full ranking list (right). Clicking a ranking entry drives the shared
 * package selection used by the tabs, deep dive, and comparison table.
 */

import { Text } from "@mantine/core";
import {
  IconAward,
  IconBuildingCommunity,
  IconCrown,
  IconInfoCircle,
} from "@tabler/icons-react";
import { ConceptExplainer } from "../../../../components/shared/ConceptExplainer";
import {
  formatCurrency,
  formatEnergy,
  formatNumber,
  formatTonnageCo2,
} from "../../../../utils/formatters";
import { RSE_PACKAGES } from "../../services/rsePackageCatalog";
import type { RSEPackageId, RSEWorkflowResult } from "../../types";
import { PackageDot, PackageScoreBar } from "./rseResultsAtoms";
import { GOAL_DISPLAY, heroMetricsFor, type HeroMetric } from "./rseResultsVm";
import classes from "./StrategyResults.module.css";

interface StrategyHeroProps {
  result: RSEWorkflowResult;
  selectedPackageId: RSEPackageId;
  onSelectPackage: (packageId: RSEPackageId) => void;
}

export function StrategyHero({
  result,
  selectedPackageId,
  onSelectPackage,
}: StrategyHeroProps) {
  const { rankings, packageAggregates, request } = result;
  const goal = request.goal;
  const goalDisplay = GOAL_DISPLAY[goal.kind];
  const GoalIcon = goalDisplay.icon;
  const horizonYears = request.financialAssumptions.projectLifetimeYears;

  const winner = rankings[0];
  const winnerAggregate = packageAggregates.find(
    (agg) => agg.packageId === winner.packageId,
  );
  const winnerPackage = RSE_PACKAGES[winner.packageId];
  const totalPortfolioBuildings = request.portfolio.selections.reduce(
    (sum, selection) => sum + selection.buildingCount,
    0,
  );

  return (
    <div className={classes.hero}>
      <section className={classes.recoCard} aria-label="Top-ranked strategy">
        <div className={classes.recoBand}>
          <span className={classes.recoRank}>#1</span>
          <span className={classes.recoBandTitle}>
            Top strategy for {goalDisplay.label.toLowerCase()}
          </span>
          <span className={classes.recoBandScore}>
            <IconAward size={16} />
            Score {formatNumber(winner.score * 100)}
            <ConceptExplainer conceptId="ranking-score" />
          </span>
        </div>

        <div className={classes.recoBody}>
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 6,
              }}
            >
              <PackageDot packageId={winner.packageId} size={12} />
              <Text size="xs" c="dimmed" fw={500}>
                {winnerPackage.measureIds.length} measures
                {winnerAggregate
                  ? ` · ${formatCurrency(winnerAggregate.totalCapexEur)} gross investment`
                  : null}
              </Text>
            </div>
            <Text component="h2" fz={26} fw={700} lh={1.15} m={0}>
              {winnerPackage.label}
            </Text>
            {winnerAggregate ? (
              <Text size="sm" c="dark.6" mt={8} maw={560}>
                Applied to <b>{formatNumber(winnerAggregate.totalBuildings)}</b>{" "}
                buildings, it saves{" "}
                <b>
                  {formatEnergy(winnerAggregate.totalAnnualEnergySavingsKwh)}
                </b>{" "}
                and{" "}
                <b>
                  {formatTonnageCo2(winnerAggregate.totalAnnualCo2ReductionTon)}
                </b>{" "}
                of CO₂ per year. {winner.explanation}
              </Text>
            ) : (
              <Text size="sm" c="dark.6" mt={8} maw={560}>
                {winner.explanation}
              </Text>
            )}
          </div>

          {winnerAggregate ? (
            <div className={classes.recoMetrics}>
              {heroMetricsFor(goal, winnerAggregate, horizonYears).map(
                (metric) => (
                  <HeroMetricTile key={metric.label} metric={metric} />
                ),
              )}
            </div>
          ) : null}

          <div className={classes.recoFootnote}>
            <IconInfoCircle size={14} />
            Investment figures are planning assumptions — see the cost
            assumptions note below.
          </div>
        </div>
      </section>

      <aside className={classes.side}>
        <div className={classes.sideCard}>
          <div className={classes.sideTitle}>
            <h3>Analysis goal</h3>
            <GoalIcon size={16} />
          </div>
          <Text size="sm" fw={600}>
            {goalDisplay.label}
          </Text>
          <Text size="xs" c="dimmed" mt={4}>
            {goal.kind === "financial"
              ? `Budget ${formatCurrency(goal.maxBudgetEur)} · ${horizonYears}-year horizon`
              : `${horizonYears}-year horizon`}
          </Text>
          <Text
            size="xs"
            c="dimmed"
            mt={4}
            style={{ display: "flex", alignItems: "center", gap: 4 }}
          >
            <IconBuildingCommunity size={14} />
            {formatNumber(totalPortfolioBuildings)} buildings ·{" "}
            {request.portfolio.selections.length} archetypes
          </Text>
        </div>

        <div className={classes.sideCard}>
          <div className={classes.sideTitle}>
            <h3>Strategy ranking</h3>
            <Text size="xs" c="dimmed" component="span">
              {rankings.length} packages
            </Text>
          </div>
          <ul className={classes.rankList}>
            {rankings.map((entry) => {
              const isSel = entry.packageId === selectedPackageId;
              return (
                <li key={entry.packageId}>
                  <button
                    type="button"
                    onClick={() => onSelectPackage(entry.packageId)}
                    className={`${classes.rankItem} ${isSel ? classes.sel : ""}`}
                    aria-pressed={isSel}
                  >
                    <span className={classes.rankNum}>
                      {entry.rank === 1 ? (
                        <IconCrown size={16} className={classes.rankCrown} />
                      ) : (
                        entry.rank
                      )}
                    </span>
                    <PackageDot packageId={entry.packageId} />
                    <span className={classes.rankName}>
                      {RSE_PACKAGES[entry.packageId].label}
                    </span>
                    <span className={classes.rankScore}>
                      <PackageScoreBar
                        pct={entry.score * 100}
                        packageId={entry.packageId}
                      />
                      {formatNumber(entry.score * 100)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>
    </div>
  );
}

function HeroMetricTile({ metric }: { metric: HeroMetric }) {
  const Icon = metric.icon;
  return (
    <div className={classes.recoMetric}>
      <div className={classes.metricLabel}>
        <Icon size={14} />
        {metric.label}
        {metric.conceptId ? (
          <ConceptExplainer conceptId={metric.conceptId} />
        ) : null}
      </div>
      <div className={classes.metricValue}>{metric.value}</div>
      {metric.hint ? (
        <div className={classes.metricHint}>{metric.hint}</div>
      ) : null}
    </div>
  );
}
