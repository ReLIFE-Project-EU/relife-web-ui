import { ServiceType } from "../types/common";
import type {
  ArchetypeInfo,
  BuildingPayload,
  BuildingUploadResponse,
  CreateProjectResponse,
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
