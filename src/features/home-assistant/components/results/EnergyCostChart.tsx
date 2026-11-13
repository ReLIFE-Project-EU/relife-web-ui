/**
 * EnergyCostChart — heating & cooling running cost today and for every
 * package.
 *
 * Deliberately NOT called an energy bill: the carrier breakdown derives from
 * delivered energy, which covers HVAC end uses only. Hot water, lighting and
 * appliances are excluded, so this figure is well below a household bill.
 *
 * Prices come from the same tariffs and the same pricing function that
 * FinancialService uses to build the risk-assessment request, so this chart
 * cannot contradict the savings figures derived from that request.
 */

import { Group, Progress, Stack, Text } from "@mantine/core";
import { IconChartBar } from "@tabler/icons-react";
import { computeCarrierAnnualCostEur } from "../../../../services/carrierSavingsService";
import { getScenarioColor } from "../../utils/colorUtils";
import { formatApproxCurrency } from "../../utils/formatters";
import type { RenovationScenario } from "../../context/types";
import classes from "./ResultsLayout.module.css";
import { ColorDot } from "../../../../components/shared/ResultAtoms";

const PERCENT_PER_RATIO = 100;

interface EnergyCostChartProps {
  current: RenovationScenario | undefined;
  /** Packages in rank order. */
  rankedScenarios: RenovationScenario[];
  /** User-adjustable gas tariff from HRA state. */
  gasTariffEurPerKwh: number | null;
  electricityTariffEurPerKwh: number | null;
}

export function EnergyCostChart({
  current,
  rankedScenarios,
  gasTariffEurPerKwh,
  electricityTariffEurPerKwh,
}: EnergyCostChartProps) {
  const tariffs =
    gasTariffEurPerKwh !== null && electricityTariffEurPerKwh !== null
      ? {
          gasTariffEurPerKwh,
          electricityReferencePriceEurPerKwh: electricityTariffEurPerKwh,
        }
      : null;

  const bars = [
    ...(current ? [{ ...current, label: "Today" }] : []),
    ...rankedScenarios,
  ].flatMap((scenario) =>
    scenario.carrierBreakdown && tariffs
      ? [
          {
            id: scenario.id,
            label: scenario.label,
            cost: computeCarrierAnnualCostEur(
              scenario.carrierBreakdown,
              tariffs,
            ),
          },
        ]
      : [],
  );

  const highestCost = Math.max(...bars.map((bar) => bar.cost));

  return (
    <section className={classes.panel} aria-label="Running cost">
      <div className={classes.panelHead}>
        <IconChartBar size={16} />
        <h3>Heating &amp; cooling running cost</h3>
      </div>

      {!current?.carrierBreakdown || bars.length < 2 || highestCost <= 0 ? (
        <Text size="sm" c="dimmed">
          Running cost unavailable.
        </Text>
      ) : (
        <>
          <Stack gap="sm">
            {bars.map((bar) => (
              <div key={bar.id}>
                <Group justify="space-between" wrap="nowrap" align="flex-end">
                  <Group gap="xs" wrap="nowrap">
                    <ColorDot color={getScenarioColor(bar.id)} />
                    <Text size="sm">{bar.label}</Text>
                  </Group>
                  <Text size="sm" fw={600}>
                    {formatApproxCurrency(bar.cost)}
                  </Text>
                </Group>
                <Progress
                  value={(bar.cost / highestCost) * PERCENT_PER_RATIO}
                  color={`${getScenarioColor(bar.id)}.6`}
                  size="lg"
                  mt={4}
                />
              </div>
            ))}
          </Stack>
        </>
      )}
    </section>
  );
}
