/**
 * Real Financial Service Implementation
 * Calls the Financial API for ARV and the CAPEX/OPEX lookup, and runs the
 * package appraisal (see packageAppraisal.ts) for each renovation package.
 *
 * The output level is parameterized via constructor to support different tools:
 * - HRA (Home Renovation Assistant): uses "private" output level
 * - PRA (Portfolio Renovation Advisor): may use "professional" or higher
 *
 * Align with relife-financial-service (verify in repo).
 */

import { financial } from "../api";
import type {
  ARVResult,
  ArvUnavailableReason,
  BuildingInfo,
  FinancialResults,
  ScenarioId,
} from "../types/renovation";
import {
  deriveConstructionYear,
  fromAPIEnergyClass,
  toAPIPropertyType,
  type APIEnergyClass,
  type OutputLevel,
} from "../utils/apiMappings";
import { APIError } from "../types/common";
import { buildSchemes } from "./riskAssessmentAdapter";
import type { RiskAssessmentRequest as RiskAssessmentWireRequest } from "../types/financial";
import type {
  ARVRequest,
  CalculateFinancialScenariosRequest,
  EstimatePackageCostsRequest,
  EstimatePackageCostsResult,
  IFinancialService,
} from "./types";
import { auditLog, type AuditCtx } from "../utils/auditLogger";
import {
  ENERGY_TARIFF_DEFAULTS,
  FINANCIAL_ELECTRICITY_REFERENCE_EUR_PER_KWH,
} from "./carrierSavingsService";
import { resolveEpcRatingIntensity } from "./energyUtils";
import { normalizeArvFloorFields } from "../utils/buildingFloorNumbers";
import { appraisePackage } from "./packageAppraisal";

/**
 * The CAPEX/OPEX lookup lives inside the risk-assessment endpoint, which still
 * requires a positive `annual_energy_savings`. The estimation pre-pass only
 * reads back the resolved costs from `metadata`, so the simulation inputs below
 * are inert placeholders whose Monte Carlo output is discarded.
 */
const ESTIMATION_PLACEHOLDER_ANNUAL_ENERGY_SAVINGS_KWH = 1;
const ESTIMATION_DEFAULT_PROJECT_LIFETIME_YEARS = 20;
const DEFAULT_COORDINATE = 0;
const HTTP_BAD_REQUEST_STATUS = 400;
const HTTP_UNPROCESSABLE_ENTITY_STATUS = 422;
const ARV_UNKNOWN_TARGET_COUNTRY_PATTERN = /unknown target_country/i;
/**
 * The ARV model reads "renovated in the last 5 years" as a general refurbishment
 * signal. These tools model an energy retrofit only, so the baseline and the
 * renovated valuation both assume no recent refurbishment, leaving the energy
 * class as the only difference between them. Set on every request by
 * buildArvRequestBase so the two cannot diverge.
 */
const ARV_RENOVATED_LAST_5_YEARS = false;

type ArvRequestBase = Pick<
  ARVRequest,
  | "lat"
  | "lng"
  | "floor_area"
  | "construction_year"
  | "floor_number"
  | "number_of_floors"
  | "property_type"
  | "target_country"
  | "renovated_last_5_years"
>;

interface ArvAttemptResult {
  result: ARVResult | null;
  unavailableReason?: ArvUnavailableReason;
}

function resolveConstructionYear(building: BuildingInfo): number {
  return (
    building.constructionYear ??
    deriveConstructionYear(building.constructionPeriod)
  );
}

/**
 * Energy intensity (kWh/m²/year) sent to the ARV model as `energy_consumption_*`.
 *
 * The ARV model resolves a national EPC class from this value, so it uses the
 * EPC rating basis: primary energy, falling back to delivered then thermal
 * demand.
 */
function resolveArvEnergyIntensity(
  source: {
    primaryEnergy?: number;
    deliveredTotal?: number;
    annualEnergyNeeds: number;
  },
  floorArea: number,
): number {
  return resolveEpcRatingIntensity(source, floorArea).intensity;
}

function buildArvRequestBase(
  building: BuildingInfo,
  floorArea: number,
): ArvRequestBase {
  return {
    lat: building.lat ?? DEFAULT_COORDINATE,
    lng: building.lng ?? DEFAULT_COORDINATE,
    floor_area: floorArea,
    construction_year: resolveConstructionYear(building),
    ...normalizeArvFloorFields({
      numberOfFloors: building.numberOfFloors,
      floorNumber: building.floorNumber,
    }),
    property_type: toAPIPropertyType(building.buildingType),
    target_country: building.country,
    renovated_last_5_years: ARV_RENOVATED_LAST_5_YEARS,
  };
}

function stringifyArvError(error: APIError): string {
  return [
    error.statusText,
    error.message,
    error.validationErrors ? JSON.stringify(error.validationErrors) : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function classifyArvUnavailableReason(error: unknown): ArvUnavailableReason {
  if (error instanceof APIError) {
    const errorText = stringifyArvError(error);

    if (
      error.status === HTTP_BAD_REQUEST_STATUS &&
      ARV_UNKNOWN_TARGET_COUNTRY_PATTERN.test(errorText)
    ) {
      return "unsupported-country";
    }

    if (error.status === HTTP_UNPROCESSABLE_ENTITY_STATUS) {
      return "invalid-request";
    }
  }

  return "api-error";
}

export class FinancialService implements IFinancialService {
  private readonly outputLevel: OutputLevel;

  constructor(outputLevel: OutputLevel = "private") {
    this.outputLevel = outputLevel;
  }

  /**
   * Calculate After Renovation Value (ARV) via POST /arv
   */
  async calculateARV(request: ARVRequest): Promise<ARVResult> {
    const response = await financial.calculateARV({
      lat: request.lat,
      lng: request.lng,
      floor_area: request.floor_area,
      construction_year: request.construction_year,
      floor_number: request.floor_number,
      number_of_floors: request.number_of_floors,
      property_type: request.property_type,
      target_country: request.target_country,
      energy_consumption_before: request.energy_consumption_before,
      energy_consumption_after: request.energy_consumption_after,
      renovated_last_5_years:
        request.renovated_last_5_years ?? ARV_RENOVATED_LAST_5_YEARS,
    });

    return {
      pricePerSqm: response.after.price_per_sqm,
      totalPrice: response.after.total_price,
      floorArea: response.floor_area,
      energyClass: fromAPIEnergyClass(
        response.after.greek_epc_class as APIEnergyClass,
      ),
      priceIncreasePct: response.uplift?.price_increase_pct,
      metadata: {
        ...response.metadata,
        before: response.before,
        epcResolution: response.after.epc_resolution,
      },
    };
  }

  /**
   * Best-effort ARV: ARV is a standalone, non-critical metric (not an input to
   * NPV/IRR/ROI/payback). Some countries are not supported by the ARV model
   * (e.g. Poland → 400), so a failure here must not abort the financial run.
   * Returns null and records a warn instead of throwing.
   */
  private async tryCalculateARV(
    request: ARVRequest,
    auditCtx?: AuditCtx,
  ): Promise<ArvAttemptResult> {
    try {
      return { result: await this.calculateARV(request) };
    } catch (error) {
      const unavailableReason = classifyArvUnavailableReason(error);
      auditLog.warn(
        "financial",
        "financial.arv.skipped",
        {
          targetCountry: request.target_country,
          reason: unavailableReason,
          apiStatus: error instanceof APIError ? error.status : undefined,
          message: error instanceof Error ? error.message : String(error),
        },
        auditCtx,
      );
      return { result: null, unavailableReason };
    }
  }

  /**
   * Estimate a package's CAPEX/OPEX from EU reference data via the Financial
   * lookup. Calls /risk-assessment with the cost fields omitted (the server then
   * resolves them from `country` + `renovation_actions`) and reads the resolved
   * values back from `metadata`. The Monte Carlo result is discarded — this is
   * purely a cost estimation pre-pass.
   */
  async estimatePackageCosts(
    request: EstimatePackageCostsRequest,
  ): Promise<EstimatePackageCostsResult> {
    const { schemes } = buildSchemes({ loanAmount: 0, loanTerm: 0 });

    // Built against the wire contract (capex/annual_maintenance_cost omitted so
    // the backend resolves them from country + renovation_actions).
    const wireRequest: RiskAssessmentWireRequest = {
      annual_energy_savings: ESTIMATION_PLACEHOLDER_ANNUAL_ENERGY_SAVINGS_KWH,
      project_lifetime:
        request.projectLifetime ?? ESTIMATION_DEFAULT_PROJECT_LIFETIME_YEARS,
      output_level: this.outputLevel,
      schemes,
      country: request.country,
      renovation_actions: request.renovationActions,
    };

    // Background pre-pass: suppress the global loading overlay (the renovation
    // step shows a quiet per-card loader instead).
    const wire = await financial.assessRisk(wireRequest, {
      skipGlobalLoading: true,
    });

    const { metadata } = wire;
    // A resolved CAPEX is mandatory; treat a missing/non-positive value as a
    // lookup failure so the caller can surface it rather than silently showing
    // €0. OPEX of 0 is legitimate (insulation/windows carry no annual O&M).
    if (metadata.capex == null || metadata.capex <= 0) {
      throw new Error(
        "Reference-data lookup did not return a cost for this package.",
      );
    }
    return {
      capex: metadata.capex,
      annualMaintenanceCost: metadata.annual_maintenance_cost ?? 0,
      capexFromLookup: metadata.capex_from_lookup ?? false,
      opexFromLookup: metadata.opex_from_lookup ?? false,
    };
  }

  /**
   * Calculate ARV and the package appraisal for every renovation package. The
   * baseline is input only: it has no package appraisal.
   */
  async calculateForAllScenarios(
    request: CalculateFinancialScenariosRequest,
  ): Promise<Record<ScenarioId, FinancialResults>> {
    const {
      scenarios,
      fundingOptions: resolvedFundingOptions,
      floorArea: resolvedFloorArea,
      packageFinancialInputs: resolvedPackageFinancialInputs,
      building: resolvedBuilding,
      financialAssumptions: resolvedFinancialAssumptions,
      auditCtx: parentAuditCtx,
    } = request;
    const results: Record<string, FinancialResults> = {};
    const gasTariffEurPerKwh =
      resolvedFinancialAssumptions?.gasTariffEurPerKwh ??
      ENERGY_TARIFF_DEFAULTS.gasEurPerKwh;

    // The "current" scenario is re-simulated through the ECM engine by
    // RenovationService, so energy savings compare like-for-like against the
    // renovated scenarios (same engine). Use it — not the energy-estimation
    // result — as the baseline for carrier savings and the ARV "before" basis.
    const baselineScenario = scenarios.find(
      (scenario) => scenario.id === "current",
    );
    if (!baselineScenario) {
      throw new Error(
        "Financial calculation requires a baseline 'current' scenario",
      );
    }

    auditLog.info(
      "financial",
      "financial.run.start",
      {
        outputLevel: this.outputLevel,
        scenarioIds: scenarios.map((s) => s.id),
        floorArea: resolvedFloorArea,
        projectLifetime: resolvedBuilding.projectLifetime,
        financingType: resolvedFundingOptions.financingType,
        gasTariffEurPerKwh,
        electricityReferencePriceEurPerKwh:
          FINANCIAL_ELECTRICITY_REFERENCE_EUR_PER_KWH,
      },
      parentAuditCtx,
    );

    const baselineEnergyIntensity = resolveArvEnergyIntensity(
      {
        primaryEnergy: baselineScenario.primaryEnergy,
        deliveredTotal: baselineScenario.deliveredTotal,
        annualEnergyNeeds: baselineScenario.annualEnergyNeeds,
      },
      resolvedFloorArea,
    );

    for (const scenario of scenarios) {
      if (scenario === baselineScenario) continue;
      const auditCtx = parentAuditCtx?.child({ scenarioId: scenario.id });
      auditLog.info(
        "financial",
        "financial.scenario.start",
        {
          scenarioId: scenario.id,
          measureIds: scenario.measureIds,
        },
        auditCtx,
      );

      const packageInput = resolvedPackageFinancialInputs[scenario.id];
      if (
        !packageInput ||
        packageInput.capex === null ||
        packageInput.capex <= 0
      ) {
        throw new Error(`Missing CAPEX for scenario ${scenario.id}`);
      }
      if (
        packageInput.annualMaintenanceCost === null ||
        packageInput.annualMaintenanceCost < 0
      ) {
        throw new Error(
          `Missing annual maintenance cost for scenario ${scenario.id}`,
        );
      }

      // ARV Request for renovated scenario
      const arvRequest: ARVRequest = {
        ...buildArvRequestBase(resolvedBuilding, resolvedFloorArea),
        energy_consumption_before: baselineEnergyIntensity,
        energy_consumption_after: resolveArvEnergyIntensity(
          {
            primaryEnergy: scenario.primaryEnergy,
            deliveredTotal: scenario.deliveredTotal,
            annualEnergyNeeds: scenario.annualEnergyNeeds,
          },
          resolvedFloorArea,
        ),
      };
      auditLog.debug(
        "financial",
        "financial.arv.request",
        { request: arvRequest as unknown as Record<string, unknown> },
        auditCtx,
      );

      const [arvAttempt, { effectiveCapex, appraisal }] = await Promise.all([
        this.tryCalculateARV(arvRequest, auditCtx),
        appraisePackage({
          capex: packageInput.capex,
          annualMaintenanceCost: packageInput.annualMaintenanceCost,
          funding: resolvedFundingOptions,
          projectLifetime: resolvedBuilding.projectLifetime,
          baselineCarriers: baselineScenario.carrierBreakdown,
          packageCarriers: scenario.carrierBreakdown,
          gasTariffEurPerKwh,
          outputLevel: this.outputLevel,
          auditCtx,
        }),
      ]);
      const arvResult = arvAttempt.result;

      const scenarioResults: FinancialResults = {
        arv: arvResult,
        ...(arvAttempt.unavailableReason
          ? { arvUnavailableReason: arvAttempt.unavailableReason }
          : {}),
        appraisal,
        capitalExpenditure: Math.round(effectiveCapex),
        annualMaintenanceCost: packageInput.annualMaintenanceCost,
        afterRenovationValue: arvResult?.totalPrice ?? null,
      };
      results[scenario.id] = scenarioResults;

      const appraised = appraisal.kind === "appraised" ? appraisal : undefined;
      auditLog.info(
        "financial",
        "financial.scenario.end",
        {
          scenarioId: scenario.id,
          capitalExpenditure: scenarioResults.capitalExpenditure,
          annualMaintenanceCost: scenarioResults.annualMaintenanceCost,
          monthlyAvgSavings: appraised?.pointForecasts.MonthlyAvgSavings,
          netPresentValue: appraised?.pointForecasts.NPV,
          returnOnInvestment: appraised?.pointForecasts.ROI,
          paybackTime: appraised?.pointForecasts.PBP,
          afterRenovationValue: scenarioResults.afterRenovationValue,
          arvEnergyClass: arvResult?.energyClass,
          riskComputed: appraised !== undefined,
          cashFlowTimeline: appraised?.cashFlowData !== undefined,
          probabilityKeys: appraised?.probabilities
            ? Object.keys(appraised.probabilities)
            : undefined,
        },
        auditCtx,
      );
    }

    auditLog.info(
      "financial",
      "financial.run.end",
      {
        scenarioIds: scenarios.map((s) => s.id),
      },
      parentAuditCtx,
    );

    return results as Record<ScenarioId, FinancialResults>;
  }
}
