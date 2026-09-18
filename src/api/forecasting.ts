import { ServiceType } from "../types/common";
import type {
  ArchetypeInfo,
  BuildingPayload,
  BuildingUploadResponse,
  CO2ComparisonResult,
  CO2EmissionResult,
  CO2MultiScenarioInput,
  CO2ScenarioInput,
  CreateProjectResponse,
  ECMApplicationParams,
  ECMArchetypeParams,
  ECMCustomBuildingParams,
  ECMApplicationResponse,
  EmissionFactorResponse,
  EPCResponse,
  HeatColdDalyRequest,
  HeatColdDalyResponse,
  PlantPayload,
  PlantTemplateResponse,
  PlantUploadResponse,
  SimulateResponse,
  ValidateCustomBuildingResponse,
} from "../types/forecasting";
import {
  createServiceApi,
  downloadRequest,
  request,
  uploadRequest,
} from "./client";
import { resolveEmissionFactorCountry } from "../utils/emissionFactorCountry";

type SearchParamValue = string | number | boolean | undefined;

function buildSearchParams(
  values: Record<string, SearchParamValue>,
): URLSearchParams {
  const searchParams = new URLSearchParams();

  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.set(key, String(value));
    }
  });

  return searchParams;
}

export const forecasting = {
  ...createServiceApi(ServiceType.FORECASTING),

  // ============================================================================
  // Direct Simulation API (archetype mode with PVGIS)
  // ============================================================================

  /**
   * List available archetypes (metadata only)
   * GET /forecasting/building/available
   */
  listArchetypes: () =>
    request<ArchetypeInfo[]>("/forecasting/building/available"),

  /**
   * Get full archetype details (BUI + System)
   * POST /forecasting/building?archetype=true&category=X&country=Y&name=Z
   *
   * Returns complete archetype payload for modification or direct use
   */
  getArchetypeDetails: (params: {
    category: string;
    country: string;
    name: string;
  }) => {
    const searchParams = new URLSearchParams({
      archetype: "true",
      category: params.category,
      country: params.country,
      name: params.name,
    });

    return request<{ bui: unknown; system: unknown }>(
      `/forecasting/building?${searchParams.toString()}`,
      {
        method: "POST",
      },
    );
  },

  /**
   * Validate custom building configuration
   * POST /forecasting/validate?archetype=false
   *
   * Use this to validate modified buildings before simulation
   */
  validateCustomBuilding: (payload: { bui: unknown; system: unknown }) =>
    request<ValidateCustomBuildingResponse>(
      "/forecasting/validate?archetype=false",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    ),

  // ============================================================================
  // ECM Application (POST /ecm_application)
  // ============================================================================

  /**
   * Simulate envelope renovation measures using ECM application endpoint.
   *
   * @param params - ECM simulation parameters
   * @returns ECM application response with scenario results
   *
   * @example
   * // Simulate wall and window renovation
   * const response = await forecasting.simulateECM({
   *   category: 'Single Family House',
   *   country: 'Greece',
   *   name: 'SFH_Greece_1946_1969',
   *   scenario_elements: 'wall,window',
   *   u_wall: 0.25,
   *   u_window: 1.4,
   *   // include_baseline omitted for single-scenario mode
   * });
   */
  simulateECM: async (
    params: ECMApplicationParams,
  ): Promise<ECMApplicationResponse> => {
    const isCustom = "bui" in params;

    const archetypeParams = isCustom
      ? {}
      : {
          category: (params as ECMArchetypeParams).category,
          country: (params as ECMArchetypeParams).country,
          name: (params as ECMArchetypeParams).name,
        };

    const heatPumpParams = params.use_heat_pump
      ? { heat_pump_cop: params.heat_pump_cop }
      : {};

    const pvParams = params.use_pv
      ? {
          use_pv: true,
          pv_kwp: params.pv_kwp,
          pv_tilt_deg: params.pv_tilt_deg,
          pv_azimuth_deg: params.pv_azimuth_deg,
          pv_use_pvgis: params.pv_use_pvgis,
          pv_pvgis_loss_percent: params.pv_pvgis_loss_percent,
          pv_pvgis_year: params.pv_pvgis_year,
          annual_pv_yield_kwh_per_kwp: params.annual_pv_yield_kwh_per_kwp,
        }
      : {};

    const searchParams = buildSearchParams({
      archetype: !isCustom,
      weather_source: params.weatherSource || "pvgis",
      ...archetypeParams,
      scenario_elements: params.scenario_elements || undefined,
      u_wall: params.u_wall,
      u_roof: params.u_roof,
      u_window: params.u_window,
      u_slab: params.u_slab,
      use_heat_pump: params.use_heat_pump,
      ...heatPumpParams,
      uni_generation_mode: params.uni_generation_mode,
      uni_eta_generation: params.uni_eta_generation,
      ...pvParams,
      include_baseline: params.include_baseline,
      baseline_only: params.baseline_only,
    });

    const formData = new FormData();
    if (isCustom) {
      const cp = params as ECMCustomBuildingParams;
      formData.append("bui_json", JSON.stringify(cp.bui));
      if (cp.system) {
        formData.append("system_json", JSON.stringify(cp.system));
      }
    }

    return uploadRequest<ECMApplicationResponse>(
      `/forecasting/ecm_application?${searchParams.toString()}`,
      formData,
    );
  },

  calculateHeatColdDaly: (data: HeatColdDalyRequest) =>
    request<HeatColdDalyResponse>("/forecasting/linear-tool/heat-cold-daly", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // ============================================================================
  // Project-based Workflow (Legacy)
  // ============================================================================

  createProject: () =>
    request<CreateProjectResponse>("/forecasting/project", {
      method: "POST",
    }),

  uploadBuilding: (projectId: string, data: BuildingPayload) =>
    request<BuildingUploadResponse>(
      `/forecasting/project/${projectId}/building`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      },
    ),

  getPlantTemplate: () =>
    request<PlantTemplateResponse>("/forecasting/plant/template"),

  uploadPlant: (projectId: string, data: PlantPayload) =>
    request<PlantUploadResponse>(`/forecasting/project/${projectId}/plant`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  simulateProject: (projectId: string, epwFile: File) => {
    const formData = new FormData();
    formData.append("epw", epwFile);
    return uploadRequest<SimulateResponse>(
      `/forecasting/project/${projectId}/simulate`,
      formData,
    );
  },

  downloadResultsCSV: (projectId: string): Promise<Blob> =>
    downloadRequest(`/forecasting/project/${projectId}/results.csv`),

  getEPC: (projectId: string) =>
    request<EPCResponse>(`/forecasting/project/${projectId}/epc`),

  // ============================================================================
  // CO2 Emissions (GET /emission-factors, POST /calculate, POST /compare)
  // ============================================================================

  /**
   * Return emission factors (kgCO2eq/kWh) for a given country code.
   * Unsupported countries are resolved to the default before the HTTP call.
   * GET /forecasting/emission-factors
   */
  getEmissionFactors: (country: string) => {
    const resolvedCountry = resolveEmissionFactorCountry(country);
    const searchParams = new URLSearchParams({ country: resolvedCountry });

    return request<EmissionFactorResponse>(
      `/forecasting/emission-factors?${searchParams.toString()}`,
    );
  },

  /**
   * Compute CO2e emissions for a single scenario.
   * Unsupported countries are resolved to the default before the HTTP call.
   * POST /forecasting/calculate
   */
  calculateEmissions: (req: CO2ScenarioInput) => {
    const body = {
      ...req,
      country: resolveEmissionFactorCountry(req.country),
    };

    return request<CO2EmissionResult>("/forecasting/calculate", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  /**
   * Compare scenarios by emissions.  The first scenario is treated as the
   * baseline.  Unsupported countries are resolved to the default for every
   * scenario before the HTTP call.
   * POST /forecasting/compare
   */
  compareEmissions: (req: CO2MultiScenarioInput) => {
    const body = {
      scenarios: req.scenarios.map((scenario) => ({
        ...scenario,
        country: resolveEmissionFactorCountry(scenario.country),
      })),
    };

    return request<CO2ComparisonResult>("/forecasting/compare", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
};
