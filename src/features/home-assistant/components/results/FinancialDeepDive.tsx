/**
 * FinancialDeepDive — right column of the HRA deep-dive panel.
 * Shows funding pills, the four headline financial metrics, the success
 * probability gauge, and a row of secondary IRR / ROI / DPP indicators.
 */

import { Badge, Group, Text } from "@mantine/core";
import type {
  FinancialResults,
  FundingOptions,
  RenovationScenario,
} from "../../context/types";
import {
  formatCurrency,
  formatPercent,
  formatYears,
} from "../../utils/formatters";
import { FinancialMetricCard } from "./FinancialMetricCard";
import { RiskGauge } from "./RiskGauge";
import classes from "./ResultsLayout.module.css";

interface FinancialDeepDiveProps {
  selected: RenovationScenario;
  result: FinancialResults | undefined;
  funding: FundingOptions;
}

export function FinancialDeepDive({
  selected,
  result,
  funding,
}: FinancialDeepDiveProps) {
  return (
    <div>
      <div className={classes.deepEyebrow}>Financials</div>
      <h3 className={classes.deepHeading}>Money in, money out</h3>

      <FundingPills funding={funding} />

      {!result ? (
        <div className={classes.empty} style={{ marginTop: 12 }}>
          <div className={classes.emptyTitle}>
            Financial results unavailable
          </div>
          <Text size="sm">
            No package-level details available for {selected.label}.
          </Text>
        </div>
      ) : (
        <>
          <div className={classes.finGrid} style={{ marginTop: 12 }}>
            <FinancialMetricCard
              conceptId="npv"
              metricType="NPV"
              value={
                result.riskAssessment?.pointForecasts.NPV ??
                result.netPresentValue
              }
              formatter={formatCurrency}
              percentiles={result.riskAssessment?.percentiles?.NPV}
              color="green"
              highlighted
            />
            <FinancialMetricCard
              conceptId="payback-period"
              metricType="PBP"
              value={
                result.riskAssessment?.pointForecasts.PBP ?? result.paybackTime
              }
              formatter={formatYears}
              percentiles={result.riskAssessment?.percentiles?.PBP}
              color="teal"
              lowerIsBetter
              highlighted
            />
            {result.riskAssessment?.pointForecasts.MonthlyAvgSavings !==
            undefined ? (
              <FinancialMetricCard
                conceptId="monthly-cash-benefit"
                metricType="MonthlyAvgSavings"
                value={result.riskAssessment.pointForecasts.MonthlyAvgSavings}
                formatter={formatCurrency}
                color="orange"
                highlighted
              />
            ) : null}
            <FinancialMetricCard
              conceptId="investment"
              metricType="CAPEX"
              value={result.capitalExpenditure}
              formatter={formatCurrency}
              color="gray"
            />
          </div>

          {result.riskAssessment?.pointForecasts.SuccessRate !== undefined ? (
            <div style={{ marginTop: 12 }}>
              <RiskGauge
                successRate={result.riskAssessment.pointForecasts.SuccessRate}
              />
            </div>
          ) : null}

          <SecondaryMetrics result={result} />
        </>
      )}
    </div>
  );
}

function FundingPills({ funding }: { funding: FundingOptions }) {
  const pills: string[] = [];
  pills.push(funding.financingType === "loan" ? "Loan" : "Self-funded");
  if (funding.incentives.upfrontPercentage > 0) {
    pills.push(
      `${formatPercent(funding.incentives.upfrontPercentage)} upfront grant`,
    );
  }
  if (
    funding.incentives.lifetimeAmount > 0 &&
    funding.incentives.lifetimeYears > 0
  ) {
    pills.push(
      `${formatCurrency(funding.incentives.lifetimeAmount)}/yr · ${funding.incentives.lifetimeYears} yr lifetime`,
    );
  }
  return (
    <Group gap={6} wrap="wrap">
      {pills.map((pill) => (
        <Badge key={pill} variant="light" color="blue" radius="sm">
          {pill}
        </Badge>
      ))}
    </Group>
  );
}

function SecondaryMetrics({ result }: { result: FinancialResults }) {
  const irr = result.riskAssessment?.pointForecasts.IRR;
  const roi =
    result.riskAssessment?.pointForecasts.ROI ?? result.returnOnInvestment;
  const dpp = result.riskAssessment?.pointForecasts.DPP;

  return (
    <div className={classes.finExtras}>
      {irr !== undefined ? (
        <span>
          <b>IRR</b> {formatPercent(irr * 100)}
        </span>
      ) : null}
      {roi !== undefined ? (
        <span>
          <b>ROI</b> {formatPercent(roi * 100)}
        </span>
      ) : null}
      {dpp !== undefined ? (
        <span>
          <b>DPP</b> {formatYears(dpp)}
        </span>
      ) : null}
    </div>
  );
}
