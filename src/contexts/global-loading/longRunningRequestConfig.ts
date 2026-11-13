interface LongRunningRequestDefinition {
  method: string;
  pattern: RegExp;
}

const LONG_RUNNING_REQUESTS: LongRunningRequestDefinition[] = [
  {
    method: "POST",
    // Covers both the baseline estimate and the renovation scenarios.
    pattern: /^\/forecasting\/ecm_application/,
  },
  {
    method: "POST",
    pattern: /^\/financial\/risk-assessment$/,
  },
  {
    method: "POST",
    pattern: /^\/technical\/technical\/ee$/,
  },
  {
    method: "POST",
    pattern: /^\/technical\/technical\/sei$/,
  },
  {
    method: "POST",
    pattern: /^\/technical\/technical\/uc$/,
  },
  {
    method: "POST",
    pattern: /^\/technical\/technical\/fv$/,
  },
  {
    method: "POST",
    pattern: /^\/technical\/financial\/rei$/,
  },
];

function normalizeMethod(method: string): string {
  return method.toUpperCase();
}

export function isLongRunningRequest(method: string, path: string): boolean {
  const normalizedMethod = normalizeMethod(method);
  return LONG_RUNNING_REQUESTS.some(
    (request) =>
      request.method === normalizedMethod && request.pattern.test(path),
  );
}
