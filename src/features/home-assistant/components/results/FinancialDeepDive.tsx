/**
 * FinancialDeepDive — right column of the HRA deep-dive panel.
 * Shows funding pills, the four headline financial metrics, the success
 * probability gauge, and a row of secondary IRR / ROI / DPP indicators.
 */

import { Alert, Text } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { FundingPills, ReadingText } from "../../../../components/shared";
import { compactConceptLabel } from "../../../../constants/relifeConcepts";
import { readMetric, readRange } from "../../../../services/appraisalReadout";
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
import { formatCurrency } from "../../utils/formatters";
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
                value={<ReadingText reading={readMetric(appraised, "NPV")} />}
                range={readRange(appraised, "NPV")}
                color="green"
                highlighted
              />
            ) : null}
            {appraised ? (
              <FinancialMetricCard
                conceptId="payback-period"
                metricType="PBP"
                value={<ReadingText reading={readMetric(appraised, "PBP")} />}
                range={readRange(appraised, "PBP")}
                color="teal"
                lowerIsBetter
                highlighted
              />
            ) : null}
            {appraised?.pointForecasts.MonthlyAvgSavings !== undefined ? (
              <FinancialMetricCard
                conceptId="monthly-cash-benefit"
                metricType="MonthlyAvgSavings"
                value={
                  <ReadingText
                    reading={readMetric(appraised, "MonthlyAvgSavings")}
                  />
                }
                color="orange"
                highlighted
              />
            ) : null}
            <FinancialMetricCard
              conceptId="investment"
              metricType="CAPEX"
              value={formatCurrency(result.capitalExpenditure)}
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
  if (!appraised) return null;

  return (
    <div className={classes.finExtras}>
      <span>
        <b>{compactConceptLabel("irr")}</b>{" "}
        <ReadingText reading={readMetric(appraised, "IRR")} />
      </span>
      <span>
        <b>{compactConceptLabel("roi")}</b>{" "}
        <ReadingText reading={readMetric(appraised, "ROI")} />
      </span>
      <span>
        <b>{compactConceptLabel("discounted-payback-period")}</b>{" "}
        <ReadingText reading={readMetric(appraised, "DPP")} />
      </span>
    </div>
  );
}
