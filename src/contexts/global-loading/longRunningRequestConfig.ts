interface LongRunningRequestDefinition {
  method: string;
  pattern: RegExp;
  message: string;
}

const LONG_RUNNING_REQUESTS: LongRunningRequestDefinition[] = [
  {
    method: "POST",
    pattern: /^\/forecasting\/simulate/,
    message: "Running building energy simulation",
  },
  {
    method: "POST",
    pattern: /^\/forecasting\/ecm_application/,
    message: "Running renovation scenario simulation",
  },
  {
    method: "POST",
    pattern: /^\/financial\/risk-assessment$/,
    message: "Running financial risk assessment",
  },
  {
    method: "POST",
    pattern: /^\/technical\/technical\/ee$/,
    message: "Calculating baseline energy performance",
  },
  {
    method: "POST",
    pattern: /^\/technical\/technical\/sei$/,
    message: "Calculating savings and efficiency impact",
  },
  {
    method: "POST",
    pattern: /^\/technical\/technical\/uc$/,
    message: "Calculating energy use and consumption profile",
  },
  {
    method: "POST",
    pattern: /^\/technical\/technical\/fv$/,
    message: "Calculating financial value indicators",
  },
  {
    method: "POST",
    pattern: /^\/technical\/financial\/rei$/,
    message: "Calculating renovation impact indicators",
  },
];

function normalizeMethod(method: string): string {
  return method.toUpperCase();
}

export function getLongRunningRequestMessage(
  method: string,
  path: string,
): string | null {
  const normalizedMethod = normalizeMethod(method);
  const matchedRequest = LONG_RUNNING_REQUESTS.find(
    (request) =>
      request.method === normalizedMethod && request.pattern.test(path),
  );

  return matchedRequest?.message || null;
}

export function isLongRunningRequest(method: string, path: string): boolean {
  return getLongRunningRequestMessage(method, path) !== null;
}
