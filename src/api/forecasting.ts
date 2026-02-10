import { ServiceType } from "../types/common";
import type {
  ArchetypeInfo,
  BuildingPayload,
  BuildingUploadResponse,
  CreateProjectResponse,
  ECMApplicationParams,
  ECMApplicationResponse,
  EPCResponse,
  PlantPayload,
  PlantTemplateResponse,
  PlantUploadResponse,
  SimulateDirectParams,
  SimulateDirectResponse,
  SimulateResponse,
} from "../types/forecasting";
import {
  createServiceApi,
  downloadRequest,
  request,
  uploadRequest,
} from "./client";

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
    request<{ valid: boolean; issues?: string[] }>(
      "/forecasting/validate?archetype=false",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    ),

  /**
   * Simulate with custom building configuration
   * POST /forecasting/simulate?archetype=false&weather_source=pvgis
   *
   * Use this when user has modified archetype parameters
   */
  simulateCustomBuilding: (
    payload: { bui: unknown; system: unknown },
    weatherSource: "pvgis" | "epw" = "pvgis",
  ) => {
    const searchParams = new URLSearchParams({
      archetype: "false",
      weather_source: weatherSource,
    });

    const formData = new FormData();
    formData.append("bui_json", JSON.stringify(payload.bui));
    formData.append("system_json", JSON.stringify(payload.system));

    return uploadRequest<SimulateDirectResponse>(
      `/forecasting/simulate?${searchParams.toString()}`,
      formData,
    );
  },

  /**
   * Run simulation directly with archetype and PVGIS weather data
   * POST /forecasting/simulate?archetype=true&weather_source=pvgis&...
   *
   * This is the simpler API path that doesn't require project creation
   * or EPW file uploads.
   */
  simulateDirect: (params: SimulateDirectParams) => {
    const searchParams = new URLSearchParams({
      archetype: "true",
      category: params.category,
      country: params.country,
      name: params.name,
      weather_source: params.weatherSource || "pvgis",
    });

    // Use uploadRequest since the endpoint expects multipart/form-data
    // Even though we're not uploading files, we need to send an empty FormData
    const formData = new FormData();
    return uploadRequest<SimulateDirectResponse>(
      `/forecasting/simulate?${searchParams.toString()}`,
      formData,
    );
  },

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
    const searchParams = new URLSearchParams({
      archetype: "true",
      category: params.category,
      country: params.country,
      name: params.name,
      weather_source: params.weatherSource || "pvgis",
      scenario_elements: params.scenario_elements,
    });

    if (params.u_wall !== undefined) {
      searchParams.set("u_wall", String(params.u_wall));
    }
    if (params.u_roof !== undefined) {
      searchParams.set("u_roof", String(params.u_roof));
    }
    if (params.u_window !== undefined) {
      searchParams.set("u_window", String(params.u_window));
    }
    if (params.include_baseline !== undefined) {
      searchParams.set("include_baseline", String(params.include_baseline));
    }

    // Use uploadRequest since the endpoint expects multipart/form-data
    return uploadRequest<ECMApplicationResponse>(
      `/forecasting/ecm_application?${searchParams.toString()}`,
      new FormData(),
    );
  },

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
};
