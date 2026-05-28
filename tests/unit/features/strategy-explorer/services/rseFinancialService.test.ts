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

/** New multi-scheme wire response with a single equity scheme. */
function makeFixtureResponse() {
  return {
    results: {
      equity: {
        scheme_id: 1,
        scheme_family: "self_financed",
        summary: {
          percentiles: {
            NPV: {
              P5: 2_000,
              P10: 5_000,
              P50: 15_000,
              P90: 30_000,
              P95: 35_000,
            },
            IRR: { P10: 0.05, P50: 0.12, P90: 0.2 },
            ROI: { P10: 0.2, P50: 0.35, P90: 0.5 },
            PBP: { P10: 6, P50: 8, P90: 12 },
            DPP: { P10: 7, P50: 10, P90: 14 },
          },
          probabilities: { "Pr(NPV > 0)": 0.92 },
          disc_target_used: 0.05,
          n_sims: 10_000,
        },
        cashflow_distributions: {
          years: [0, 1, 2],
          cash_flows: { P50: [-1_000, 600, 600] },
          inflows: { P50: [0, 700, 700] },
          outflows: { P50: [0, 100, 100] },
        },
        kpi_histograms: {},
      },
    },
    metadata: { capex: 22_000, project_lifetime: 20, n_schemes: 1 },
  };
}

describe("computeFinancials", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAssessRisk.mockResolvedValue(makeFixtureResponse());
  });

  test("POSTs an equity-scheme risk assessment at professional output level", async () => {
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
    expect(request.schemes).toEqual([{ scheme_type: "equity" }]);
    expect(request.indicators).toEqual(["IRR", "NPV", "PBP", "DPP", "ROI"]);
    expect(request.annual_energy_savings).toBe(5_000);
    expect(request.capex).toBeGreaterThan(0);
    expect(request.annual_maintenance_cost).toBeGreaterThanOrEqual(0);
  });

  test("stays equity-only and folds the upfront incentive into CAPEX", async () => {
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
        upfrontIncentivePercentage: 10,
      },
    });

    const [request] = mockAssessRisk.mock.calls[0];
    expect(request.project_lifetime).toBe(25);
    expect(request.schemes).toEqual([{ scheme_type: "equity" }]);
    // 22000 gross * (1 - 0.10) = 19800 effective CAPEX.
    expect(request.capex).toBe(19_800);
  });

  test("returns an unavailable result for non-positive energy savings without calling the API", async () => {
    const result = await computeFinancials({
      archetype: {
        country: "IT",
        category: "Residential",
        name: "Detached 1980",
      },
      packageId: "envelope",
      details: makeArchetypeDetails(100),
      annualEnergySavingsKwh: 0,
    });

    expect(mockAssessRisk).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        status: "unavailable",
        unavailableReason: "non-positive-energy-savings",
        annualEnergySavingsKwh: 0,
        pointForecasts: {},
      }),
    );
    expect(result.unavailableMessage).toContain(
      "does not produce positive annual energy savings",
    );
  });

  test("normalises the scheme result into RSEFinancialResult shape", async () => {
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
    expect(result.status).toBe("available");

    // Point forecasts are the P50 of each KPI.
    expect(result.pointForecasts).toEqual({
      NPV: 15_000,
      IRR: 0.12,
      ROI: 0.35,
      PBP: 8,
      DPP: 10,
    });

    expect(result.probabilities?.["Pr(NPV > 0)"]).toBe(0.92);
    expect(result.percentiles?.NPV?.P10).toBe(5_000);
    expect(result.percentiles?.NPV?.P90).toBe(30_000);
  });

  test("defaults missing indicators to zero and omits their percentiles", async () => {
    mockAssessRisk.mockResolvedValue({
      results: {
        equity: {
          scheme_id: 1,
          scheme_family: "self_financed",
          summary: {
            percentiles: { NPV: { P10: 5_000, P50: 10_000, P90: 15_000 } },
            probabilities: {},
            disc_target_used: 0.05,
            n_sims: 10_000,
          },
          cashflow_distributions: {
            years: [0, 1],
            cash_flows: { P50: [-1_000, 500] },
            inflows: { P50: [0, 500] },
            outflows: { P50: [0, 0] },
          },
        },
      },
      metadata: { capex: 22_000, project_lifetime: 20 },
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
    expect(result.pointForecasts.IRR).toBe(0);
    expect(result.percentiles?.NPV?.P50).toBe(10_000);
    expect(result.percentiles?.IRR).toBeUndefined();
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
    expect(results[0].status).toBe("available");
    expect(results[1].status).toBe("available");
    expect(results[0].packageId).toBe("envelope");
    expect(results[1].packageId).toBe("combined");
  });
});
