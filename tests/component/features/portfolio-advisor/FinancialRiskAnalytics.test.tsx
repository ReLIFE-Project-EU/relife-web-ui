// @vitest-environment jsdom

import React from "react";
import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { theme } from "../../../../src/theme";
import { FinancialRiskAnalytics } from "../../../../src/features/portfolio-advisor/components/results/FinancialRiskAnalytics";
import type { PRAFinancialResults } from "../../../../src/features/portfolio-advisor/context/types";

const { MockBarChart } = vi.hoisted(() => ({
  MockBarChart: () => null,
}));

vi.mock("@mantine/charts", () => ({
  BarChart: MockBarChart,
}));

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

Object.defineProperty(window, "ResizeObserver", {
  writable: true,
  value: ResizeObserverMock,
});

function renderAnalytics(financialResults?: PRAFinancialResults) {
  return render(
    React.createElement(
      MantineProvider,
      { theme },
      React.createElement(FinancialRiskAnalytics, { financialResults }),
    ),
  );
}

const riskResults = {
  arv: null,
  riskAssessment: {
    pointForecasts: {
      NPV: 5000,
      IRR: 0.06,
      ROI: 0.22,
      PBP: 8,
      DPP: 10,
      MonthlyAvgSavings: 50,
      SuccessRate: 0.8,
    },
    metadata: {
      project_lifetime: 20,
      capex: 10000,
      output_level: "professional",
      chart_metadata: {
        NPV: {
          bins: {
            centers: [-1000, 0, 1000],
            counts: [2, 5, 3],
            edges: [-1500, -500, 500, 1500],
          },
          statistics: {
            mean: 100,
            std: 250,
            P10: -500,
            P50: 100,
            P90: 750,
          },
          chart_config: {
            title: "NPV Distribution",
            ylabel: "Frequency",
          },
        },
        ROI: {
          bins: {
            centers: [0.1, 0.2, 0.3],
            counts: [1, 4, 2],
            edges: [0.05, 0.15, 0.25, 0.35],
          },
          statistics: {
            mean: 0.2,
            std: 0.05,
            P10: 0.1,
            P50: 0.2,
            P90: 0.3,
          },
          chart_config: {
            title: "ROI Distribution",
            ylabel: "Frequency",
          },
        },
      },
    },
    probabilities: {
      "Pr(NPV > 0)": 0.8,
    },
    percentiles: {
      NPV: {
        P10: -500,
        P50: 100,
        P90: 750,
      },
    },
  },
  capitalExpenditure: 10000,
  returnOnInvestment: 0.22,
  paybackTime: 8,
  netPresentValue: 5000,
  afterRenovationValue: 200000,
  probabilities: {
    "Pr(NPV > 0)": 0.8,
  },
  chartMetadata: {
    NPV: {
      bins: {
        centers: [-1000, 0, 1000],
        counts: [2, 5, 3],
        edges: [-1500, -500, 500, 1500],
      },
      statistics: {
        mean: 100,
        std: 250,
        P10: -500,
        P50: 100,
        P90: 750,
      },
      chart_config: {
        title: "NPV Distribution",
        ylabel: "Frequency",
      },
    },
    ROI: {
      bins: {
        centers: [0.1, 0.2, 0.3],
        counts: [1, 4, 2],
        edges: [0.05, 0.15, 0.25, 0.35],
      },
      statistics: {
        mean: 0.2,
        std: 0.05,
        P10: 0.1,
        P50: 0.2,
        P90: 0.3,
      },
      chart_config: {
        title: "ROI Distribution",
        ylabel: "Frequency",
      },
    },
  },
} satisfies PRAFinancialResults;

describe("FinancialRiskAnalytics", () => {
  test("formats probability thresholds from risk data", () => {
    renderAnalytics(riskResults);

    // The 0.8 probability is rendered as a formatted percentage.
    expect(screen.getByText("80.0%")).toBeTruthy();
  });

  test("renders unavailable state when risk assessment is missing", () => {
    renderAnalytics();

    expect(
      screen.getByText(
        "Professional risk analytics are not available for this building.",
      ),
    ).toBeTruthy();
  });
});
