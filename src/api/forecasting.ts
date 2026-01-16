import { ServiceType } from "../types/common";
import type {
  BuildingPayload,
  BuildingUploadResponse,
  CreateProjectResponse,
  EPCResponse,
  PlantPayload,
  PlantTemplateResponse,
  PlantUploadResponse,
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
