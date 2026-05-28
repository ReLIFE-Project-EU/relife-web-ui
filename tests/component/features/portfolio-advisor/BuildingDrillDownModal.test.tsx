// @vitest-environment jsdom

import React from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { theme } from "../../../../src/theme";
import { BuildingDrillDownModal } from "../../../../src/features/portfolio-advisor/components/results/BuildingDrillDownModal";
import type {
  BuildingAnalysisResult,
  PRABuilding,
} from "../../../../src/features/portfolio-advisor/context/types";

vi.mock("@mantine/charts", () => ({
  BarChart: () => null,
  CompositeChart: () => null,
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

const building: PRABuilding = {
  id: "building-1",
  name: "Building 1",
  source: "manual",
  category: "Single Family House",
  country: "Greece",
  lat: 37.98,
  lng: 23.73,
  floorArea: 100,
  constructionPeriod: "1961-1980",
  numberOfFloors: 2,
  propertyType: "Single Family House",
  validationStatus: "valid",
};

const baseResult: BuildingAnalysisResult = {
  buildingId: "building-1",
  status: "success",
  estimation: {
    estimatedEPC: "D",
    annualEnergyNeeds: 15000,
    annualEnergyCost: 3750,
    heatingCoolingNeeds: 15000,
    heatingDemand: 10000,
    coolingDemand: 5000,
    flexibilityIndex: 50,
    comfortIndex: 70,
    annualEnergyConsumption: 15000,
    deliveredTotal: 11000,
    deliveredEnergyCost: 2750,
    primaryEnergy: 16500,
    archetypeFloorArea: 100,
  },
  scenarios: [
    {
      id: "renovated",
      packageId: "renovated",
      label: "After Renovation",
      epcClass: "B",
      annualEnergyNeeds: 8000,
      annualEnergyCost: 2000,
      heatingCoolingNeeds: 8000,
      deliveredTotal: 7000,
      deliveredEnergyCost: 1750,
      primaryEnergy: 9600,
      flexibilityIndex: 55,
      comfortIndex: 75,
      measureIds: ["wall-insulation"],
      measures: ["Wall Insulation"],
    },
  ],
  financialResults: {
    arv: null,
    riskAssessment: {
      pointForecasts: {
        NPV: 5000,
        IRR: 0.06,
        ROI: 0.2,
        PBP: 8,
        DPP: 10,
        MonthlyAvgSavings: 50,
        SuccessRate: 0.8,
      },
      metadata: {
        project_lifetime: 20,
        capex: 10000,
        loan_amount: 0,
        output_level: "professional",
      },
    },
    capitalExpenditure: 10000,
    returnOnInvestment: 0.2,
    paybackTime: 8,
    netPresentValue: 5000,
    afterRenovationValue: 200000,
  },
};

function renderModal(result: BuildingAnalysisResult) {
  return render(
    React.createElement(
      MantineProvider,
      { theme },
      React.createElement(BuildingDrillDownModal, {
        opened: true,
        onClose: vi.fn(),
        building,
        result,
        projectLifetime: 20,
      }),
    ),
  );
}

describe("BuildingDrillDownModal", () => {
  afterEach(() => {
    cleanup();
  });

  test("renders cash-flow chart when data exists", () => {
    renderModal({
      ...baseResult,
      financialResults: {
        ...baseResult.financialResults!,
        riskAssessment: {
          ...baseResult.financialResults!.riskAssessment!,
          cashFlowData: {
            years: [0, 1],
            annual_inflows: [0, 500],
            annual_outflows: [10000, 100],
            annual_net_cash_flow: [-10000, 400],
            cumulative_cash_flow: [-10000, -9600],
          },
        },
      },
    });

    expect(screen.getByText("Cash flow timeline")).toBeTruthy();
  });

  test("does not render cash-flow chart when data is missing", () => {
    renderModal(baseResult);

    expect(screen.queryByText("Cash flow timeline")).toBeNull();
  });
});
