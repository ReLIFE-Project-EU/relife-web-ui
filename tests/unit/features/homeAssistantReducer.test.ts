import { describe, expect, test } from "vitest";
import { PACKAGE_SELECTION_MAX } from "../../../src/features/home-assistant/constants";
import {
  homeAssistantReducer,
  initialState,
} from "../../../src/features/home-assistant/context/homeAssistantReducer";
import type { HomeAssistantState } from "../../../src/features/home-assistant/context/types";
import type {
  EstimationResult,
  RenovationPackage,
} from "../../../src/types/renovation";

const packages: RenovationPackage[] = [
  {
    id: "package-wall-insulation",
    label: "Wall Insulation",
    measureIds: ["wall-insulation"],
  },
  {
    id: "package-roof-insulation",
    label: "Roof Insulation",
    measureIds: ["roof-insulation"],
  },
  {
    id: "package-windows",
    label: "Window Replacement",
    measureIds: ["windows"],
  },
  {
    id: "package-floor-insulation",
    label: "Floor Insulation",
    measureIds: ["floor-insulation"],
  },
];

describe("homeAssistantReducer package financial inputs", () => {
  test("suggested packages start unselected with empty financial inputs", () => {
    const state = homeAssistantReducer(initialState, {
      type: "SET_SUGGESTED_PACKAGES",
      packages: packages.slice(0, 2),
    });

    expect(state.selectedPackageIds).toEqual([]);
    expect(state.packageFinancialInputs["package-wall-insulation"]).toEqual({
      capex: null,
      annualMaintenanceCost: null,
      capexAutoEstimated: false,
      opexAutoEstimated: false,
    });
    expect(state.packageFinancialInputs["package-roof-insulation"]).toEqual({
      capex: null,
      annualMaintenanceCost: null,
      capexAutoEstimated: false,
      opexAutoEstimated: false,
    });
  });

  test("package selection cannot exceed the configured maximum", () => {
    let state = homeAssistantReducer(initialState, {
      type: "SET_SUGGESTED_PACKAGES",
      packages,
    });

    for (const pkg of packages) {
      state = homeAssistantReducer(state, {
        type: "TOGGLE_PACKAGE",
        packageId: pkg.id,
      });
    }

    expect(state.selectedPackageIds).toHaveLength(PACKAGE_SELECTION_MAX);
    expect(state.selectedPackageIds).not.toContain("package-floor-insulation");
  });

  test("package financial inputs are preserved for unchanged package ids", () => {
    let state = homeAssistantReducer(initialState, {
      type: "SET_SUGGESTED_PACKAGES",
      packages: packages.slice(0, 2),
    });

    state = homeAssistantReducer(state, {
      type: "SET_PACKAGE_FINANCIAL_INPUT",
      packageId: "package-wall-insulation",
      field: "capex",
      value: 28_000,
    });

    state = homeAssistantReducer(state, {
      type: "SET_SUGGESTED_PACKAGES",
      packages: packages.slice(0, 3),
    });

    expect(state.packageFinancialInputs["package-wall-insulation"]?.capex).toBe(
      28_000,
    );
    expect(state.packageFinancialInputs["package-windows"]).toEqual({
      capex: null,
      annualMaintenanceCost: null,
      capexAutoEstimated: false,
      opexAutoEstimated: false,
    });
  });

  test("cost estimate sets both provenance flags; editing one field clears only its own", () => {
    let state = homeAssistantReducer(initialState, {
      type: "SET_SUGGESTED_PACKAGES",
      packages: packages.slice(0, 1),
    });

    state = homeAssistantReducer(state, {
      type: "SET_PACKAGE_COST_ESTIMATE",
      packageId: "package-wall-insulation",
      capex: 24_000,
      annualMaintenanceCost: 300,
    });

    expect(state.packageFinancialInputs["package-wall-insulation"]).toEqual({
      capex: 24_000,
      annualMaintenanceCost: 300,
      capexAutoEstimated: true,
      opexAutoEstimated: true,
    });

    // Editing maintenance must NOT clear the CAPEX provenance.
    state = homeAssistantReducer(state, {
      type: "SET_PACKAGE_FINANCIAL_INPUT",
      packageId: "package-wall-insulation",
      field: "annualMaintenanceCost",
      value: 450,
    });

    const input = state.packageFinancialInputs["package-wall-insulation"];
    expect(input?.capex).toBe(24_000);
    expect(input?.capexAutoEstimated).toBe(true);
    expect(input?.annualMaintenanceCost).toBe(450);
    expect(input?.opexAutoEstimated).toBe(false);
  });

  test("changing measures clears package inputs, selection, and results", () => {
    let state = homeAssistantReducer(initialState, {
      type: "SET_SUGGESTED_PACKAGES",
      packages: packages.slice(0, 2),
    });
    state = homeAssistantReducer(state, {
      type: "TOGGLE_PACKAGE",
      packageId: "package-wall-insulation",
    });
    state = {
      ...state,
      scenarios: [
        {
          id: "package-wall-insulation",
          packageId: "package-wall-insulation",
          label: "Wall Insulation",
          epcClass: "C",
          annualEnergyNeeds: 12000,
          heatingCoolingNeeds: 12000,
          flexibilityIndex: 50,
          comfortIndex: 72,
          measureIds: ["wall-insulation"],
          measures: ["Wall Insulation"],
        },
      ],
      financialResults: {
        "package-wall-insulation": {
          arv: null,
          riskAssessment: null,
          capitalExpenditure: 10_000,
          returnOnInvestment: 0,
          paybackTime: 0,
          netPresentValue: 0,
          afterRenovationValue: 0,
        },
      },
    };

    state = homeAssistantReducer(state, {
      type: "SET_MEASURES",
      measures: ["windows"],
    });

    expect(state.selectedPackageIds).toEqual([]);
    expect(state.packageFinancialInputs).toEqual({});
    expect(state.scenarios).toEqual([]);
    expect(state.financialResults).toEqual({});
  });

  test("updating selected package costs invalidates prior evaluation results", () => {
    let state = homeAssistantReducer(initialState, {
      type: "SET_SUGGESTED_PACKAGES",
      packages: packages.slice(0, 1),
    });

    state = {
      ...state,
      financialResults: {
        "package-wall-insulation": {
          arv: null,
          riskAssessment: null,
          capitalExpenditure: 10_000,
          returnOnInvestment: 0,
          paybackTime: 0,
          netPresentValue: 0,
          afterRenovationValue: 0,
        },
      },
      mcdaRanking: [
        { scenarioId: "package-wall-insulation", rank: 1, score: 1 },
      ],
    };

    state = homeAssistantReducer(state, {
      type: "SET_PACKAGE_FINANCIAL_INPUT",
      packageId: "package-wall-insulation",
      field: "annualMaintenanceCost",
      value: 450,
    });

    expect(state.financialResults).toEqual({});
    expect(state.mcdaRanking).toBeNull();
  });

  test("updating upfront incentive invalidates prior financial results", () => {
    const state = homeAssistantReducer(
      {
        ...initialState,
        financialResults: {
          "package-wall-insulation": {
            arv: null,
            riskAssessment: null,
            capitalExpenditure: 10_000,
            returnOnInvestment: 0,
            paybackTime: 0,
            netPresentValue: 0,
            afterRenovationValue: 0,
          },
        },
        mcdaRanking: [
          { scenarioId: "package-wall-insulation", rank: 1, score: 1 },
        ],
      },
      {
        type: "UPDATE_INCENTIVE",
        field: "upfrontPercentage",
        value: 15,
      },
    );

    expect(state.funding.incentives.upfrontPercentage).toBe(15);
    expect(state.financialResults).toEqual({});
    expect(state.mcdaRanking).toBeNull();
  });

  test("updating gas tariff invalidates prior financial results", () => {
    const state = homeAssistantReducer(
      {
        ...initialState,
        financialResults: {
          "package-wall-insulation": {
            arv: null,
            riskAssessment: null,
            capitalExpenditure: 10_000,
            returnOnInvestment: 0,
            paybackTime: 0,
            netPresentValue: 0,
            afterRenovationValue: 0,
          },
        },
        mcdaRanking: [
          { scenarioId: "package-wall-insulation", rank: 1, score: 1 },
        ],
      },
      {
        type: "SET_GAS_TARIFF",
        gasTariffEurPerKwh: 0.12,
      },
    );

    expect(state.gasTariffEurPerKwh).toBe(0.12);
    expect(state.financialResults).toEqual({});
    expect(state.mcdaRanking).toBeNull();
  });
});

const mockEstimation: EstimationResult = {
  estimatedEPC: "C",
  annualEnergyNeeds: 10_000,
  heatingCoolingNeeds: 10_000,
  heatingDemand: 8000,
  coolingDemand: 500,
  flexibilityIndex: 50,
  comfortIndex: 60,
  annualEnergyConsumption: 11_000,
  archetypeFloorArea: 120,
};

describe("homeAssistantReducer CLEAR_ACCEPTED_ARCHETYPE", () => {
  test("clears selected archetype, modifications, overrides, and apartment context", () => {
    const state: HomeAssistantState = {
      ...initialState,
      building: {
        ...initialState.building,
        lat: 48.8566,
        lng: 2.3522,
        country: "France",
        buildingType: "Single Family House",
        constructionPeriod: "1971-1990",
        tentativeArchetype: {
          name: "ref-a",
          category: "Single Family House",
          country: "France",
        },
        selectedArchetype: {
          name: "ref-a",
          category: "Single Family House",
          country: "France",
        },
        isModified: true,
        modifications: { floorArea: 130 },
        floorArea: 130,
        numberOfFloors: 3,
        apartmentLocation: "middle",
        floorNumber: 1,
      },
      estimation: mockEstimation,
    };

    const next = homeAssistantReducer(state, {
      type: "CLEAR_ACCEPTED_ARCHETYPE",
    });

    expect(next.building.selectedArchetype).toBeUndefined();
    expect(next.building.isModified).toBe(false);
    expect(next.building.modifications).toBeUndefined();
    expect(next.building.floorArea).toBeNull();
    expect(next.building.numberOfFloors).toBeNull();
    expect(next.building.apartmentLocation).toBeUndefined();
    expect(next.building.floorNumber).toBeNull();
  });

  test("preserves coordinates, search fields, tentative archetype, and estimation", () => {
    const state: HomeAssistantState = {
      ...initialState,
      building: {
        ...initialState.building,
        lat: 48.8566,
        lng: 2.3522,
        country: "France",
        buildingType: "Single Family House",
        constructionPeriod: "1971-1990",
        tentativeArchetype: {
          name: "ref-a",
          category: "Single Family House",
          country: "France",
        },
        selectedArchetype: {
          name: "ref-a",
          category: "Single Family House",
          country: "France",
        },
        isModified: false,
        floorArea: 100,
        numberOfFloors: 2,
      },
      estimation: mockEstimation,
    };

    const next = homeAssistantReducer(state, {
      type: "CLEAR_ACCEPTED_ARCHETYPE",
    });

    expect(next.building.lat).toBe(48.8566);
    expect(next.building.lng).toBe(2.3522);
    expect(next.building.country).toBe("France");
    expect(next.building.buildingType).toBe("Single Family House");
    expect(next.building.constructionPeriod).toBe("1971-1990");
    expect(next.building.tentativeArchetype).toEqual(
      state.building.tentativeArchetype,
    );
    expect(next.building.floorArea).toBeNull();
    expect(next.building.numberOfFloors).toBeNull();
    expect(next.estimation).toEqual(mockEstimation);
  });
});
