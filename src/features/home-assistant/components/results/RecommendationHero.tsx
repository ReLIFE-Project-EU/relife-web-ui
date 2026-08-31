/**
 * RecommendationHero — top hero band of the HRA Results screen.
 * Combines a "recommended pick" card (left) with a priority profile picker
 * and full ranking list (right), driven by the active MCDA persona.
 */

import { Alert, Loader, Skeleton, Text } from "@mantine/core";
import {
  IconAward,
  IconClockHour3,
  IconCoin,
  IconCrown,
  IconHelpCircle,
  IconInfoCircle,
  IconLeaf,
  IconTemperature,
} from "@tabler/icons-react";
import type { ComponentType } from "react";
import { EPCBadge } from "../../../../components/shared";
import { ConceptExplainer } from "../../../../components/shared/ConceptExplainer";
import {
  resolveSavingsAvailability,
  type SavingsAvailability,
} from "../../../../services/savingsState";
import type {
  FinancialResults,
  MCDARankingResult,
  RenovationScenario,
  ScenarioId,
} from "../../context/types";
import type { MCDAPersona } from "../../../../services/types";
import {
  formatApproxCurrency,
  formatCurrency,
  formatNumber,
  formatPaybackYears,
  formatYears,
  isPaybackBeyondHorizon,
} from "../../utils/formatters";
import classes from "./ResultsLayout.module.css";
import { ScenDot, ScoreBar } from "./resultsAtoms";

const PERSONA_ICON: Record<string, ComponentType<{ size?: number }>> = {
  "environmentally-conscious": IconLeaf,
  "comfort-driven": IconTemperature,
  "cost-optimization": IconCoin,
};

interface RecommendationHeroProps {
  currentScenario: RenovationScenario | undefined;
  renovationScenarios: RenovationScenario[];
  financialResults: Record<ScenarioId, FinancialResults>;
  ranking: MCDARankingResult[] | null;
  isRanking: boolean;
  canRank: boolean;
  personas: MCDAPersona[];
  selectedPersona: string;
  selectedScenarioId: ScenarioId | null;
  onSelectPersona: (personaId: string) => void;
  onSelectScenario: (scenarioId: ScenarioId) => void;
}

export function RecommendationHero({
  currentScenario,
  renovationScenarios,
  financialResults,
  ranking,
  isRanking,
  canRank,
  personas,
  selectedPersona,
  selectedScenarioId,
  onSelectPersona,
  onSelectScenario,
}: RecommendationHeroProps) {
  const winner = getWinner(renovationScenarios, ranking);
  const winnerResult = winner ? financialResults[winner.id] : undefined;
  const personaLabel =
    personas.find((p) => p.id === selectedPersona)?.name ?? "your priorities";
  const savings = resolveSavingsState(currentScenario, winner, winnerResult);

  return (
    <div className={classes.hero}>
      <section className={classes.recoCard} aria-label="Recommended package">
        <div className={classes.recoBand}>
          <span className={classes.recoRank}>#1</span>
          <span className={classes.recoBandTitle}>
            Recommended for {personaLabel} <ConceptExplainer conceptId="mcda" />
          </span>
          <span className={classes.recoBandScore}>
            <IconAward size={16} />
            {isRanking ? "Ranking…" : "Best overall fit"}
          </span>
        </div>

        <div className={classes.recoBody}>
          {winner && currentScenario ? (
            <>
              <div className={classes.recoHead}>
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 6,
                    }}
                  >
                    <ScenDot scenarioId={winner.id} size={12} />
                    <Text size="xs" c="dimmed" fw={500}>
                      {winner.measures.length} measures
                      {winnerResult?.capitalExpenditure !== undefined
                        ? ` · ${formatCurrency(winnerResult.capitalExpenditure)} investment`
                        : null}
                    </Text>
                  </div>
                  <Text component="h2" fz={26} fw={700} lh={1.15} m={0}>
                    {winner.label}
                  </Text>
                  <SavingsCopy
                    current={currentScenario}
                    winner={winner}
                    result={winnerResult}
                    savings={savings}
                  />
                </div>
                <div className={classes.recoEpcSwap}>
                  <div>
                    <div className={classes.epcLabel}>EPC today</div>
                    <EPCBadge
                      epcClass={currentScenario.epcClass}
                      size="md"
                      estimated
                    />
                  </div>
                  <span className={classes.epcArrow} aria-hidden>
                    →
                  </span>
                  <div>
                    <div className={classes.epcLabel}>After</div>
                    <EPCBadge epcClass={winner.epcClass} size="md" estimated />
                  </div>
                </div>
              </div>

              <div className={classes.recoMetrics}>
                <Metric
                  icon={<IconCoin size={14} />}
                  label="Yearly savings"
                  value={savingsTileValue(savings)}
                  hint={savingsTileHint(savings)}
                />
                <Metric
                  icon={<IconClockHour3 size={14} />}
                  label="Payback period"
                  value={
                    winnerResult
                      ? formatPaybackYears(
                          // Rounded for the headline; the deep-dive keeps the
                          // exact figure. Censoring is handled downstream.
                          Math.round(
                            winnerResult.riskAssessment?.pointForecasts.PBP ??
                              winnerResult.paybackTime,
                          ),
                          winnerResult.riskAssessment?.metadata
                            .project_lifetime,
                        )
                      : "—"
                  }
                  hint={paybackRangeHint(winnerResult)}
                />
              </div>

              <div className={classes.recoFootnote}>
                <IconInfoCircle size={14} />
                Recommendation re-ranks automatically when you change profile.
              </div>
            </>
          ) : isRanking ? (
            <RecoSkeleton />
          ) : (
            <Alert color="yellow" icon={<IconInfoCircle size={16} />}>
              {canRank
                ? "Calculating recommendation…"
                : "Not enough packages with complete data to rank. Compare options below."}
            </Alert>
          )}
        </div>
      </section>

      <aside className={classes.side}>
        <div className={classes.sideCard}>
          <div className={classes.sideTitle}>
            <h3>Your priorities</h3>
            <IconHelpCircle
              size={14}
              color="var(--mantine-color-gray-6)"
              aria-hidden
            />
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
                  <span className={classes.personaLabel}>{persona.name}</span>
                  <span className={classes.personaHint}>
                    {persona.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className={classes.sideCard}>
          <div className={classes.sideTitle}>
            <h3>Full ranking</h3>
            <Text size="xs" c="dimmed" component="span">
              {isRanking ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Loader size="xs" />
                  Updating…
                </span>
              ) : (
                `${renovationScenarios.length} packages`
              )}
            </Text>
          </div>
          {ranking && ranking.length > 0 ? (
            <ul className={classes.rankList}>
              {ranking.map((entry, idx) => {
                const scenario = renovationScenarios.find(
                  (s) => s.id === entry.scenarioId,
                );
                if (!scenario) return null;
                const isSel = scenario.id === selectedScenarioId;
                return (
                  <li key={entry.scenarioId}>
                    <button
                      type="button"
                      onClick={() => onSelectScenario(scenario.id)}
                      className={`${classes.rankItem} ${isSel ? classes.sel : ""}`}
                      aria-pressed={isSel}
                    >
                      <span className={classes.rankNum}>
                        {idx === 0 ? (
                          <IconCrown size={16} className={classes.rankCrown} />
                        ) : (
                          idx + 1
                        )}
                      </span>
                      <ScenDot scenarioId={scenario.id} />
                      <span className={classes.rankName}>{scenario.label}</span>
                      <span className={classes.rankScore}>
                        <ScoreBar
                          pct={entry.score * 100}
                          scenarioId={scenario.id}
                        />
                      </span>
                    </button>
                  </li>
                );
              })}
              {renovationScenarios
                .filter((s) => !ranking.some((r) => r.scenarioId === s.id))
                .map((scenario) => {
                  const isSel = scenario.id === selectedScenarioId;
                  return (
                    <li key={scenario.id}>
                      <button
                        type="button"
                        onClick={() => onSelectScenario(scenario.id)}
                        className={`${classes.rankItem} ${isSel ? classes.sel : ""}`}
                        aria-pressed={isSel}
                      >
                        <span className={classes.rankNum}>—</span>
                        <ScenDot scenarioId={scenario.id} />
                        <span className={classes.rankName}>
                          {scenario.label}
                        </span>
                        <Text size="xs" c="dimmed" component="span">
                          Not ranked
                        </Text>
                      </button>
                    </li>
                  );
                })}
            </ul>
          ) : isRanking ? (
            <div className={classes.rankNotice}>Computing ranking…</div>
          ) : (
            <div className={classes.rankNotice}>
              Ranking unavailable. Add at least two packages with complete data.
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

interface MetricProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}

function Metric({ icon, label, value, hint }: MetricProps) {
  return (
    <div className={classes.recoMetric}>
      <div className={classes.metricLabel}>
        {icon}
        {label}
      </div>
      <div className={classes.metricValue}>{value}</div>
      {hint ? <div className={classes.metricHint}>{hint}</div> : null}
    </div>
  );
}

function RecoSkeleton() {
  return (
    <>
      <Skeleton height={32} width="60%" />
      <Skeleton height={20} width="80%" />
      <div className={classes.recoMetrics}>
        <Skeleton height={84} />
        <Skeleton height={84} />
      </div>
    </>
  );
}

function paybackRangeHint(result: FinancialResults | undefined): string {
  const p10 = result?.riskAssessment?.percentiles?.PBP?.P10;
  const p90 = result?.riskAssessment?.percentiles?.PBP?.P90;
  if (p10 === undefined || p90 === undefined) return "";
  const lifetime = result?.riskAssessment?.metadata.project_lifetime;
  const p90Label = isPaybackBeyondHorizon(p90, lifetime)
    ? `>${formatNumber(lifetime ?? p90)}`
    : formatNumber(p90);
  return `P10–P90: ${formatNumber(p10)}–${p90Label} yr`;
}

/**
 * How the yearly-savings figure should be presented. Distinguishing these
 * states is what keeps an unpriceable or unprofitable package from rendering
 * as a bare, unexplained "€0".
 */
type SavingsState =
  | { kind: "ok"; yearlyEur: number; monthlyEur: number }
  | { kind: "unprofitable" }
  /** Every reason the shared classifier gives for not appraising at all. */
  | { kind: Exclude<SavingsAvailability, "appraised"> };

/**
 * A package can only be priced when both the baseline and the renovated
 * scenario carry a carrier breakdown; otherwise FinancialService submits zero
 * energy savings and every downstream figure collapses to zero for reasons the
 * user cannot see.
 */
function resolveSavingsState(
  current: RenovationScenario | undefined,
  winner: RenovationScenario | undefined,
  result: FinancialResults | undefined,
): SavingsState {
  if (!current) return { kind: "unknown" };

  const availability = resolveSavingsAvailability(winner, result);
  if (availability !== "appraised") return { kind: availability };

  const monthlyEur = result?.riskAssessment?.pointForecasts.MonthlyAvgSavings;
  if (monthlyEur === undefined) return { kind: "unknown" };
  if (monthlyEur <= 0) return { kind: "unprofitable" };

  return { kind: "ok", yearlyEur: monthlyEur * 12, monthlyEur };
}

function savingsTileValue(savings: SavingsState): string {
  switch (savings.kind) {
    case "ok":
      return `${formatApproxCurrency(savings.yearlyEur)}/yr`;
    case "unprofitable":
    case "no-savings":
      return "No net saving";
    case "fully-funded":
      return "Fully funded";
    case "not-priceable":
      return "Not available";
    case "unknown":
      return "—";
  }
}

function savingsTileHint(savings: SavingsState): string {
  switch (savings.kind) {
    case "ok":
      return "roughly, after running costs";
    case "unprofitable":
      return "costs more to run and repay than it saves";
    case "no-savings":
      return "your home already meets what these measures would deliver";
    case "fully-funded":
      return "a grant covers the whole cost, so there is nothing to pay back";
    case "not-priceable":
      return "we could not work out this package's running costs";
    case "unknown":
      return "";
  }
}

interface SavingsCopyProps {
  current: RenovationScenario;
  winner: RenovationScenario;
  result: FinancialResults | undefined;
  savings: SavingsState;
}

function SavingsCopy({ current, winner, result, savings }: SavingsCopyProps) {
  const thermalNeedsChangePct =
    current.annualEnergyNeeds > 0
      ? ((winner.annualEnergyNeeds - current.annualEnergyNeeds) /
          current.annualEnergyNeeds) *
        100
      : null;
  const pbp = result?.riskAssessment?.pointForecasts.PBP ?? result?.paybackTime;

  if (savings.kind === "not-priceable") {
    return (
      <Text size="sm" c="dark.6" mt={8} maw={560}>
        {formatThermalNeedsChange(thermalNeedsChangePct)}. We could not work out
        what this package costs to run, so we cannot show savings or payback for
        it.
      </Text>
    );
  }

  // These two never reach the appraisal, so `paybackTime` below is a
  // placeholder zero and must not be rendered as "pays back in 0 years".
  if (savings.kind === "no-savings") {
    return (
      <Text size="sm" c="dark.6" mt={8} maw={560}>
        {formatThermalNeedsChange(thermalNeedsChangePct)}. Your home already
        meets what these measures would deliver, so there is nothing here to
        save or pay back.
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
          , but <b>does not pay for itself</b> over the project horizon
        </>
      ) : pbp !== undefined ? (
        isPaybackBeyondHorizon(
          pbp,
          result?.riskAssessment?.metadata.project_lifetime,
        ) ? (
          <>
            , does <b>not pay back within the project horizon</b>
          </>
        ) : (
          <>
            , pays back in <b>{formatYears(pbp)}</b>
          </>
        )
      ) : null}
      {savings.kind === "ok" ? (
        <>
          , with a modeled cash benefit of{" "}
          <b>{formatCurrency(savings.monthlyEur)}/mo</b>
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

function getWinner(
  scenarios: RenovationScenario[],
  ranking: MCDARankingResult[] | null,
): RenovationScenario | undefined {
  if (!ranking || ranking.length === 0) return undefined;
  return scenarios.find((s) => s.id === ranking[0].scenarioId);
}
