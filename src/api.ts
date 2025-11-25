import type {
  AuthenticatedUser,
  FileUploadResponse,
  HealthResponse,
  StorageFileInfo,
  TableDataResponse,
} from "./types/common";
import { APIError, ServiceType } from "./types/common";
import type {
  IIRequest,
  IIResponse,
  IRRRequest,
  IRRResponse,
  NPVRequest,
  NPVResponse,
  OPEXRequest,
  OPEXResponse,
  ROIRequest,
  ROIResponse,
} from "./types/financial";
import type {
  BuildingPayload,
  BuildingUploadResponse,
  CreateProjectResponse,
  EPCResponse,
  PlantPayload,
  PlantTemplateResponse,
  PlantUploadResponse,
  SimulateResponse,
} from "./types/forecasting";
import type {
  EERequest,
  EEResponse,
  FVRequest,
  FVResponse,
  REIRequest,
  REIResponse,
  SEIRequest,
  SEIResponse,
  UCRequest,
  UCResponse,
} from "./types/technical";

const API_BASE = "/api";

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

// ============================================================================
// Core Request Functions
// ============================================================================

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options?.headers,
  };

  if (authToken) {
    (headers as Record<string, string>)["Authorization"] =
      `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let validationErrors;
    try {
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        validationErrors = await response.json();
      }
    } catch {
      // No JSON body or parsing failed
    }

    throw new APIError(response.status, response.statusText, validationErrors);
  }

  return response.json();
}

async function uploadRequest<T>(path: string, formData: FormData): Promise<T> {
  const headers: HeadersInit = {};

  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    body: formData,
    headers,
  });

  if (!response.ok) {
    let validationErrors;
    try {
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        validationErrors = await response.json();
      }
    } catch {
      // No JSON body or parsing failed
    }

    throw new APIError(response.status, response.statusText, validationErrors);
  }

  return response.json();
}

async function downloadRequest(path: string): Promise<Blob> {
  const headers: HeadersInit = {};

  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE}${path}`, { headers });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.blob();
}

// ============================================================================
// Common Endpoints Helper
// ============================================================================

const createServiceApi = (service: ServiceType) => ({
  health: () => request<HealthResponse>(`/${service}/health`),

  whoami: () => request<AuthenticatedUser>(`/${service}/whoami`),

  storage: {
    list: () => request<StorageFileInfo[]>(`/${service}/storage`),

    upload: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return uploadRequest<FileUploadResponse>(`/${service}/storage`, formData);
    },
  },

  readTable: (tableName: string) =>
    request<TableDataResponse>(
      `/${service}/table/${encodeURIComponent(tableName)}`,
    ),

  getUserProfile: () =>
    request<Record<string, unknown>>(`/${service}/user-profile`),
});

// ============================================================================
// Financial Service API
// ============================================================================

export const financial = {
  ...createServiceApi(ServiceType.FINANCIAL),

  calculateNPV: (data: NPVRequest) =>
    request<NPVResponse>("/financial/financial/npv", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  calculateII: (data: IIRequest) =>
    request<IIResponse>("/financial/financial/ii", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  calculateOPEX: (data: OPEXRequest) =>
    request<OPEXResponse>("/financial/financial/opex", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  calculateROI: (data: ROIRequest) =>
    request<ROIResponse>("/financial/financial/roi", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  calculateIRR: (data: IRRRequest) =>
    request<IRRResponse>("/financial/financial/irr", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// ============================================================================
// Technical Service API
// ============================================================================

export const technical = {
  ...createServiceApi(ServiceType.TECHNICAL),

  calculateEE: (data: EERequest) =>
    request<EEResponse>("/technical/technical/ee", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  calculateREI: (data: REIRequest) =>
    request<REIResponse>("/technical/financial/rei", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  calculateSEI: (data: SEIRequest) =>
    request<SEIResponse>("/technical/technical/sei", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  calculateUC: (data: UCRequest) =>
    request<UCResponse>("/technical/technical/uc", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  calculateFV: (data: FVRequest) =>
    request<FVResponse>("/technical/technical/fv", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// ============================================================================
// Forecasting Service API
// ============================================================================

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
