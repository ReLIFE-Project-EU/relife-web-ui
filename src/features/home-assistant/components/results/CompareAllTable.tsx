/**
 * CompareAllTable — comparison table shown inside the "Compare all packages"
 * results section. Includes a baseline (current home) row and one row per
 * renovation scenario, with click-to-inspect behavior tied to the deep-dive
 * selection. The surrounding section supplies the heading and card chrome.
 */

import { Text } from "@mantine/core";
import { IconCrown } from "@tabler/icons-react";
import { EPCBadge } from "../../../../components/shared";
import { ConceptExplainer } from "../../../../components/shared/ConceptExplainer";
import type {
  FinancialResults,
  MCDARankingResult,
  RenovationScenario,
  ScenarioId,
} from "../../context/types";
import {
  formatCurrency,
  formatEnergyPerYear,
  formatPaybackYears,
  formatTonnageCo2,
} from "../../utils/formatters";
import classes from "./ResultsLayout.module.css";
import { ScenDot, ScoreBar } from "./resultsAtoms";

interface CompareAllTableProps {
  current: RenovationScenario | undefined;
  renovationScenarios: RenovationScenario[];
  financialResults: Record<ScenarioId, FinancialResults>;
  ranking: MCDARankingResult[] | null;
  selectedScenarioId: ScenarioId | null;
  onSelectScenario: (scenarioId: ScenarioId) => void;
}

export function CompareAllTable({
  current,
  renovationScenarios,
  financialResults,
  ranking,
  selectedScenarioId,
  onSelectScenario,
}: CompareAllTableProps) {
  const winnerId = ranking?.[0]?.scenarioId ?? null;
  const scoreById = new Map(
    (ranking ?? []).map((entry) => [entry.scenarioId, entry.score]),
  );

  return (
    <div className={classes.tableScroll}>
      <table className={classes.table}>
        <thead>
          <tr>
            <th>Package</th>
            <th>EPC</th>
            <th>Thermal needs</th>
            <th>
              CO₂ <ConceptExplainer conceptId="operational-co2-emissions" />
            </th>
            <th>Investment</th>
            <th>NPV</th>
            <th>Payback</th>
            <th>Monthly cash benefit</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          {current ? (
            <tr className={classes.baseline}>
              <td>
                <div className={classes.rowName}>
                  <ScenDot scenarioId={current.id} />
                  <div>
                    <span className={classes.baselineTag}>Baseline</span>
                    Current home
                  </div>
                </div>
              </td>
              <td>
                <EPCBadge epcClass={current.epcClass} size="sm" estimated />
              </td>
              <td>{formatEnergyPerYear(current.annualEnergyNeeds)}</td>
              <td>
                {current.annualEmissionsTonCo2e !== undefined
                  ? formatTonnageCo2(current.annualEmissionsTonCo2e, {
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
            const npv =
              result?.riskAssessment?.pointForecasts.NPV ??
              result?.netPresentValue;
            const pbp =
              result?.riskAssessment?.pointForecasts.PBP ?? result?.paybackTime;
            const monthly =
              result?.riskAssessment?.pointForecasts.MonthlyAvgSavings;
            const emissionsDelta =
              scenario.annualEmissionsTonCo2e !== undefined &&
              current?.annualEmissionsTonCo2e !== undefined
                ? scenario.annualEmissionsTonCo2e -
                  current.annualEmissionsTonCo2e
                : undefined;

            return (
              <tr
                key={scenario.id}
                className={`${classes.scen} ${isSel ? classes.sel : ""}`}
                onClick={() => onSelectScenario(scenario.id)}
              >
                <td>
                  <div className={classes.rowName}>
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
                <td>
                  <EPCBadge epcClass={scenario.epcClass} size="sm" estimated />
                </td>
                <td>{formatEnergyPerYear(scenario.annualEnergyNeeds)}</td>
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
                  {npv !== undefined ? formatCurrency(npv) : "—"}
                </td>
                <td>
                  {pbp !== undefined
                    ? formatPaybackYears(
                        pbp,
                        result?.riskAssessment?.metadata.project_lifetime,
                      )
                    : "—"}
                </td>
                <td>
                  {monthly !== undefined
                    ? `${formatCurrency(monthly)}/mo`
                    : "—"}
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
