/**
 * MetricExplainer Component
 * Provides plain-language explanations for financial metrics.
 * Wraps content with an info icon that shows explanatory tooltips.
 */

import { Tooltip, Box } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import type { ReactNode } from "react";

export type FinancialMetricType =
  | "NPV"
  | "PBP"
  | "DPP"
  | "IRR"
  | "ROI"
  | "MonthlyAvgSavings"
  | "SuccessRate"
  | "CAPEX"
  | "ARV"
  | "BreakEven"
  | "EnergyReduction"
  | "EPCClass";

interface MetricExplanation {
  title: string;
  description: string;
  goodValue: string;
}

const explanations: Record<FinancialMetricType, MetricExplanation> = {
  NPV: {
    title: "Net Present Value",
    description:
      "The total financial benefit of this renovation, accounting for the time value of money. It shows how much your future savings are worth in today's euros.",
    goodValue:
      "A positive number means the renovation is financially beneficial.",
  },
  PBP: {
    title: "Simple Payback Period",
    description:
      "How long it takes for your energy savings to pay back the renovation cost. This is a simple calculation that doesn't account for inflation.",
    goodValue:
      "Shorter is better. Under 10 years is typically considered good.",
  },
  DPP: {
    title: "Discounted Payback Period",
    description:
      "Like the simple payback period, but accounting for the time value of money. This is a more realistic estimate of when you'll recover your investment.",
    goodValue:
      "Shorter is better. Usually slightly longer than simple payback.",
  },
  IRR: {
    title: "Internal Rate of Return",
    description:
      "The annual return rate of your investment. Compare this to other investments (like savings accounts) to see if renovation is a good use of your money.",
    goodValue:
      "Higher is better. Above 5% is generally good for building renovations.",
  },
  ROI: {
    title: "Return on Investment",
    description:
      "The total return relative to your initial investment. Shows how much you gain for every euro invested over the project lifetime.",
    goodValue:
      "Higher is better. Above 100% means you more than double your investment.",
  },
  MonthlyAvgSavings: {
    title: "Monthly Cash Benefit",
    description:
      "An average monthly financial benefit across the project lifetime. It is based on the Financial API model, so it reflects more than energy bills alone.",
    goodValue:
      "Higher is better, but treat it as a comparison estimate rather than a bill forecast.",
  },
  SuccessRate: {
    title: "Success Probability",
    description:
      "Based on Monte Carlo simulation with varying energy prices, interest rates, and economic conditions. Shows the percentage of scenarios where your renovation is profitable.",
    goodValue:
      "Above 80% is low risk, 60-80% is moderate, below 60% is higher risk.",
  },
  CAPEX: {
    title: "Capital Expenditure",
    description:
      "The total upfront investment required for the renovation, including materials, labor, and installation costs.",
    goodValue:
      "Lower upfront cost is better, but consider quality and long-term savings.",
  },
  ARV: {
    title: "After Renovation Value",
    description:
      "The estimated market value of your property after completing the renovation. Energy-efficient homes typically command higher prices.",
    goodValue: "Higher value means better return if you decide to sell.",
  },
  BreakEven: {
    title: "Break-even Year",
    description:
      "The first year when your cumulative savings exceed your cumulative costs. After this point, you're in profit.",
    goodValue:
      "Earlier break-even is better. Before year 10 is typically good.",
  },
  EnergyReduction: {
    title: "Energy Consumption Change",
    description:
      "Percentage change in annual HVAC energy consumption after renovation, calculated as (after − before) / before. Negative values mean lower consumption. Computed by the ReLIFE Platform from energy simulation results.",
    goodValue:
      "Negative is better. Deep renovations typically achieve −40% to −70%.",
  },
  EPCClass: {
    title: "EPC Class (Estimated)",
    description:
      "Energy Performance Certificate class derived by the ReLIFE Platform from simulated energy intensity (kWh/m²/year) using approximate thresholds. Not an official certificate — actual EPC boundaries vary by country.",
    goodValue:
      "A+ is best (under 30 kWh/m²/year). G is worst (over 450 kWh/m²/year).",
  },
};

interface MetricExplainerProps {
  /** The financial metric type */
  metric: FinancialMetricType;
  /** Icon size */
  size?: number;
  /** Optional children to wrap (defaults to info icon) */
  children?: ReactNode;
}

export function MetricExplainer({
  metric,
  size = 14,
  children,
}: MetricExplainerProps) {
  const explanation = explanations[metric];

  const tooltipContent = (
    <Box>
      <Box fw={500} mb={4}>
        {explanation.title}
      </Box>
      <Box mb={4}>{explanation.description}</Box>
      <Box c="dimmed" fs="italic">
        {explanation.goodValue}
      </Box>
    </Box>
  );

  return (
    <Tooltip label={tooltipContent} withArrow multiline w={280} position="top">
      {children ?? (
        <IconInfoCircle
          size={size}
          style={{ opacity: 0.5, cursor: "help", flexShrink: 0 }}
        />
      )}
    </Tooltip>
  );
}
