import { beforeEach, describe, expect, test, vi } from "vitest";

const { mockAssessRisk } = vi.hoisted(() => ({
  mockAssessRisk: vi.fn(),
}));

vi.mock("../../../../../src/api/financial", () => ({
  financial: {
    assessRisk: mockAssessRisk,
  },
}));

import {
  computeFinancials,
  computeFinancialsBatch,
} from "../../../../../src/features/strategy-explorer/services/rseFinancialService";
import type { ArchetypeDetails } from "../../../../../src/types/archetype";

function makeArchetypeDetails(floorArea: number): ArchetypeDetails {
  return {
    country: "IT",
    category: "Residential",
    name: "Detached 1980",
    floorArea,
    numberOfFloors: 1,
    floorHeight: 3,
    totalWindowArea: 20,
    thermalProperties: {
      wallUValue: 0.8,
      roofUValue: 0.6,
      windowUValue: 2.8,
    },
    setpoints: {
      heatingSetpoint: 20,
      heatingSetback: 16,
      coolingSetpoint: 26,
      coolingSetback: 28,
    },
    location: { lat: 41.9, lng: 12.5 },
    bui: {} as unknown as ArchetypeDetails["bui"],
    system: {} as unknown as ArchetypeDetails["system"],
  };
}

function makeFixtureResponse(
  overrides?: Partial<{
    pointForecasts: Record<string, number>;
    probabilities: Record<string, number>;
    percentiles: Record<string, Record<string, number>>;
  }>,
) {
  return {
    point_forecasts: {
      NPV: 15_000,
      IRR: 0.12,
      ROI: 0.35,
      PBP: 8,
      DPP: 10,
      ...overrides?.pointForecasts,
    },
    metadata: { n_sims: 10_000, project_lifetime: 20 },
    probabilities: {
      "Pr(NPV > 0)": 0.92,
      ...overrides?.probabilities,
    },
    percentiles: {
      NPV: {
        P10: 5_000,
        P20: 8_000,
        P30: 10_000,
        P40: 12_000,
        P50: 15_000,
        P60: 18_000,
        P70: 21_000,
        P80: 25_000,
        P90: 30_000,
      },
      ...overrides?.percentiles,
    },
  };
}

describe("computeFinancials", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAssessRisk.mockResolvedValue(makeFixtureResponse());
  });

  test("POSTs risk assessment with professional output level and default assumptions", async () => {
    await computeFinancials({
      archetype: {
        country: "IT",
        category: "Residential",
        name: "Detached 1980",
      },
      packageId: "envelope",
      details: makeArchetypeDetails(100),
      annualEnergySavingsKwh: 5_000,
    });

    expect(mockAssessRisk).toHaveBeenCalledTimes(1);
    const [request] = mockAssessRisk.mock.calls[0];

    expect(request.output_level).toBe("professional");
    expect(request.project_lifetime).toBe(20);
    expect(request.loan_amount).toBe(0);
    expect(request.loan_term).toBe(0);
    expect(request.upfront_incentive_percentage).toBe(0);
    expect(request.lifetime_incentive_amount).toBe(0);
    expect(request.lifetime_incentive_years).toBe(0);
    expect(request.indicators).toEqual(["IRR", "NPV", "PBP", "DPP", "ROI"]);
    expect(request.annual_energy_savings).toBe(5_000);
    expect(request.capex).toBeGreaterThan(0);
    expect(request.annual_maintenance_cost).toBeGreaterThanOrEqual(0);
  });

  test("overrides defaults with provided financialAssumptions", async () => {
    await computeFinancials({
      archetype: {
        country: "IT",
        category: "Residential",
        name: "Detached 1980",
      },
      packageId: "envelope",
      details: makeArchetypeDetails(100),
      annualEnergySavingsKwh: 5_000,
      financialAssumptions: {
        projectLifetimeYears: 25,
        financingType: "self-funded",
        loanAmountEur: 10_000,
        upfrontIncentivePercentage: 10,
        lifetimeIncentiveAmountEur: 500,
        lifetimeIncentiveYears: 5,
      },
    });

    const [request] = mockAssessRisk.mock.calls[0];
    expect(request.project_lifetime).toBe(25);
    expect(request.loan_amount).toBe(10_000);
    expect(request.upfront_incentive_percentage).toBe(10);
    expect(request.lifetime_incentive_amount).toBe(500);
    expect(request.lifetime_incentive_years).toBe(5);
  });

  test("normalises response into RSEFinancialResult shape", async () => {
    const result = await computeFinancials({
      archetype: {
        country: "IT",
        category: "Residential",
        name: "Detached 1980",
      },
      packageId: "envelope",
      details: makeArchetypeDetails(100),
      annualEnergySavingsKwh: 5_000,
    });

    expect(result.archetype).toEqual({
      country: "IT",
      category: "Residential",
      name: "Detached 1980",
    });
    expect(result.packageId).toBe("envelope");
    expect(result.capexEur).toBe(22_000);
    expect(result.annualMaintenanceEur).toBe(0);
    expect(result.annualEnergySavingsKwh).toBe(5_000);

    expect(result.pointForecasts).toEqual({
      NPV: 15_000,
      IRR: 0.12,
      ROI: 0.35,
      PBP: 8,
      DPP: 10,
    });

    expect(result.probabilities).toBeDefined();
    expect(result.probabilities?.["Pr(NPV > 0)"]).toBe(0.92);

    expect(result.percentiles).toBeDefined();
    expect(result.percentiles?.NPV?.P10).toBe(5_000);
    expect(result.percentiles?.NPV?.P90).toBe(30_000);
  });

  test("handles response missing percentiles and probabilities", async () => {
    mockAssessRisk.mockResolvedValue({
      point_forecasts: { NPV: 10_000, IRR: 0.1, ROI: 0.3, PBP: 9, DPP: 11 },
      metadata: { n_sims: 10_000 },
    });

    const result = await computeFinancials({
      archetype: {
        country: "IT",
        category: "Residential",
        name: "Detached 1980",
      },
      packageId: "envelope",
      details: makeArchetypeDetails(100),
      annualEnergySavingsKwh: 5_000,
    });

    expect(result.pointForecasts.NPV).toBe(10_000);
    expect(result.percentiles).toBeUndefined();
    expect(result.probabilities).toBeUndefined();
  });
});

describe("computeFinancialsBatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAssessRisk.mockResolvedValue(makeFixtureResponse());
  });

  test("calls assessRisk for every input concurrently", async () => {
    const inputs = [
      {
        archetype: { country: "IT", category: "Residential", name: "A" },
        packageId: "envelope" as const,
        details: makeArchetypeDetails(100),
        annualEnergySavingsKwh: 5_000,
      },
      {
        archetype: { country: "IT", category: "Residential", name: "A" },
        packageId: "combined" as const,
        details: makeArchetypeDetails(100),
        annualEnergySavingsKwh: 8_000,
      },
    ];

    const results = await computeFinancialsBatch(inputs);

    expect(mockAssessRisk).toHaveBeenCalledTimes(2);
    expect(results).toHaveLength(2);
    expect(results[0].packageId).toBe("envelope");
    expect(results[1].packageId).toBe("combined");
  });
});
