import { supabase } from "./auth";
import type {
  AuthenticatedUser,
  FileUploadResponse,
  HealthResponse,
  StorageFileInfo,
  TableDataResponse,
} from "./types/common";
import { APIError, ServiceType } from "./types/common";
import type {
  ARVRequest,
  ARVResponse,
  RiskAssessmentRequest,
  RiskAssessmentResponse,
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

// ============================================================================
// Core Request Functions
// ============================================================================

async function getAuthToken(): Promise<string | null> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch (error) {
    console.error("Failed to get authentication session:", error);
    return null;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = await getAuthToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options?.headers,
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  } else {
    console.warn("No auth token available for request to", path);
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

    console.error(`API Error ${response.status} for ${path}`, validationErrors);
    throw new APIError(response.status, response.statusText, validationErrors);
  }

  return response.json();
}

async function uploadRequest<T>(path: string, formData: FormData): Promise<T> {
  const token = await getAuthToken();
  const headers: HeadersInit = {};

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
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
  const token = await getAuthToken();
  const headers: HeadersInit = {};

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
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

  /**
   * Perform Monte Carlo risk assessment for energy retrofit project.
   * Runs 10,000 scenarios to assess financial risk and returns.
   */
  assessRisk: (data: RiskAssessmentRequest) =>
    request<RiskAssessmentResponse>("/financial/risk-assessment", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  /**
   * Calculate After Renovation Value (ARV) for a property.
   * Predicts property value based on characteristics and energy class.
   */
  calculateARV: (data: ARVRequest) =>
    request<ARVResponse>("/financial/arv", {
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
