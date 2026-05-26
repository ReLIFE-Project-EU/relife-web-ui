// @vitest-environment jsdom

import React from "react";
import { describe, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";
import { theme } from "../../../../src/theme";
import { GlobalLoadingProvider } from "../../../../src/contexts/global-loading";
import { StrategyExplorer } from "../../../../src/features/strategy-explorer";

// jsdom does not implement matchMedia, ResizeObserver, or scrollIntoView.
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

Element.prototype.scrollIntoView = vi.fn();

// ─────────────────────────────────────────────────────────────────────────────
// Mocks — factories are hoisted; define data inline inside them.
// ─────────────────────────────────────────────────────────────────────────────

vi.mock(
  "../../../../src/features/strategy-explorer/services/archetypePortfolioService",
  () => ({
    archetypePortfolioService: {
      loadArchetypes: vi.fn().mockResolvedValue([
        { country: "IT", category: "SFH", name: "ref-a" },
        { country: "IT", category: "SFH", name: "ref-b" },
      ]),
      getArchetypeDetails: vi.fn().mockResolvedValue({
        country: "IT",
        category: "SFH",
        name: "ref-a",
        floorArea: 100,
        numberOfFloors: 2,
        floorHeight: 3,
        totalWindowArea: 20,
        thermalProperties: {
          wallUValue: 0.4,
          roofUValue: 0.3,
          windowUValue: 1.4,
        },
        setpoints: {
          heatingSetpoint: 20,
          heatingSetback: 16,
          coolingSetpoint: 26,
          coolingSetback: 30,
        },
      }),
      validatePortfolio: vi.fn((def) => def),
      expandPortfolio: vi.fn().mockResolvedValue([
        {
          archetype: { country: "IT", category: "SFH", name: "ref-a" },
          buildingCount: 10,
          details: { floorArea: 100 },
        },
      ]),
    },
  }),
);

vi.mock(
  "../../../../src/features/strategy-explorer/services/rseWorkflowService",
  () => ({
    runWorkflow: vi.fn().mockResolvedValue({
      request: {
        portfolio: {
          selections: [
            {
              archetype: { country: "IT", category: "SFH", name: "ref-a" },
              buildingCount: 10,
            },
          ],
        },
        goal: { kind: "energy" },
        packageIds: ["envelope", "combined"],
        financialAssumptions: {
          projectLifetimeYears: 20,
          financingType: "self-funded",
          upfrontIncentivePercentage: 0,
          lifetimeIncentiveAmountEur: 0,
          lifetimeIncentiveYears: 0,
        },
      },
      cacheVersion: "v1",
      packageAggregates: [
        {
          packageId: "combined",
          totalBuildings: 10,
          totalCapexEur: 200_000,
          totalAnnualMaintenanceEur: 1_000,
          totalAnnualEnergySavingsKwh: 50_000,
          totalAnnualCo2ReductionTon: 10,
          energySavedPerEur: 0.25,
          co2ReducedTonPerEur: 0.00005,
          financialIndicators: { aggregateNPV: 50_000, aggregateROI: 0.25 },
        },
        {
          packageId: "envelope",
          totalBuildings: 10,
          totalCapexEur: 100_000,
          totalAnnualMaintenanceEur: 500,
          totalAnnualEnergySavingsKwh: 30_000,
          totalAnnualCo2ReductionTon: 6,
          energySavedPerEur: 0.3,
          co2ReducedTonPerEur: 0.00006,
          financialIndicators: { aggregateNPV: 30_000, aggregateROI: 0.3 },
        },
      ],
      rankings: [
        {
          packageId: "envelope",
          rank: 1,
          score: 0.95,
          scoreComponents: {
            energySavedPerEur: 0.5,
            totalAnnualEnergySavingsKwh: 0.45,
          },
          explanation:
            "Ranks packages by annual energy saved per euro and total annual energy savings.",
        },
        {
          packageId: "combined",
          rank: 2,
          score: 0.85,
          scoreComponents: {
            energySavedPerEur: 0.45,
            totalAnnualEnergySavingsKwh: 0.4,
          },
          explanation:
            "Ranks packages by annual energy saved per euro and total annual energy savings.",
        },
      ],
      unavailableCombinations: [],
    }),
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────────

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <MantineProvider theme={theme}>
      <GlobalLoadingProvider>{ui}</GlobalLoadingProvider>
    </MantineProvider>,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Test
// ─────────────────────────────────────────────────────────────────────────────

describe("StrategyExplorer integration", () => {
  test("allows a user to complete the end-to-end workflow from portfolio selection to viewing analysis results", async () => {
    const user = userEvent.setup();
    renderWithProviders(<StrategyExplorer />);

    // Step 0 — Portfolio: wait for Select inputs to render
    const countryCombo = await screen.findByPlaceholderText(
      /select country/i,
      {},
      { timeout: 3000 },
    );
    const categoryCombo = screen.getByPlaceholderText(/select category/i);
    const archetypeCombo = screen.getByPlaceholderText(/select archetype/i);

    // Fill in portfolio row
    await user.click(countryCombo);
    await user.click(screen.getByText("Italy"));

    await user.click(categoryCombo);
    await user.click(screen.getByText("Single-Family House"));

    await user.click(archetypeCombo);
    await user.click(screen.getByText("Italy · ref-a"));

    expect(await screen.findByText("Floor area")).toBeTruthy();
    expect(screen.getByText("100 m²")).toBeTruthy();

    const buildingCountInput = screen.getByPlaceholderText(/^Count$/i);
    await user.clear(buildingCountInput);
    await user.type(buildingCountInput, "10");

    // Advance to Goal step
    await user.click(screen.getByRole("button", { name: /choose goal/i }));

    await waitFor(() => {
      expect(screen.getByText(/energy efficiency/i)).toBeTruthy();
    });

    // Select energy goal
    await user.click(screen.getByText(/energy efficiency/i));

    // Advance to Packages step
    await user.click(screen.getByRole("button", { name: /choose packages/i }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /run analysis/i }),
      ).toBeTruthy();
    });

    // Run analysis
    await user.click(screen.getByRole("button", { name: /run analysis/i }));

    // Assert Results step renders
    await waitFor(() => {
      expect(screen.getByText(/strategy comparison results/i)).toBeTruthy();
    });

    // Assert ranking table with packages
    expect(
      screen.getAllByText("Envelope Package").length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText("Combined Package").length,
    ).toBeGreaterThanOrEqual(1);

    // Assert ranks are shown (within the ranking table)
    const rankingTable = screen.getByTestId("rse-ranking-table");
    expect(rankingTable.textContent).toContain("1");
    expect(rankingTable.textContent).toContain("2");
  });
});
