/**
 * AI-optimized failure context reporter
 *
 * Formats structured context on test failures to help AI agents automatically
 * generate fixes and PRs. Each step is annotated with metadata about what
 * files are relevant for debugging.
 */

interface StepContext {
  tool: "HRA" | "PRA";
  stepIndex: number;
  stepName: string;
  endpoint: string; // "POST /forecasting/simulate"
  request: unknown; // actual payload sent
  response: {
    status: number;
    body: unknown; // actual response body
  };
  expectedResponseShape: string; // "SimulateDirectResponse"
  relevantFiles: {
    typeDefinition?: string; // "src/types/forecasting.ts"
    apiWrapper?: string; // "src/api/forecasting.ts"
    serviceConsumer?: string; // "src/services/EnergyService.ts"
    openApiSpec?: string; // "api-specs/.../forecasting.json"
  };
  validationErrors: string[]; // ["missing field: results.hourly_building", ...]
}

/**
 * Format a step failure for AI consumption
 */
export function formatStepFailure(ctx: StepContext): string {
  const lines: string[] = [];

  lines.push("=".repeat(80));
  lines.push(
    `INTEGRATION TEST FAILURE: ${ctx.tool} Workflow - Step ${ctx.stepIndex}`,
  );
  lines.push("=".repeat(80));
  lines.push("");

  lines.push(`Step Name: ${ctx.stepName}`);
  lines.push(`Endpoint: ${ctx.endpoint}`);
  lines.push(`Expected Response Shape: ${ctx.expectedResponseShape}`);
  lines.push("");

  lines.push("Validation Errors:");
  ctx.validationErrors.forEach((error, i) => {
    lines.push(`  ${i + 1}. ${error}`);
  });
  lines.push("");

  lines.push("Request:");
  lines.push("```json");
  lines.push(JSON.stringify(ctx.request, null, 2));
  lines.push("```");
  lines.push("");

  lines.push("Response:");
  lines.push(`Status: ${ctx.response.status}`);
  lines.push("```json");
  lines.push(JSON.stringify(ctx.response.body, null, 2));
  lines.push("```");
  lines.push("");

  lines.push("=".repeat(80));

  return lines.join("\n");
}

/**
 * Create a context object for a step
 */
export function createStepContext(
  tool: "HRA" | "PRA",
  stepIndex: number,
  stepName: string,
  endpoint: string,
  expectedResponseShape: string,
  relevantFiles: StepContext["relevantFiles"],
): Omit<StepContext, "request" | "response" | "validationErrors"> {
  return {
    tool,
    stepIndex,
    stepName,
    endpoint,
    expectedResponseShape,
    relevantFiles,
  };
}

/**
 * Validate response has expected fields
 * Returns array of validation error messages (empty if valid)
 */
export function validateResponseShape(
  body: unknown,
  requiredFields: string[],
): string[] {
  const errors: string[] = [];

  if (typeof body !== "object" || body === null) {
    errors.push(`Response body is not an object: ${typeof body}`);
    return errors;
  }

  const obj = body as Record<string, unknown>;

  for (const field of requiredFields) {
    // Support nested fields like "results.hourly_building"
    const parts = field.split(".");
    let current: unknown = obj;

    for (const part of parts) {
      if (typeof current !== "object" || current === null) {
        errors.push(`Missing field: ${field} (parent is not an object)`);
        break;
      }

      const currentObj = current as Record<string, unknown>;
      if (!(part in currentObj)) {
        errors.push(`Missing field: ${field}`);
        break;
      }

      current = currentObj[part];
    }
  }

  return errors;
}

/**
 * Validate array has expected structure
 */
export function validateArray(
  value: unknown,
  fieldName: string,
  options: {
    minLength?: number;
    itemValidator?: (item: unknown, index: number) => string | null;
  } = {},
): string[] {
  const errors: string[] = [];

  if (!Array.isArray(value)) {
    errors.push(`${fieldName} is not an array: ${typeof value}`);
    return errors;
  }

  if (options.minLength !== undefined && value.length < options.minLength) {
    errors.push(
      `${fieldName} array too short: ${value.length} < ${options.minLength}`,
    );
  }

  if (options.itemValidator) {
    value.forEach((item, index) => {
      const error = options.itemValidator!(item, index);
      if (error) {
        errors.push(`${fieldName}[${index}]: ${error}`);
      }
    });
  }

  return errors;
}

/**
 * Validate number is within range
 */
export function validateNumber(
  value: unknown,
  fieldName: string,
  options: {
    min?: number;
    max?: number;
  } = {},
): string[] {
  const errors: string[] = [];

  if (typeof value !== "number") {
    errors.push(`${fieldName} is not a number: ${typeof value}`);
    return errors;
  }

  if (options.min !== undefined && value < options.min) {
    errors.push(`${fieldName} below minimum: ${value} < ${options.min}`);
  }

  if (options.max !== undefined && value > options.max) {
    errors.push(`${fieldName} above maximum: ${value} > ${options.max}`);
  }

  return errors;
}

/**
 * Assert HTTP status and log rich failure context if it doesn't match
 */
export function assertHttpStatus(
  response: { status: number; body: unknown },
  expectedStatus: number,
  ctx: Omit<StepContext, "request" | "response" | "validationErrors">,
  requestPayload: unknown,
): void {
  if (response.status !== expectedStatus) {
    const errorDetails: string[] = [
      `HTTP ${response.status} error - expected ${expectedStatus}`,
    ];

    // Add error body details
    if (typeof response.body === "string") {
      errorDetails.push(`Error message: ${response.body}`);
    } else if (response.body && typeof response.body === "object") {
      const bodyStr = JSON.stringify(response.body, null, 2);
      if (bodyStr.length < 500) {
        errorDetails.push(`Error body: ${bodyStr}`);
      } else {
        errorDetails.push(`Error body (truncated): ${bodyStr.substring(0, 500)}...`);
      }
    }

    // Add debugging hints
    if (response.status === 500) {
      errorDetails.push(
        "",
        "Debugging hints for HTTP 500:",
        "  1. Check service logs: docker compose logs <service> --tail=50",
        "  2. Look for Python/Node stack traces in logs",
        "  3. Verify service health: curl http://localhost:8080/api/<service>/health",
      );
    } else if (response.status === 422) {
      errorDetails.push(
        "",
        "HTTP 422 usually means validation error - check request payload format",
      );
    } else if (response.status === 404) {
      errorDetails.push(
        "",
        "HTTP 404 - endpoint not found. Verify URL matches OpenAPI spec.",
      );
    }

    console.error(
      formatStepFailure({
        ...ctx,
        request: requestPayload,
        response: { status: response.status, body: response.body },
        validationErrors: errorDetails,
      }),
    );
  }
}
