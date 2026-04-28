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
  IconTrendingUp,
} from "@tabler/icons-react";
import type { ComponentType } from "react";
import { EPCBadge } from "../../../../components/shared";
import type {
  FinancialResults,
  MCDARankingResult,
  RenovationScenario,
  ScenarioId,
} from "../../context/types";
import type { MCDAPersona } from "../../../../services/types";
import { formatCurrency, formatYears } from "../../utils/formatters";
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
  const winnerScore = ranking?.[0]?.score;
  const personaLabel =
    personas.find((p) => p.id === selectedPersona)?.name ?? "your priorities";

  return (
    <div className={classes.hero}>
      <section className={classes.recoCard} aria-label="Recommended package">
        <div className={classes.recoBand}>
          <span className={classes.recoRank}>#1</span>
          <span className={classes.recoBandTitle}>
            Recommended for {personaLabel}
          </span>
          <span className={classes.recoBandScore}>
            <IconAward size={16} />
            {winnerScore !== undefined ? (
              <>Score {(winnerScore * 100).toFixed(0)}</>
            ) : isRanking ? (
              "Ranking…"
            ) : (
              "Score —"
            )}
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
                  icon={<IconTrendingUp size={14} />}
                  label="Net present value"
                  value={
                    winnerResult
                      ? formatCurrency(
                          winnerResult.riskAssessment?.pointForecasts.NPV ??
                            winnerResult.netPresentValue,
                        )
                      : "—"
                  }
                  hint="over project horizon"
                />
                <Metric
                  icon={<IconClockHour3 size={14} />}
                  label="Payback period"
                  value={
                    winnerResult
                      ? formatYears(
                          winnerResult.riskAssessment?.pointForecasts.PBP ??
                            winnerResult.paybackTime,
                        )
                      : "—"
                  }
                  hint={paybackRangeHint(winnerResult)}
                />
                <Metric
                  icon={<IconCoin size={14} />}
                  label="Monthly cash benefit"
                  value={
                    winnerResult?.riskAssessment?.pointForecasts
                      .MonthlyAvgSavings !== undefined
                      ? `${formatCurrency(
                          winnerResult.riskAssessment.pointForecasts
                            .MonthlyAvgSavings,
                        )}/mo`
                      : "—"
                  }
                  hint="avg over horizon"
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
                        {(entry.score * 100).toFixed(0)}
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
        <Skeleton height={84} />
      </div>
    </>
  );
}

function paybackRangeHint(result: FinancialResults | undefined): string {
  const p10 = result?.riskAssessment?.percentiles?.PBP?.P10;
  const p90 = result?.riskAssessment?.percentiles?.PBP?.P90;
  if (p10 === undefined || p90 === undefined) return "";
  return `P10–P90: ${p10.toFixed(0)}–${p90.toFixed(0)} yr`;
}

interface SavingsCopyProps {
  current: RenovationScenario;
  winner: RenovationScenario;
  result: FinancialResults | undefined;
}

function SavingsCopy({ current, winner, result }: SavingsCopyProps) {
  const thermalNeedsChangePct =
    current.annualEnergyNeeds > 0
      ? ((winner.annualEnergyNeeds - current.annualEnergyNeeds) /
          current.annualEnergyNeeds) *
        100
      : null;
  const pbp = result?.riskAssessment?.pointForecasts.PBP ?? result?.paybackTime;
  const monthly = result?.riskAssessment?.pointForecasts.MonthlyAvgSavings;

  return (
    <Text size="sm" c="dark.6" mt={8} maw={560}>
      {formatThermalNeedsChange(thermalNeedsChangePct)}
      {pbp !== undefined ? (
        <>
          , pays back in <b>{formatYears(pbp)}</b>
        </>
      ) : null}
      {monthly !== undefined ? (
        <>
          , with a modeled cash benefit of <b>{formatCurrency(monthly)}/mo</b>
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
        Reduces your thermal needs by <b>{Math.abs(roundedChange)}%</b>
      </>
    );
  }

  return (
    <>
      Increases your thermal needs by <b>{roundedChange}%</b>
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
