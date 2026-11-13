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
} from "@tabler/icons-react";
import { relifeConcepts } from "../../../../constants/relifeConcepts";
import { ConceptExplainer } from "../../../../components/shared/ConceptExplainer";
import { ConceptMetricCard } from "../../../../components/shared/ConceptMetricCard";
import { FundingPills } from "../../../../components/shared/FundingPills";
import {
  formatCount,
  formatCurrency,
  formatEnergy,
  formatNumber,
  formatTonnageCo2,
} from "../../../../utils/formatters";
import { RSE_PACKAGES } from "../../services/rsePackageCatalog";
import type { RSEPackageId, RSEWorkflowResult } from "../../types";
import { ColorDot, ScoreBar } from "../../../../components/shared/ResultAtoms";
import { GOAL_DISPLAY, heroMetricsFor, PACKAGE_COLORS } from "./rseResultsVm";
import shared from "../../../../components/shared/ResultsLayout.module.css";

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
  const lifetimeYears = request.financialAssumptions.projectLifetimeYears;

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
    <div className={shared.hero}>
      <section className={shared.recoCard} aria-label="Top-ranked strategy">
        <div className={shared.recoBand}>
          <span className={shared.recoRank}>#1</span>
          <span className={shared.recoBandTitle}>
            Top strategy: {goalDisplay.label}
          </span>
          <span className={shared.recoBandScore}>
            <IconAward size={16} />
            Score {formatNumber(winner.score * 100)}
            <ConceptExplainer conceptId="ranking-score" />
          </span>
        </div>

        <div className={shared.recoBody}>
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 6,
              }}
            >
              <ColorDot color={PACKAGE_COLORS[winner.packageId]} size={12} />
              <Text size="xs" c="dimmed" fw={500}>
                {formatCount(winnerPackage.measureIds.length, "measure")}
                {winnerAggregate
                  ? ` · ${formatCurrency(winnerAggregate.totalCapexEur)} gross investment`
                  : null}
              </Text>
              <FundingPills
                funding={result.request.financialAssumptions.funding}
              />
            </div>
            <Text component="h2" fz={26} fw={700} lh={1.15} m={0}>
              {winnerPackage.label}
            </Text>
            {winnerAggregate ? (
              <Text size="sm" c="dark.6" mt={8} maw={560}>
                Applied to <b>{formatNumber(winnerAggregate.totalBuildings)}</b>{" "}
                {relifeConcepts["modeled-property"].unit}, it saves{" "}
                <b>
                  {formatEnergy(winnerAggregate.totalAnnualEnergySavingsKwh)}
                </b>{" "}
                and{" "}
                <b>
                  {formatTonnageCo2(winnerAggregate.totalAnnualCo2ReductionTon)}
                </b>{" "}
                of CO₂ per year.
              </Text>
            ) : null}
          </div>

          {winnerAggregate ? (
            <div className={shared.tileGrid}>
              {heroMetricsFor(goal, winnerAggregate, lifetimeYears).map(
                (metric) => (
                  <ConceptMetricCard
                    key={metric.conceptId}
                    conceptId={metric.conceptId}
                    prefix={metric.prefix}
                    value={metric.value}
                    footer={metric.hint}
                  />
                ),
              )}
            </div>
          ) : null}
        </div>
      </section>

      <aside className={shared.side}>
        <div className={shared.sideCard}>
          <div className={shared.sideTitle}>
            <h3>Analysis goal</h3>
            <GoalIcon size={16} />
          </div>
          <Text size="sm" fw={600}>
            {goalDisplay.label}
          </Text>
          <Text size="xs" c="dimmed" mt={4}>
            {goal.kind === "financial"
              ? `Budget ${formatCurrency(goal.maxBudgetEur)} · ${lifetimeYears}-year project lifetime`
              : `${lifetimeYears}-year project lifetime`}
          </Text>
          <Text
            size="xs"
            c="dimmed"
            mt={4}
            style={{ display: "flex", alignItems: "center", gap: 4 }}
          >
            <IconBuildingCommunity size={14} />
            {formatNumber(totalPortfolioBuildings)}{" "}
            {relifeConcepts["modeled-property"].unit} ·{" "}
            {request.portfolio.selections.length} archetypes
          </Text>
        </div>

        <div className={shared.sideCard}>
          <div className={shared.sideTitle}>
            <h3>Strategy ranking</h3>
            <Text size="xs" c="dimmed" component="span">
              {rankings.length} packages
            </Text>
          </div>
          <ul className={shared.rankList}>
            {rankings.map((entry) => {
              const isSel = entry.packageId === selectedPackageId;
              return (
                <li key={entry.packageId}>
                  <button
                    type="button"
                    onClick={() => onSelectPackage(entry.packageId)}
                    className={`${shared.rankItem} ${isSel ? shared.sel : ""}`}
                    aria-pressed={isSel}
                  >
                    <span className={shared.rankNum}>
                      {entry.rank === 1 ? (
                        <IconCrown size={16} className={shared.rankCrown} />
                      ) : (
                        entry.rank
                      )}
                    </span>
                    <ColorDot color={PACKAGE_COLORS[entry.packageId]} />
                    <span className={shared.rankName}>
                      {RSE_PACKAGES[entry.packageId].label}
                    </span>
                    <span className={shared.rankScore}>
                      <ScoreBar
                        color={PACKAGE_COLORS[entry.packageId]}
                        pct={entry.score * 100}
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
