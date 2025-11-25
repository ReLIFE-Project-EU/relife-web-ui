// Common types shared across all services
// Based on OpenAPI specs from api-specs/20251125-145112/

// ============================================================================
// Service Types
// ============================================================================

export const ServiceType = {
  FINANCIAL: "financial",
  TECHNICAL: "technical",
  FORECASTING: "forecasting",
} as const;

export type ServiceType = (typeof ServiceType)[keyof typeof ServiceType];

// ============================================================================
// Authentication & User Types
// ============================================================================

export interface UniversalUser {
  id: string;
  email: string | null;
  user_metadata: Record<string, string>;
  identities: UserIdentity[];
}

export interface UserIdentity {
  provider: string;
  id: string;
}

export type AuthenticationMethod = "supabase" | "keycloak";

export interface KeycloakRole {
  id: string;
  name: string;
  description?: string | null;
  composite?: boolean | null;
  clientRole?: boolean | null;
  containerId?: string | null;
}

export interface AuthenticatedUser {
  token: string;
  user: UniversalUser;
  authentication_method: AuthenticationMethod;
  keycloak_roles?: KeycloakRole[] | null;
}

// ============================================================================
// Storage Types
// ============================================================================

export interface StorageFileInfo {
  name: string;
  size: number;
  created_at: string;
  public_url: string;
}

export interface FileUploadResponse {
  message: string;
  path: string;
  public_url: string;
}

// ============================================================================
// Table Types
// ============================================================================

export interface TableDataResponse {
  table_name: string;
  data: Record<string, unknown>[];
  count: number;
}

// ============================================================================
// Error Types
// ============================================================================

export interface ValidationError {
  loc: (string | number)[];
  msg: string;
  type: string;
}

export interface HTTPValidationError {
  detail: ValidationError[];
}

// ============================================================================
// Health Check
// ============================================================================

export type HealthResponse = Record<string, unknown>;

// ============================================================================
// Custom Error Class
// ============================================================================

export class APIError extends Error {
  status: number;
  statusText: string;
  validationErrors?: HTTPValidationError;

  constructor(
    status: number,
    statusText: string,
    validationErrors?: HTTPValidationError,
  ) {
    super(`API error: ${status} ${statusText}`);
    this.name = "APIError";
    this.status = status;
    this.statusText = statusText;
    this.validationErrors = validationErrors;

    // Restore prototype chain for proper instanceof checks
    Object.setPrototypeOf(this, APIError.prototype);

    // Capture stack trace when available (Node.js environments)
    if (
      "captureStackTrace" in Error &&
      typeof (
        Error as {
          captureStackTrace?: (
            error: Error,
            constructor: typeof APIError,
          ) => void;
        }
      ).captureStackTrace === "function"
    ) {
      (
        Error as {
          captureStackTrace: (
            error: Error,
            constructor: typeof APIError,
          ) => void;
        }
      ).captureStackTrace(this, APIError);
    }
  }
}
