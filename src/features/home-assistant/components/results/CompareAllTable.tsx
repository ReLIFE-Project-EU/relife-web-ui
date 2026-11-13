/**
 * CompareAllTable — every package side by side. One column per package in
 * rank order, after today's home; one row per metric. Clicking a package
 * header opens it in the details below.
 */

import { Group, Table, Text, UnstyledButton } from "@mantine/core";
import { IconCrown } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { ConceptLabel } from "../../../../components/shared/ConceptLabel";
import { MetricEyebrow } from "../../../../components/shared/MetricEyebrow";
import { ReadingText } from "../../../../components/shared/ReadingText";
import type { ConceptId } from "../../../../constants/relifeConcepts";
import { readMetric } from "../../../../services/appraisalReadout";
import { computeLifetimeCarbonKgCo2e } from "../../../../services/carrierSavingsService";
import { appraisedFigures } from "../../../../services/savingsState";
import type {
  FinancialResults,
  MCDARankingResult,
  RenovationScenario,
  ScenarioId,
} from "../../context/types";
import {
  formatCurrency,
  formatDecimal,
  formatHealthyLifeDays,
  formatNumber,
  toHealthyLifeDays,
} from "../../utils/formatters";
import classes from "./ResultsLayout.module.css";
import { ColorDot, ScoreBar } from "../../../../components/shared/ResultAtoms";
import { gainLossColor, getScenarioColor } from "../../utils/colorUtils";

const KG_PER_TONNE = 1000;
const PERCENT_PER_RATIO = 100;
const EMPTY = "—";

interface CompareAllTableProps {
  current: RenovationScenario | undefined;
  /** Packages in rank order. */
  rankedScenarios: RenovationScenario[];
  financialResults: Record<ScenarioId, FinancialResults>;
  projectLifetime: number;
  ranking: MCDARankingResult[] | null;
  onSelectScenario: (scenarioId: ScenarioId) => void;
}

interface MetricRow {
  conceptId: ConceptId;
  /** Cells are bare numbers, so the row label carries the unit. */
  withUnit?: boolean;
  today: ReactNode;
  cell: (scenario: RenovationScenario) => ReactNode;
}

interface MetricGroup {
  title?: string;
  rows: MetricRow[];
}

export function CompareAllTable({
  current,
  rankedScenarios,
  financialResults,
  projectLifetime,
  ranking,
  onSelectScenario,
}: CompareAllTableProps) {
  const winnerId = ranking?.[0]?.scenarioId ?? null;
  const scoreById = new Map(
    (ranking ?? []).map((entry) => [entry.scenarioId, entry.score]),
  );
  const tonnes = (kg: number | undefined) =>
    kg === undefined ? EMPTY : formatDecimal(kg / KG_PER_TONNE);
  const lifetimeCarbonKg = (
    scenario: RenovationScenario | undefined,
    embodiedCarbonKgCo2e: number | undefined,
  ) =>
    computeLifetimeCarbonKgCo2e({
      embodiedCarbonKgCo2e,
      annualOperationalEmissionsTonCo2e: scenario?.annualEmissionsTonCo2e,
      projectLifetimeYears: projectLifetime,
    });
  const reading = (
    scenario: RenovationScenario,
    metric: "NPV" | "PBP" | "MonthlyAvgSavings",
  ) => (
    <ReadingText
      reading={readMetric(financialResults[scenario.id]?.appraisal, metric)}
    />
  );

  const groups: MetricGroup[] = [
    {
      rows: [
        {
          conceptId: "ranking-score",
          today: EMPTY,
          cell: (scenario) => {
            const score = scoreById.get(scenario.id);
            return score === undefined ? (
              EMPTY
            ) : (
              <ScoreBar
                color={getScenarioColor(scenario.id)}
                pct={score * PERCENT_PER_RATIO}
              />
            );
          },
        },
      ],
    },
    {
      title: "Energy & health",
      rows: [
        {
          conceptId: "annual-building-thermal-needs",
          withUnit: true,
          today: current ? formatNumber(current.annualEnergyNeeds) : EMPTY,
          cell: (scenario) => formatNumber(scenario.annualEnergyNeeds),
        },
        {
          conceptId: "thermal-health-impact",
          today: formatHealthyLifeDays(
            toHealthyLifeDays(current?.annualThermalDalyPerPerson),
          ),
          cell: (scenario) =>
            formatHealthyLifeDays(
              toHealthyLifeDays(scenario.annualThermalDalyPerPerson),
            ),
        },
      ],
    },
    {
      title: "Carbon",
      rows: [
        {
          conceptId: "operational-co2-emissions",
          withUnit: true,
          today:
            current?.annualEmissionsTonCo2e !== undefined
              ? formatDecimal(current.annualEmissionsTonCo2e)
              : EMPTY,
          cell: (scenario) =>
            scenario.annualEmissionsTonCo2e !== undefined
              ? formatDecimal(scenario.annualEmissionsTonCo2e)
              : EMPTY,
        },
        {
          conceptId: "embodied-carbon",
          withUnit: true,
          today: EMPTY,
          cell: (scenario) => tonnes(scenario.embodiedCarbonKgCo2e),
        },
        {
          conceptId: "whole-life-carbon",
          withUnit: true,
          // Doing nothing installs no materials.
          today: tonnes(lifetimeCarbonKg(current, 0)),
          cell: (scenario) =>
            tonnes(lifetimeCarbonKg(scenario, scenario.embodiedCarbonKgCo2e)),
        },
      ],
    },
    {
      title: "Financials",
      rows: [
        {
          conceptId: "investment",
          today: EMPTY,
          cell: (scenario) => {
            const capex = financialResults[scenario.id]?.capitalExpenditure;
            return capex === undefined ? EMPTY : formatCurrency(capex);
          },
        },
        {
          conceptId: "npv",
          today: EMPTY,
          cell: (scenario) => (
            <Text
              span
              inherit
              c={gainLossColor(
                appraisedFigures(financialResults[scenario.id])?.pointForecasts
                  .NPV,
              )}
            >
              {reading(scenario, "NPV")}
            </Text>
          ),
        },
        {
          conceptId: "payback-period",
          today: EMPTY,
          cell: (scenario) => reading(scenario, "PBP"),
        },
        {
          conceptId: "monthly-cash-benefit",
          today: EMPTY,
          cell: (scenario) => reading(scenario, "MonthlyAvgSavings"),
        },
      ],
    },
  ];

  return (
    <div className={classes.compareScroll}>
      <Table className={classes.compare} verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th />
            <Table.Th>
              <Group gap="xs" wrap="nowrap">
                <ColorDot color={getScenarioColor("current")} />
                Today
              </Group>
            </Table.Th>
            {rankedScenarios.map((scenario) => (
              <Table.Th key={scenario.id}>
                <UnstyledButton
                  fz="inherit"
                  fw="inherit"
                  onClick={() => onSelectScenario(scenario.id)}
                >
                  <Group gap="xs" wrap="nowrap" align="flex-start">
                    <ColorDot color={getScenarioColor(scenario.id)} />
                    <span>
                      {scenario.label}{" "}
                      {scenario.id === winnerId ? (
                        <IconCrown size={14} className={classes.crown} />
                      ) : null}
                    </span>
                  </Group>
                </UnstyledButton>
              </Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        {groups.map((group, index) => (
          <Table.Tbody key={group.title ?? index}>
            {group.title ? (
              <Table.Tr>
                <Table.Th colSpan={rankedScenarios.length + 2}>
                  <MetricEyebrow>{group.title}</MetricEyebrow>
                </Table.Th>
              </Table.Tr>
            ) : null}
            {group.rows.map((row) => (
              <Table.Tr key={row.conceptId}>
                <Table.Th scope="row">
                  <ConceptLabel
                    conceptId={row.conceptId}
                    withUnit={row.withUnit ?? false}
                    size="xs"
                  />
                </Table.Th>
                <Table.Td c="dimmed">{row.today}</Table.Td>
                {rankedScenarios.map((scenario) => (
                  <Table.Td key={scenario.id}>{row.cell(scenario)}</Table.Td>
                ))}
              </Table.Tr>
            ))}
          </Table.Tbody>
        ))}
      </Table>
    </div>
  );
}
