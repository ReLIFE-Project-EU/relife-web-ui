/**
 * EnergyCostChart — before/after heating & cooling running cost for the
 * recommended package.
 *
 * Deliberately NOT called an energy bill: the carrier breakdown derives from
 * delivered energy, which covers HVAC end uses only. Hot water, lighting and
 * appliances are excluded, so this figure is well below a household bill.
 *
 * Prices come from the same tariffs and the same pricing function that
 * FinancialService uses to build the risk-assessment request, so this chart
 * cannot contradict the savings figures derived from that request.
 */

import { BarChart } from "@mantine/charts";
import { Text } from "@mantine/core";
import { IconChartBar } from "@tabler/icons-react";
import {
  computeCarrierAnnualCostEur,
  FINANCIAL_ELECTRICITY_REFERENCE_EUR_PER_KWH,
} from "../../../../services/carrierSavingsService";
import { formatApproxCurrency } from "../../utils/formatters";
import type { RenovationScenario } from "../../context/types";
import classes from "./ResultsLayout.module.css";

const CHART_HEIGHT = 180;

interface EnergyCostChartProps {
  current: RenovationScenario | undefined;
  /** The recommended package, matching the hero card. */
  winner: RenovationScenario | undefined;
  /** User-adjustable gas tariff from HRA state. */
  gasTariffEurPerKwh: number;
}

export function EnergyCostChart({
  current,
  winner,
  gasTariffEurPerKwh,
}: EnergyCostChartProps) {
  const tariffs = {
    gasTariffEurPerKwh,
    electricityReferencePriceEurPerKwh:
      FINANCIAL_ELECTRICITY_REFERENCE_EUR_PER_KWH,
  };

  const baselineBreakdown = current?.carrierBreakdown;
  const winnerBreakdown = winner?.carrierBreakdown;

  return (
    <section className={classes.panel} aria-label="Running cost">
      <div className={classes.panelHead}>
        <IconChartBar size={16} />
        <h3>Heating &amp; cooling running cost</h3>
      </div>

      {!baselineBreakdown || !winnerBreakdown ? (
        <Text size="sm" c="dimmed">
          We could not work out what this package costs to run, so we cannot
          show a before-and-after comparison.
        </Text>
      ) : (
        <>
          <BarChart
            h={CHART_HEIGHT}
            data={[
              {
                stage: "Today",
                cost: computeCarrierAnnualCostEur(baselineBreakdown, tariffs),
              },
              {
                stage: winner.label,
                cost: computeCarrierAnnualCostEur(winnerBreakdown, tariffs),
              },
            ]}
            dataKey="stage"
            orientation="vertical"
            series={[{ name: "cost", label: "Per year", color: "relife.6" }]}
            tickLine="none"
            gridAxis="x"
            valueFormatter={formatApproxCurrency}
            withTooltip
          />
          <Text size="xs" c="dimmed" mt="sm">
            These figures cover heating and cooling only, and they are rounded.
            They leave out hot water, lighting and appliances, so your full
            energy bill will be higher. We priced them using your gas tariff and
            a reference electricity price.
          </Text>
        </>
      )}
    </section>
  );
}
