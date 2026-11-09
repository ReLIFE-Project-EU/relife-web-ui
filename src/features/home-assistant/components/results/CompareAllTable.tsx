/**
 * CompareAllTable — comparison table shown inside the "Compare all packages"
 * results section. Includes a baseline (current home) row and one row per
 * renovation scenario, with click-to-inspect behavior tied to the deep-dive
 * selection. The surrounding section supplies the heading and card chrome.
 */

import { Text } from "@mantine/core";
import { IconCrown } from "@tabler/icons-react";
import { ConceptExplainer } from "../../../../components/shared/ConceptExplainer";
import {
  compactConceptLabel,
  relifeConcepts,
} from "../../../../constants/relifeConcepts";
import { computeLifetimeCarbonKgCo2e } from "../../../../services/carrierSavingsService";
import { ReadingText } from "../../../../components/shared/ReadingText";
import { readMetric } from "../../../../services/appraisalReadout";
import { appraisedFigures } from "../../../../services/savingsState";
import type {
  FinancialResults,
  MCDARankingResult,
  RenovationScenario,
  ScenarioId,
} from "../../context/types";
import {
  formatCurrency,
  formatEnergyPerYear,
  formatHealthyLifeDays,
  formatHealthChange,
  formatTonnageCo2,
  getHealthChange,
  toHealthyLifeDays,
} from "../../utils/formatters";
import classes from "./ResultsLayout.module.css";
import shared from "../../../../components/shared/ResultsLayout.module.css";
import { ScenDot, ScoreBar } from "./resultsAtoms";

interface CompareAllTableProps {
  current: RenovationScenario | undefined;
  renovationScenarios: RenovationScenario[];
  financialResults: Record<ScenarioId, FinancialResults>;
  projectLifetime: number;
  ranking: MCDARankingResult[] | null;
  selectedScenarioId: ScenarioId | null;
  onSelectScenario: (scenarioId: ScenarioId) => void;
}

export function CompareAllTable({
  current,
  renovationScenarios,
  financialResults,
  projectLifetime,
  ranking,
  selectedScenarioId,
  onSelectScenario,
}: CompareAllTableProps) {
  // Doing nothing installs no materials, so the baseline's lifetime carbon is
  // its operational emissions alone. It is the anchor the packages are read
  // against, which is why it gets a figure where material carbon gets a dash.
  const baselineLifetimeCarbonKg = computeLifetimeCarbonKgCo2e({
    embodiedCarbonKgCo2e: 0,
    annualOperationalEmissionsTonCo2e: current?.annualEmissionsTonCo2e,
    projectLifetimeYears: projectLifetime,
  });
  const winnerId = ranking?.[0]?.scenarioId ?? null;
  const scoreById = new Map(
    (ranking ?? []).map((entry) => [entry.scenarioId, entry.score]),
  );

  return (
    <div className={shared.tableScroll}>
      <table className={shared.table}>
        <thead>
          <tr>
            <th>Package</th>
            <th>{relifeConcepts["annual-building-thermal-needs"].label}</th>
            <th>
              {relifeConcepts["thermal-health-impact"].label}{" "}
              <ConceptExplainer conceptId="thermal-health-impact" />
            </th>
            <th>
              {relifeConcepts["operational-co2-emissions"].label}{" "}
              <ConceptExplainer conceptId="operational-co2-emissions" />
            </th>
            <th>
              {relifeConcepts["embodied-carbon"].label}{" "}
              <ConceptExplainer conceptId="embodied-carbon" />
            </th>
            <th>
              {relifeConcepts["whole-life-carbon"].label}{" "}
              <ConceptExplainer conceptId="whole-life-carbon" />
            </th>
            <th>{relifeConcepts.investment.label}</th>
            <th>{compactConceptLabel("npv")}</th>
            <th>{relifeConcepts["payback-period"].label}</th>
            <th>{relifeConcepts["monthly-cash-benefit"].label}</th>
            <th>{relifeConcepts["ranking-score"].label}</th>
          </tr>
        </thead>
        <tbody>
          {current ? (
            <tr className={shared.baseline}>
              <td>
                <div className={shared.rowName}>
                  <ScenDot scenarioId={current.id} />
                  <div>
                    <span className={classes.baselineTag}>Baseline</span>
                    Current home
                  </div>
                </div>
              </td>
              <td>{formatEnergyPerYear(current.annualEnergyNeeds)}</td>
              <td>
                {formatHealthyLifeDays(
                  toHealthyLifeDays(current.annualThermalDalyPerPerson),
                )}
              </td>
              <td>
                {current.annualEmissionsTonCo2e !== undefined
                  ? formatTonnageCo2(current.annualEmissionsTonCo2e, {
                      decimal: true,
                    })
                  : "—"}
              </td>
              <td>—</td>
              <td>
                {baselineLifetimeCarbonKg !== undefined
                  ? formatTonnageCo2(baselineLifetimeCarbonKg / 1000, {
                      decimal: true,
                    })
                  : "—"}
              </td>
              <td>—</td>
              <td>—</td>
              <td>—</td>
              <td>—</td>
              <td>—</td>
            </tr>
          ) : null}
          {renovationScenarios.map((scenario) => {
            const result = financialResults[scenario.id];
            const isSel = scenario.id === selectedScenarioId;
            const score = scoreById.get(scenario.id);
            const appraised = appraisedFigures(result);
            const npv = appraised?.pointForecasts.NPV;
            const avoidedDays = toHealthyLifeDays(
              scenario.avoidedThermalDalyPerPerson,
            );
            const healthChange = getHealthChange(avoidedDays);
            const emissionsDelta =
              scenario.annualEmissionsTonCo2e !== undefined &&
              current?.annualEmissionsTonCo2e !== undefined
                ? scenario.annualEmissionsTonCo2e -
                  current.annualEmissionsTonCo2e
                : undefined;
            const lifetimeCarbonKg = computeLifetimeCarbonKgCo2e({
              embodiedCarbonKgCo2e: scenario.embodiedCarbonKgCo2e,
              annualOperationalEmissionsTonCo2e:
                scenario.annualEmissionsTonCo2e,
              projectLifetimeYears: projectLifetime,
            });

            return (
              <tr
                key={scenario.id}
                className={`${shared.scen} ${isSel ? shared.sel : ""}`}
                onClick={() => onSelectScenario(scenario.id)}
              >
                <td>
                  <div className={shared.rowName}>
                    <ScenDot scenarioId={scenario.id} />
                    <span>{scenario.label}</span>
                    {scenario.id === winnerId ? (
                      <IconCrown
                        size={14}
                        color="var(--mantine-color-relife-8)"
                      />
                    ) : null}
                  </div>
                </td>
                <td>{formatEnergyPerYear(scenario.annualEnergyNeeds)}</td>
                <td>
                  {formatHealthyLifeDays(
                    toHealthyLifeDays(scenario.annualThermalDalyPerPerson),
                  )}
                  {avoidedDays !== undefined ? (
                    <Text
                      component="span"
                      display="block"
                      size="xs"
                      fw={600}
                      c={healthChange?.color ?? "dimmed"}
                    >
                      {formatHealthChange(avoidedDays, healthChange)}
                    </Text>
                  ) : null}
                </td>
                <td>
                  {scenario.annualEmissionsTonCo2e !== undefined
                    ? formatTonnageCo2(scenario.annualEmissionsTonCo2e, {
                        decimal: true,
                      })
                    : "—"}
                  {emissionsDelta !== undefined && emissionsDelta !== 0 ? (
                    <Text
                      component="span"
                      display="block"
                      size="xs"
                      fw={600}
                      c={emissionsDelta < 0 ? "green" : "red"}
                    >
                      {emissionsDelta > 0 ? "+" : ""}
                      {formatTonnageCo2(emissionsDelta, { decimal: true })}
                    </Text>
                  ) : null}
                </td>
                <td>
                  {scenario.embodiedCarbonKgCo2e !== undefined
                    ? formatTonnageCo2(scenario.embodiedCarbonKgCo2e / 1000, {
                        decimal: true,
                      })
                    : "—"}
                </td>
                <td>
                  {lifetimeCarbonKg !== undefined
                    ? formatTonnageCo2(lifetimeCarbonKg / 1000, {
                        decimal: true,
                      })
                    : "—"}
                </td>
                <td>
                  {result?.capitalExpenditure !== undefined
                    ? formatCurrency(result.capitalExpenditure)
                    : "—"}
                </td>
                <td
                  style={{
                    color:
                      npv !== undefined && npv < 0
                        ? "var(--mantine-color-red-7)"
                        : undefined,
                    fontWeight: 600,
                  }}
                >
                  <ReadingText reading={readMetric(result?.appraisal, "NPV")} />
                </td>
                <td>
                  <ReadingText reading={readMetric(result?.appraisal, "PBP")} />
                </td>
                <td>
                  <ReadingText
                    reading={readMetric(result?.appraisal, "MonthlyAvgSavings")}
                  />
                </td>
                <td>
                  {score !== undefined ? (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "flex-end",
                      }}
                    >
                      <ScoreBar pct={score * 100} scenarioId={scenario.id} />
                    </span>
                  ) : (
                    <Text component="span" size="sm" c="dimmed">
                      —
                    </Text>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
