// @vitest-environment jsdom

import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { afterEach, describe, expect, test, vi } from "vitest";
import { FinancialMetricCard } from "../../../src/features/home-assistant/components/results/FinancialMetricCard";
import { theme } from "../../../src/theme";
import { formatCurrency } from "../../../src/utils/formatters";
import type { PercentileData } from "../../../src/types/renovation";

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

function renderCard(percentiles?: PercentileData) {
  return render(
    <MantineProvider theme={theme}>
      <FinancialMetricCard
        conceptId="npv"
        metricType="NPV"
        value={15400}
        formatter={formatCurrency}
        percentiles={percentiles}
      />
    </MantineProvider>,
  );
}

afterEach(cleanup);

describe("FinancialMetricCard", () => {
  test("renders the range when percentiles are complete", () => {
    renderCard({ P10: 1000, P50: 15400, P90: 32000 });
    expect(screen.getByText(formatCurrency(1000))).toBeDefined();
    expect(screen.getByText(formatCurrency(32000))).toBeDefined();
  });

  test("hides the range and shows no null/NaN when percentiles are null-sanitized", () => {
    // Simulates a wire payload whose NaN/Inf values the backend replaced
    // with null; the adapter should filter these, and the card must also
    // guard against them.
    renderCard({
      P10: null,
      P50: null,
      P90: null,
    } as unknown as PercentileData);

    expect(screen.getByText(formatCurrency(15400))).toBeDefined();
    expect(screen.queryByText(/null/i)).toBeNull();
    expect(screen.queryByText(/NaN/i)).toBeNull();
  });
});
