import { beforeEach, describe, expect, test, vi } from "vitest";

const { mockAssessRisk } = vi.hoisted(() => ({
  mockAssessRisk: vi.fn(),
}));

vi.mock("../../../../../src/api/financial", () => ({
  financial: {
    assessRisk: mockAssessRisk,
  },
}));

import { DEFAULT_FUNDING_OPTIONS } from "../../../../../src/constants/funding";
import {
  RSE_ENERGY_TARIFF_DEFAULTS,
  RSE_UNAVAILABLE_REASONS,
} from "../../../../../src/features/strategy-explorer/constants";
import { computeFinancials } from "../../../../../src/features/strategy-explorer/services/rseFinancialService";
import type { SimulatedBuilding } from "../../../../../src/services/simulatedBuilding";
import { APIError } from "../../../../../src/types/common";

/**
 * Envelope geometry consumed by the CAPEX/OPEX lookup: 80 m² wall, 60 m² roof,
 * 50 m² ground floor, 20 m² windows, and 8 kW of configured heating.
 */
const FIXTURE_BUI = {
  building: { net_floor_area: 100, exposed_perimeter: 40 },
  building_parameters: { system_capacities: { heating_capacity: 8_000 } },
  building_surface: [
    {
      name: "wall_south",
      type: "opaque",
      area: 80,
      u_value: 0.8,
      sky_view_factor: 0.5,
      orientation: { azimuth: 0, tilt: 90 },
    },
    {
      name: "roof",
      type: "opaque",
      area: 60,
      u_value: 0.6,
      sky_view_factor: 1,
      orientation: { azimuth: 0, tilt: 0 },
    },
    {
      name: "slab_on_ground",
      type: "opaque",
      area: 50,
      u_value: 0.9,
      sky_view_factor: 0,
      orientation: { azimuth: 0, tilt: 0 },
    },
    {
      name: "window_south",
      type: "transparent",
      area: 20,
      u_value: 2.8,
      sky_view_factor: 0.5,
      orientation: { azimuth: 0, tilt: 90 },
    },
  ],
} as unknown as SimulatedBuilding["bui"];

/** Expected lookup actions for the envelope package with FIXTURE_BUI. */
const ENVELOPE_ACTIONS = [
  { action: "Wall insulation", area_m2: 80 },
  { action: "Roof insulation - Accessible", area_m2: 60 },
  { action: "Floor insulation", area_m2: 50 },
  { action: "Windows", area_m2: 20 },
];

function makeSimulated(
  modeledFloorArea = 100,
  bui: SimulatedBuilding["bui"] = FIXTURE_BUI,
): SimulatedBuilding {
  return {
    archetype: {
      country: "IT",
      category: "Residential",
      name: "Detached 1980",
    },
    bui,
    modeledFloorArea,
  };
}

function makeCarrierInput(overrides?: {
  gasBaseline?: number;
  gasRenovated?: number;
  gridBaseline?: number;
  gridRenovated?: number;
  gasTariffEurPerKwh?: number;
  electricityTariffEurPerKwh?: number;
}) {
  const gasBaseline = overrides?.gasBaseline ?? 12_000;
  const gasRenovated = overrides?.gasRenovated ?? 8_000;
  const gridBaseline = overrides?.gridBaseline ?? 0;
  const gridRenovated = overrides?.gridRenovated ?? 0;

  return {
    archetype: {
      country: "IT",
      category: "Residential",
      name: "Detached 1980",
    },
    packageId: "envelope" as const,
    simulated: makeSimulated(),
    annualPrimaryEnergySavingsKwh: gasBaseline - gasRenovated,
    carrierSourceBreakdown: {
      baseline: {
        naturalGasKwh: gasBaseline,
        gridElectricityKwh: gridBaseline,
      },
      renovated: {
        naturalGasKwh: gasRenovated,
        gridElectricityKwh: gridRenovated,
      },
    },
    financialAssumptions: {
      electricityTariffEurPerKwh: overrides?.electricityTariffEurPerKwh ?? 0.3,
      projectLifetimeYears: 20,
      funding: DEFAULT_FUNDING_OPTIONS,
      gasTariffEurPerKwh:
        overrides?.gasTariffEurPerKwh ??
        RSE_ENERGY_TARIFF_DEFAULTS.gasEurPerKwh,
    },
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

/**
 * Lookup pre-pass wire response: only `metadata` matters (costs resolved from
 * country + renovation_actions); the Monte Carlo payload is discarded.
 */
function makeLookupResponse(capex: number, annualMaintenanceCost: number) {
  return {
    results: {},
    metadata: {
      capex,
      annual_maintenance_cost: annualMaintenanceCost,
      capex_from_lookup: true,
      opex_from_lookup: true,
    },
  };
}

/** True for the cost-lookup pre-pass (costs omitted so the backend resolves them). */
function isLookupRequest(request: { capex?: number }): boolean {
  return request.capex === undefined;
}

describe("computeFinancials", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // The fixture metadata carries a resolved CAPEX, so the same response
    // serves both the lookup pre-pass and the risk-assessment call.
    mockAssessRisk.mockResolvedValue(makeFixtureResponse());
  });

  test("prices an Apartment share and whole-building envelope quantities consistently", async () => {
    // A 100 m² dwelling inside a 400 m² reference building: envelope surfaces
    // heating and PV take a quarter share (PV after the whole-roof 3 kWp
    // minimum, so it matches the share of cached output).
    const blockBui = {
      ...FIXTURE_BUI,
      building: { net_floor_area: 400, exposed_perimeter: 80 },
    } as unknown as SimulatedBuilding["bui"];
    const base = {
      ...makeCarrierInput(),
      packageId: "combined" as const,
    };

    await computeFinancials({
      ...base,
      simulated: makeSimulated(100, blockBui),
    });

    const [dwellingLookup] = mockAssessRisk.mock.calls[0];
    expect(dwellingLookup.renovation_actions).toEqual([
      { action: "Wall insulation", area_m2: 20 },
      { action: "Roof insulation - Accessible", area_m2: 15 },
      { action: "Floor insulation", area_m2: 12.5 },
      { action: "Windows", area_m2: 5 },
      { action: "Air-water Heat Pump", capacity_kw: 2 },
      { action: "PV", capacity_kw: 0.75 },
    ]);

    // Material carbon follows the same geometry. Checked on the envelope
    // package, where the share is exactly proportional: system measures read
    // per-unit carbon off a capacity-interpolated sheet, so their carbon is
    // not linear in the dwelling's area share.
    const envelope = { ...base, packageId: "envelope" as const };
    const dwellingCarbon = await computeFinancials({
      ...envelope,
      simulated: makeSimulated(100, blockBui),
    });
    const wholeCarbon = await computeFinancials({
      ...envelope,
      simulated: makeSimulated(400, blockBui),
    });

    const wholeLookup = mockAssessRisk.mock.calls.at(-2)![0];
    expect(wholeLookup.renovation_actions).toEqual([
      { action: "Wall insulation", area_m2: 80 },
      { action: "Roof insulation - Accessible", area_m2: 60 },
      { action: "Floor insulation", area_m2: 50 },
      { action: "Windows", area_m2: 20 },
    ]);
    expect(wholeCarbon.embodiedCarbonKgCo2e).toBeGreaterThan(0);
    expect(dwellingCarbon.embodiedCarbonKgCo2e).toBeCloseTo(
      wholeCarbon.embodiedCarbonKgCo2e! * 0.25,
      3,
    );
  });

  test("resolves package costs via the reference-data lookup pre-pass", async () => {
    await computeFinancials(makeCarrierInput());

    expect(mockAssessRisk).toHaveBeenCalledTimes(2);
    const [lookupRequest, lookupOptions] = mockAssessRisk.mock.calls[0];

    expect(lookupRequest.capex).toBeUndefined();
    expect(lookupRequest.annual_maintenance_cost).toBeUndefined();
    expect(lookupRequest.country).toBe("Italy");
    expect(lookupRequest.renovation_actions).toEqual(ENVELOPE_ACTIONS);
    expect(lookupRequest.project_lifetime).toBe(20);
    expect(lookupRequest.output_level).toBe("professional");
    expect(lookupOptions).toEqual({ skipGlobalLoading: true });
  });

  test("passes lookup CAPEX and OPEX into the risk request", async () => {
    mockAssessRisk.mockImplementation((request) =>
      Promise.resolve(
        isLookupRequest(request)
          ? makeLookupResponse(30_000, 350)
          : makeFixtureResponse(),
      ),
    );

    const result = await computeFinancials(makeCarrierInput());

    const [riskRequest] = mockAssessRisk.mock.calls[1];
    expect(riskRequest.capex).toBe(30_000);
    expect(riskRequest.annual_maintenance_cost).toBe(350);
    expect(result.capexEur).toBe(30_000);
    expect(result.annualMaintenanceEur).toBe(350);
  });

  test("appraises carrier savings at professional output level and preserves the result", async () => {
    const input = makeCarrierInput({
      gasTariffEurPerKwh: 0.2,
      electricityTariffEurPerKwh: 0.3,
    });
    const result = await computeFinancials(input);
    const [request] = mockAssessRisk.mock.calls[1];

    expect(mockAssessRisk).toHaveBeenCalledTimes(2);
    expect(request).toMatchObject({
      output_level: "professional",
      project_lifetime: 20,
      schemes: [{ scheme_type: "equity" }],
      electricity_tariff_eur_per_kwh: 0.3,
      annual_energy_savings: expect.closeTo(((4000 / 0.9) * 0.2) / 0.3, 5),
    });
    expect(result).toMatchObject({
      archetype: input.archetype,
      packageId: "envelope",
      capexEur: 22_000,
      effectiveCapexEur: 22_000,
      annualMaintenanceEur: 0,
      annualEnergySavingsKwh: request.annual_energy_savings,
      status: "available",
      appraisal: {
        kind: "appraised",
        pointForecasts: { NPV: 15_000, IRR: 0.12, ROI: 0.35, PBP: 8, DPP: 10 },
      },
    });
  });

  test("sends a bank loan drawn on the post-subsidy cost", async () => {
    // The response is keyed by scheme_type, so the loan run must read back a
    // bank_loan entry rather than the default equity fixture.
    const loanResponse = makeFixtureResponse();
    loanResponse.results = {
      bank_loan: loanResponse.results.equity,
    } as unknown as typeof loanResponse.results;
    mockAssessRisk.mockResolvedValue(loanResponse);

    const input = makeCarrierInput();
    const result = await computeFinancials({
      ...input,
      financialAssumptions: {
        projectLifetimeYears: 25,
        funding: {
          financingType: "loan",
          loan: { percentage: 50, duration: 12 },
          incentives: {
            mode: "percentage",
            upfrontPercentage: 10,
            upfrontAmount: 0,
          },
        },
        gasTariffEurPerKwh: 0.115,
        electricityTariffEurPerKwh: 0.3,
      },
    });

    // 22,000 gross − 10% = 19,800 effective; the loan covers 50% of that.
    const [request] = mockAssessRisk.mock.calls[1];
    expect(request.project_lifetime).toBe(25);
    expect(request.capex).toBe(19_800);
    expect(result.capexEur).toBe(22_000);
    expect(request.schemes).toEqual([
      { scheme_type: "bank_loan", loan_amount: 9_900, term_years: 12 },
    ]);
    expect(result.effectiveCapexEur).toBe(19_800);
  });

  test("returns unavailable when a subsidy covers the whole cost", async () => {
    const input = makeCarrierInput();
    const result = await computeFinancials({
      ...input,
      financialAssumptions: {
        projectLifetimeYears: 20,
        funding: {
          ...DEFAULT_FUNDING_OPTIONS,
          incentives: {
            mode: "amount",
            upfrontPercentage: 0,
            upfrontAmount: 50_000,
          },
        },
        gasTariffEurPerKwh: 0.115,
        electricityTariffEurPerKwh: 0.3,
      },
    });

    // The subsidy is clamped to the 22,000 cost, leaving nothing to appraise;
    // the service rejects capex <= 0, so no risk call must be made.
    expect(result.status).toBe("unavailable");
    expect(result.unavailableReason).toBe(
      RSE_UNAVAILABLE_REASONS.fullySubsidized,
    );
    expect(result.capexEur).toBe(22_000);
    expect(result.effectiveCapexEur).toBe(0);
    expect(mockAssessRisk).toHaveBeenCalledTimes(1);
  });

  test("returns unavailable when carrier-aware savings are not positive", async () => {
    const input = makeCarrierInput({
      gasBaseline: 8_000,
      gasRenovated: 12_000,
      gridBaseline: 0,
      gridRenovated: 4_000,
    });

    const result = await computeFinancials(input);

    // Only the lookup pre-pass ran; the risk assessment was skipped.
    expect(mockAssessRisk).toHaveBeenCalledTimes(1);
    expect(isLookupRequest(mockAssessRisk.mock.calls[0][0])).toBe(true);
    expect(result).toEqual(
      expect.objectContaining({
        status: "unavailable",
        unavailableReason: "non-positive-energy-savings",
        capexEur: 22_000,
      }),
    );
    expect(result.appraisal).toBeUndefined();
  });

  test("returns unavailable when the lookup cannot price the package", async () => {
    // Pre-pass resolves without a CAPEX in metadata → lookup failure.
    mockAssessRisk.mockResolvedValue({ results: {}, metadata: {} });

    const result = await computeFinancials(makeCarrierInput());

    expect(mockAssessRisk).toHaveBeenCalledTimes(1);
    expect(result).toEqual(
      expect.objectContaining({
        status: "unavailable",
        unavailableReason: "cost-lookup-failed",
        capexEur: 0,
      }),
    );
    expect(result.appraisal).toBeUndefined();
  });

  test("returns unavailable when the lookup rejects with a validation APIError", async () => {
    mockAssessRisk.mockRejectedValue(new APIError(400, "Bad Request"));

    const result = await computeFinancials(makeCarrierInput());

    expect(result.status).toBe("unavailable");
    expect(result.unavailableReason).toBe("cost-lookup-failed");
  });

  test("rethrows transport errors from the lookup", async () => {
    const transportError = new APIError(500, "Internal Server Error");
    mockAssessRisk.mockRejectedValue(transportError);

    await expect(computeFinancials(makeCarrierInput())).rejects.toBe(
      transportError,
    );
  });

  // A null IRR must survive so RSE reads it as not applicable, like HRA and PRA.
  test("keeps a missing IRR as null", async () => {
    const response = makeFixtureResponse();
    const equity = response.results.equity;
    mockAssessRisk.mockResolvedValue({
      ...response,
      results: {
        equity: {
          ...equity,
          summary: {
            ...equity.summary,
            percentiles: { NPV: equity.summary.percentiles.NPV },
          },
        },
      },
    });

    const result = await computeFinancials(makeCarrierInput());

    expect(result.appraisal?.pointForecasts.IRR).toBeNull();
  });
});
