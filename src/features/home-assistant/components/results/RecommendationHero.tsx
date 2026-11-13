/**
 * RecommendationHero — top hero band of the HRA Results screen.
 * Combines a "recommended pick" card (left) with a priority profile picker
 * and full ranking list (right), driven by the active MCDA persona.
 */

import { Alert, Group, Loader, Skeleton, Text } from "@mantine/core";
import {
  IconAlertCircle,
  IconAward,
  IconCoin,
  IconCrown,
  IconHeartbeat,
  IconInfoCircle,
  IconLeaf,
} from "@tabler/icons-react";
import type { ComponentType } from "react";
import { ConceptExplainer } from "../../../../components/shared/ConceptExplainer";
import { ConceptMetricCard } from "../../../../components/shared/ConceptMetricCard";
import { ReadingText } from "../../../../components/shared/ReadingText";
import {
  readMetric,
  readRange,
  readingText,
  type Reading,
} from "../../../../services/appraisalReadout";
import {
  appraisedFigures,
  resolveSavingsAvailability,
  savingsAvailabilityExplanation,
  type SavingsAvailability,
} from "../../../../services/savingsState";
import type {
  FinancialResults,
  RenovationScenario,
  ScenarioId,
} from "../../context/types";
import type { MCDAPersona } from "../../../../services/types";
import {
  formatCount,
  formatCurrency,
  formatNumber,
} from "../../utils/formatters";
import { getScenarioColor } from "../../utils/colorUtils";
import classes from "./ResultsLayout.module.css";
import shared from "../../../../components/shared/ResultsLayout.module.css";
import { rankingOf, type RankingStatus } from "./rankingStatus";
import { ColorDot, ScoreBar } from "../../../../components/shared/ResultAtoms";

const PERSONA_ICON: Record<string, ComponentType<{ size?: number }>> = {
  "environmentally-conscious": IconLeaf,
  "health-oriented": IconHeartbeat,
  "cost-optimization": IconCoin,
};

interface RecommendationHeroProps {
  currentScenario: RenovationScenario | undefined;
  /** Packages in rank order. */
  rankedScenarios: RenovationScenario[];
  financialResults: Record<ScenarioId, FinancialResults>;
  status: RankingStatus;
  personas: MCDAPersona[];
  selectedPersona: string;
  selectedScenarioId: ScenarioId | null;
  onSelectPersona: (personaId: string) => void;
  onSelectScenario: (scenarioId: ScenarioId) => void;
}

export function RecommendationHero({
  currentScenario,
  rankedScenarios,
  financialResults,
  status,
  personas,
  selectedPersona,
  selectedScenarioId,
  onSelectPersona,
  onSelectScenario,
}: RecommendationHeroProps) {
  const personaLabel =
    personas.find((p) => p.id === selectedPersona)?.name ?? "your priorities";
  const updating =
    status.kind === "loading" || (status.kind === "ready" && status.stale);
  const scoreById = new Map(
    (rankingOf(status) ?? []).map((entry) => [entry.scenarioId, entry.score]),
  );

  return (
    <div className={shared.hero}>
      <section className={shared.recoCard} aria-label="Recommended package">
        <div className={shared.recoBand}>
          <span className={shared.recoRank}>#1</span>
          <span className={shared.recoBandTitle}>
            {status.kind === "failed" || status.kind === "cannot-rank" ? (
              "Recommendation unavailable"
            ) : (
              <>
                Recommended for {personaLabel}{" "}
                <ConceptExplainer conceptId="mcda" />
              </>
            )}
          </span>
          {status.kind === "ready" || status.kind === "loading" ? (
            <span className={shared.recoBandScore}>
              <IconAward size={16} />
              {updating ? "Ranking…" : "Best overall fit"}
            </span>
          ) : null}
        </div>

        <div
          className={`${shared.recoBody} ${updating ? classes.stale : ""}`}
          aria-busy={updating}
        >
          <RecommendationBody
            status={status}
            currentScenario={currentScenario}
            winner={rankedScenarios[0]}
            financialResults={financialResults}
          />
        </div>
      </section>

      <aside className={shared.side}>
        <div className={shared.sideCard}>
          <div className={shared.sideTitle}>
            <h3>Your priorities</h3>
            <ConceptExplainer conceptId="priority-profile" />
          </div>
          <div className={classes.persona} role="radiogroup">
            {personas.map((persona) => {
              const Icon = PERSONA_ICON[persona.id] ?? IconCoin;
              const on = persona.id === selectedPersona;
              return (
                <button
                  key={persona.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  className={`${classes.personaOpt} ${on ? classes.on : ""}`}
                  onClick={() => onSelectPersona(persona.id)}
                >
                  <span className={classes.personaIc}>
                    <Icon size={14} />
                  </span>
                  <span>
                    <span className={classes.personaLabel}>{persona.name}</span>
                    <span className={classes.personaHint}>
                      {persona.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className={shared.sideCard}>
          <div className={shared.sideTitle}>
            <h3>Full ranking</h3>
            <Text size="xs" c="dimmed" component="span">
              {updating ? (
                <Group gap={6} component="span" wrap="nowrap">
                  <Loader size="xs" />
                  Updating…
                </Group>
              ) : (
                `${rankedScenarios.length} packages`
              )}
            </Text>
          </div>
          {status.kind === "ready" ? (
            <ul
              className={`${shared.rankList} ${status.stale ? classes.stale : ""}`}
            >
              {rankedScenarios.map((scenario, idx) => {
                const isSel = scenario.id === selectedScenarioId;
                const score = scoreById.get(scenario.id);
                return (
                  <li key={scenario.id}>
                    <button
                      type="button"
                      onClick={() => onSelectScenario(scenario.id)}
                      className={`${shared.rankItem} ${isSel ? shared.sel : ""}`}
                      aria-pressed={isSel}
                    >
                      <span className={shared.rankNum}>
                        {score === undefined ? (
                          "—"
                        ) : idx === 0 ? (
                          <IconCrown size={16} className={shared.rankCrown} />
                        ) : (
                          idx + 1
                        )}
                      </span>
                      <ColorDot color={getScenarioColor(scenario.id)} />
                      <span className={shared.rankName}>{scenario.label}</span>
                      {score === undefined ? (
                        <Text size="xs" c="dimmed" component="span">
                          Not ranked
                        </Text>
                      ) : (
                        <span className={shared.rankScore}>
                          <ScoreBar
                            color={getScenarioColor(scenario.id)}
                            pct={score * 100}
                          />
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className={classes.rankNotice}>{rankingNotice(status)}</div>
          )}
        </div>
      </aside>
    </div>
  );
}

function rankingNotice(
  status: Exclude<RankingStatus, { kind: "ready" }>,
): string {
  switch (status.kind) {
    case "loading":
      return "Computing ranking…";
    case "failed":
      return "Ranking unavailable.";
    case "cannot-rank":
      return status.reason === "too-few-packages"
        ? "Ranking unavailable. Add at least two packages with complete data."
        : "Ranking unavailable.";
  }
}

interface RecommendationBodyProps {
  status: RankingStatus;
  currentScenario: RenovationScenario | undefined;
  winner: RenovationScenario | undefined;
  financialResults: Record<ScenarioId, FinancialResults>;
}

function RecommendationBody({
  status,
  currentScenario,
  winner,
  financialResults,
}: RecommendationBodyProps) {
  switch (status.kind) {
    case "failed":
      return (
        <Alert color="red" icon={<IconAlertCircle size={16} />}>
          {status.message}
        </Alert>
      );
    case "cannot-rank":
      return (
        <Alert color="gray" icon={<IconInfoCircle size={16} />}>
          Not enough packages with complete data to rank. Compare options below.
        </Alert>
      );
    case "loading":
      return <RecoSkeleton />;
    case "ready":
      break;
  }
  if (!winner || !currentScenario) return <RecoSkeleton />;

  const winnerResult = financialResults[winner.id];
  const winnerAppraisal = winnerResult?.appraisal;
  const winnerBenefit = readMetric(winnerAppraisal, "MonthlyAvgSavings");
  const paybackRange = readRange(winnerAppraisal, "PBP");
  const savings = resolveSavingsState(currentScenario, winner, winnerResult);

  return (
    <>
      <div>
        <Group gap="xs" mb={6}>
          <ColorDot color={getScenarioColor(winner.id)} size={12} />
          <Text size="xs" c="dimmed" fw={500}>
            {formatCount(winner.measures.length, "measure")}
            {winnerResult?.capitalExpenditure !== undefined
              ? ` · ${formatCurrency(winnerResult.capitalExpenditure)} investment`
              : null}
          </Text>
        </Group>
        <Text component="h2" fz={26} fw={700} lh={1.15} m={0}>
          {winner.label}
        </Text>
        <SavingsCopy
          current={currentScenario}
          winner={winner}
          result={winnerResult}
          benefit={winnerBenefit}
          savings={savings}
        />
      </div>

      <div className={shared.tileGrid}>
        <ConceptMetricCard
          conceptId="monthly-cash-benefit"
          value={<ReadingText reading={winnerBenefit} />}
        />
        <ConceptMetricCard
          conceptId="payback-period"
          value={<ReadingText reading={readMetric(winnerAppraisal, "PBP")} />}
          footer={
            paybackRange ? (
              <Text size="xs" c="dimmed">
                P10–P90: {paybackRange.text}
              </Text>
            ) : undefined
          }
        />
      </div>

      <div className={shared.recoFootnote}>
        <IconInfoCircle size={14} />
        Recommendation re-ranks automatically when you change profile.
      </div>
    </>
  );
}

function RecoSkeleton() {
  return (
    <>
      <Skeleton height={32} width="60%" />
      <Skeleton height={20} width="80%" />
      <div className={shared.tileGrid}>
        <Skeleton height={84} />
        <Skeleton height={84} />
      </div>
    </>
  );
}

/** Which sentence explains the package's money, so no package reads as a bare "€0". */
type SavingsState =
  | { kind: "ok" }
  | { kind: "unprofitable" }
  /** Every reason the shared classifier gives for not appraising at all. */
  | { kind: Exclude<SavingsAvailability, "appraised"> };

/**
 * A package can only be priced when both the baseline and the renovated
 * scenario carry a carrier breakdown; otherwise its appraisal is skipped and
 * there are no figures to show.
 */
function resolveSavingsState(
  current: RenovationScenario | undefined,
  winner: RenovationScenario | undefined,
  result: FinancialResults | undefined,
): SavingsState {
  if (!current) return { kind: "unknown" };

  const availability = resolveSavingsAvailability(winner, result);
  if (availability !== "appraised") return { kind: availability };

  const monthlyEur = appraisedFigures(result)?.pointForecasts.MonthlyAvgSavings;
  if (monthlyEur === undefined) return { kind: "unknown" };
  if (monthlyEur <= 0) return { kind: "unprofitable" };

  return { kind: "ok" };
}

interface SavingsCopyProps {
  current: RenovationScenario;
  winner: RenovationScenario;
  result: FinancialResults | undefined;
  benefit: Reading;
  savings: SavingsState;
}

function SavingsCopy({
  current,
  winner,
  result,
  benefit,
  savings,
}: SavingsCopyProps) {
  const thermalNeedsChangePct =
    current.annualEnergyNeeds > 0
      ? ((winner.annualEnergyNeeds - current.annualEnergyNeeds) /
          current.annualEnergyNeeds) *
        100
      : null;
  const payback = readMetric(result?.appraisal, "PBP");

  if (savings.kind === "not-priceable") {
    return (
      <Text size="sm" c="dark.6" mt={8} maw={560}>
        {formatThermalNeedsChange(thermalNeedsChangePct)}. We could not work out
        what this package costs to run, so we cannot show savings or payback for
        it.
      </Text>
    );
  }

  // These two never reach the appraisal, so there is no payback to render.
  if (savings.kind === "no-savings") {
    return (
      <Text size="sm" c="dark.6" mt={8} maw={560}>
        {formatThermalNeedsChange(thermalNeedsChangePct)}.{" "}
        {savingsAvailabilityExplanation["no-savings"]}
      </Text>
    );
  }

  if (savings.kind === "fully-funded") {
    return (
      <Text size="sm" c="dark.6" mt={8} maw={560}>
        {formatThermalNeedsChange(thermalNeedsChangePct)}, and a grant covers
        the whole cost, so there is nothing to pay back.
      </Text>
    );
  }

  return (
    <Text size="sm" c="dark.6" mt={8} maw={560}>
      {formatThermalNeedsChange(thermalNeedsChangePct)}
      {savings.kind === "unprofitable" ? (
        <>
          , but <b>does not pay for itself</b> over the project lifetime
        </>
      ) : payback.kind === "over-lifetime" ? (
        <>
          , does <b>not pay back within the project lifetime</b>
        </>
      ) : payback.kind === "value" ? (
        <>
          , pays back in <b>{readingText(payback)}</b>
        </>
      ) : null}
      {savings.kind === "ok" ? (
        <>
          , with a modeled cash benefit of <b>{readingText(benefit)}</b>
        </>
      ) : null}
      .
    </Text>
  );
}

function formatThermalNeedsChange(changePct: number | null) {
  if (changePct === null) {
    return "Improves your renovation outlook";
  }

  const roundedChange = Math.round(changePct);

  if (Math.abs(roundedChange) < 1) {
    return "Keeps your thermal needs about the same";
  }

  if (roundedChange < 0) {
    return (
      <>
        Reduces your thermal needs by{" "}
        <b>{formatNumber(Math.abs(roundedChange))}%</b>
      </>
    );
  }

  return (
    <>
      Increases your thermal needs by <b>{formatNumber(roundedChange)}%</b>
    </>
  );
}
