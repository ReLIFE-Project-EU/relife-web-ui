import { AuthenticationError } from "../utils";
import { PortfolioApiError, type PortfolioApiErrorCode } from "../types";

function inferErrorCode(defaultCode: PortfolioApiErrorCode, error: unknown) {
  if (error instanceof AuthenticationError) {
    return "auth";
  }

  return defaultCode;
}

export function wrapPortfolioApiError(
  message: string,
  defaultCode: PortfolioApiErrorCode,
  error: unknown,
): PortfolioApiError {
  if (error instanceof PortfolioApiError) {
    return error;
  }

  if (error instanceof AuthenticationError) {
    return new PortfolioApiError(error.message, "auth", { cause: error });
  }

  if (error instanceof Error && error.message) {
    return new PortfolioApiError(
      error.message,
      inferErrorCode(defaultCode, error),
      {
        cause: error,
      },
    );
  }

  return new PortfolioApiError(message, defaultCode, { cause: error });
}
