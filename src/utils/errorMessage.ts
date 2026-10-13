import { APIError, type ValidationError } from "../types/common";

/** Message of a caught value; API errors add the reason the backend gave. */
export function errorMessage(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const reason = error instanceof APIError ? apiErrorReason(error) : undefined;
  return reason ? `${error.message}: ${reason}` : error.message;
}

/** FastAPI sends `detail` as a string, or as a list of validation errors. */
function apiErrorReason(error: APIError): string | undefined {
  const detail: unknown = error.validationErrors?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((item: ValidationError) => item.msg).join("; ");
  }
  return undefined;
}
