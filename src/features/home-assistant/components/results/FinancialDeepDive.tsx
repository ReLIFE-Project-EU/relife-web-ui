/**
 * FinancialDeepDive — right column of the HRA deep-dive panel.
 * Shows funding pills, the four headline financial metrics, the success
 * probability gauge, and a row of secondary IRR / ROI / DPP indicators.
 */

import { Alert, Text } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import {
  ConceptExplainer,
  ConceptMetricCard,
  FundingPills,
  RangeIndicator,
  ReadingText,
} from "../../../../components/shared";
import { compactConceptLabel } from "../../../../constants/relifeConcepts";
import {
  readMetric,
  readRange,
  type MetricRange,
} from "../../../../services/appraisalReadout";
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
import { RiskGauge } from "./RiskGauge";
import { gainLossColor } from "../../utils/colorUtils";
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
      <h3 className={shared.deepHeading}>Financials</h3>

      <FundingPills funding={funding} />

      {!result ? (
        <div className={`${classes.empty} ${classes.block}`}>
          <div className={classes.emptyTitle}>
            Financial results unavailable
          </div>
          <Text size="sm">No details available for {selected.label}.</Text>
        </div>
      ) : (
        <>
          <div className={`${shared.tileGrid} ${classes.block}`}>
            {appraised ? (
              <ConceptMetricCard
                conceptId="npv"
                value={<ReadingText reading={readMetric(appraised, "NPV")} />}
                valueColor={gainLossColor(appraised.pointForecasts.NPV)}
                footer={<Range range={readRange(appraised, "NPV")} />}
              />
            ) : null}
            {appraised ? (
              <ConceptMetricCard
                conceptId="payback-period"
                value={<ReadingText reading={readMetric(appraised, "PBP")} />}
                footer={<Range range={readRange(appraised, "PBP")} />}
              />
            ) : null}
            {appraised?.pointForecasts.MonthlyAvgSavings !== undefined ? (
              <ConceptMetricCard
                conceptId="monthly-cash-benefit"
                value={
                  <ReadingText
                    reading={readMetric(appraised, "MonthlyAvgSavings")}
                  />
                }
                valueColor={gainLossColor(
                  appraised.pointForecasts.MonthlyAvgSavings,
                )}
              />
            ) : null}
            <ConceptMetricCard
              conceptId="investment"
              value={formatCurrency(result.capitalExpenditure)}
            />
            {appraised?.pointForecasts.SuccessRate !== undefined ? (
              <RiskGauge successRate={appraised.pointForecasts.SuccessRate} />
            ) : null}
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

          <SecondaryMetrics result={result} />
        </>
      )}
    </div>
  );
}

const SECONDARY_METRICS = [
  { metric: "IRR", conceptId: "irr" },
  { metric: "ROI", conceptId: "roi" },
  { metric: "DPP", conceptId: "discounted-payback-period" },
] as const;

function SecondaryMetrics({ result }: { result: FinancialResults }) {
  const appraised = appraisedFigures(result);
  if (!appraised) return null;

  return (
    <div className={classes.finExtras}>
      {SECONDARY_METRICS.map(({ metric, conceptId }) => (
        <span key={metric}>
          <b>{compactConceptLabel(conceptId)}</b>{" "}
          <ReadingText reading={readMetric(appraised, metric)} />{" "}
          <ConceptExplainer conceptId={conceptId} />
        </span>
      ))}
    </div>
  );
}

function Range({ range }: { range: MetricRange | undefined }) {
  if (!range) return null;
  return (
    <RangeIndicator
      min={range.low}
      median={range.median}
      max={range.high}
      formatter={range.format}
      color="gray"
      size="sm"
    />
  );
}
