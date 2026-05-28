// @vitest-environment jsdom

import React from "react";
import { describe, expect, test, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { theme } from "../../../src/theme";
import { CashFlowChart } from "../../../src/components/shared/CashFlowChart";

const { compositeChartCalls } = vi.hoisted(() => ({
  compositeChartCalls: [] as Array<Record<string, unknown>>,
}));

vi.mock("@mantine/charts", () => ({
  CompositeChart: (props: Record<string, unknown>) => {
    compositeChartCalls.push(props);
    return null;
  },
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

function renderChart() {
  return render(
    React.createElement(
      MantineProvider,
      { theme },
      React.createElement(CashFlowChart, {
        data: {
          years: [0, 1, 2],
          annual_inflows: [0, 500, 600],
          annual_outflows: [1000, 100, 100],
          annual_net_cash_flow: [-1000, 400, 500],
          cumulative_cash_flow: [-1000, -600, -100],
          breakeven_year: null,
        },
        projectLifetime: 2,
      }),
    ),
  );
}

describe("CashFlowChart", () => {
  beforeEach(() => {
    compositeChartCalls.length = 0;
  });

  test("uses cumulative cash flow for the line series", () => {
    renderChart();

    expect(screen.getByText("Cash flow timeline")).toBeTruthy();
    const chartProps = compositeChartCalls[0];
    const data = chartProps.data as Array<Record<string, number>>;
    const series = chartProps.series as Array<Record<string, string>>;

    expect(series.map((entry) => entry.name)).toContain("Cumulative cash flow");
    expect(data[1]["Cumulative cash flow"]).toBe(-600);
    expect(data[2]["Cumulative cash flow"]).toBe(-100);
  });
});
