/**
 * FinancialDeepDive — right column of the HRA deep-dive panel.
 * Shows funding pills, the four headline financial metrics, the success
 * probability gauge, and a row of secondary IRR / ROI / DPP indicators.
 */

import { Alert, Text } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { FundingPills, NotApplicable } from "../../../../components/shared";
import {
  appraisedFigures,
  resolveSavingsAvailability,
  savingsAvailabilityExplanation,
  savingsAvailabilityLabel,
} from "../../../../services/savingsState";
import type {
  FinancialResults,
  FundingOptions,
  RenovationScenario,
} from "../../context/types";
import {
  formatCurrency,
  formatPaybackYears,
  formatPercent,
  isPaybackBeyondHorizon,
} from "../../utils/formatters";
import { FinancialMetricCard } from "./FinancialMetricCard";
import { RiskGauge } from "./RiskGauge";
import classes from "./ResultsLayout.module.css";
import shared from "../../../../components/shared/ResultsLayout.module.css";

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
  const appraised = appraisedFigures(result);
  const availability = resolveSavingsAvailability(selected, result);
  const paybackPercentiles = appraised?.percentiles?.PBP;
  const projectLifetime = appraised?.metadata.project_lifetime;
  const noPaybackWithinRange =
    paybackPercentiles != null &&
    isPaybackBeyondHorizon(paybackPercentiles.P10, projectLifetime) &&
    isPaybackBeyondHorizon(paybackPercentiles.P90, projectLifetime);

  return (
    <div>
      <div className={shared.deepEyebrow}>Financials</div>
      <h3 className={shared.deepHeading}>Money in, money out</h3>

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
            {appraised ? (
              <FinancialMetricCard
                conceptId="npv"
                metricType="NPV"
                value={appraised.pointForecasts.NPV}
                formatter={formatCurrency}
                percentiles={appraised.percentiles?.NPV}
                color="green"
                highlighted
              />
            ) : null}
            {appraised ? (
              <FinancialMetricCard
                conceptId="payback-period"
                metricType="PBP"
                value={appraised.pointForecasts.PBP}
                formatter={(v) => formatPaybackYears(v, projectLifetime)}
                percentiles={
                  noPaybackWithinRange ? undefined : paybackPercentiles
                }
                color="teal"
                lowerIsBetter
                highlighted
              />
            ) : null}
            {appraised?.pointForecasts.MonthlyAvgSavings !== undefined ? (
              <FinancialMetricCard
                conceptId="monthly-cash-benefit"
                metricType="MonthlyAvgSavings"
                value={appraised.pointForecasts.MonthlyAvgSavings}
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

          {!appraised && (
            <Alert
              mt="md"
              color={availability === "fully-funded" ? "teal" : "yellow"}
              variant="light"
              icon={<IconInfoCircle size={16} />}
              title={savingsAvailabilityLabel[availability]}
            >
              {savingsAvailabilityExplanation[availability]}
            </Alert>
          )}

          {appraised?.pointForecasts.SuccessRate !== undefined ? (
            <div style={{ marginTop: 12 }}>
              <RiskGauge successRate={appraised.pointForecasts.SuccessRate} />
            </div>
          ) : null}

          <SecondaryMetrics result={result} />
        </>
      )}
    </div>
  );
}

function SecondaryMetrics({ result }: { result: FinancialResults }) {
  const appraised = appraisedFigures(result);
  const irr = appraised?.pointForecasts.IRR;
  const roi = appraised?.pointForecasts.ROI;
  const dpp = appraised?.pointForecasts.DPP;
  const ratio = (value: number | null) =>
    value === null ? (
      <NotApplicable result={result} />
    ) : (
      formatPercent(value * 100)
    );

  return (
    <div className={classes.finExtras}>
      {irr !== undefined ? (
        <span>
          <b>IRR</b> {ratio(irr)}
        </span>
      ) : null}
      {roi !== undefined ? (
        <span>
          <b>ROI</b> {ratio(roi)}
        </span>
      ) : null}
      {dpp !== undefined ? (
        <span>
          <b>DPP</b>{" "}
          {formatPaybackYears(dpp, appraised?.metadata.project_lifetime)}
        </span>
      ) : null}
    </div>
  );
}
