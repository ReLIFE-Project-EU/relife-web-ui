import type { LoadingSource } from "./GlobalLoadingContextDefinition";
import { getLongRunningRequestMessage } from "./longRunningRequestConfig";

export interface FriendlyLoadingMessage {
  id: string;
  text: string;
  startedAt: number;
}

const TOOL_LABELS: Record<string, string> = {
  HomeAssistant: "Home Renovation Assistant",
  PortfolioAdvisor: "Portfolio Renovation Advisor",
  Renovation: "Renovation Assistant",
};

const ACTION_MESSAGES: Record<string, string> = {
  estimate: "building your baseline analysis",
  evaluate: "comparing renovation scenarios",
  rank: "finalizing your recommendations",
};

const SOURCE_MESSAGE_OVERRIDES: Record<string, string> = {
  "HomeAssistant.estimate":
    "Reviewing your home profile to prepare the baseline analysis",
  "HomeAssistant.evaluate":
    "Comparing renovation options and calculating expected outcomes",
  "HomeAssistant.rank":
    "Finalizing your personalized renovation recommendations",
  "PortfolioAdvisor.estimate":
    "Checking your portfolio data before running the analysis",
  "PortfolioAdvisor.evaluate": "Running portfolio-wide scenario calculations",
  "PortfolioAdvisor.rank":
    "Finalizing portfolio recommendations and priorities",
  "Renovation.estimate": "Preparing your renovation baseline analysis",
  "Renovation.evaluate": "Evaluating renovation scenarios and impacts",
  "Renovation.rank": "Finalizing renovation recommendations",
};

function humanizeToken(token: string): string {
  return token
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase();
}

function buildFallbackMessage(sourceId: string): string {
  const [toolToken, actionToken] = sourceId.split(".");
  const toolLabel =
    TOOL_LABELS[toolToken] ||
    (toolToken ? humanizeToken(toolToken) : "analysis tool");
  const actionLabel =
    ACTION_MESSAGES[actionToken] ||
    (actionToken
      ? `processing ${humanizeToken(actionToken)}`
      : "finalizing your request");

  return `${toolLabel}: ${actionLabel}`;
}

function getSourceMessage(sourceId: string): string {
  const httpMessage = parseHttpRequestMessage(sourceId);
  if (httpMessage) {
    return httpMessage;
  }

  return SOURCE_MESSAGE_OVERRIDES[sourceId] || buildFallbackMessage(sourceId);
}

function parseHttpRequestSource(sourceId: string): {
  method: string;
  path: string;
} | null {
  if (!sourceId.startsWith("HttpRequest|")) {
    return null;
  }

  const segments = sourceId.split("|");
  if (segments.length < 4) {
    return null;
  }

  const [, , method, encodedPath] = segments;
  let path = encodedPath;
  try {
    path = decodeURIComponent(encodedPath);
  } catch {
    // Keep encoded path if decoding fails
  }

  return { method, path };
}

function parseHttpRequestMessage(sourceId: string): string | null {
  const parsed = parseHttpRequestSource(sourceId);
  if (!parsed) {
    return null;
  }

  const longRunningMessage = getLongRunningRequestMessage(
    parsed.method,
    parsed.path,
  );
  if (longRunningMessage) {
    return longRunningMessage;
  }

  return `Processing ${parsed.method} request for ${parsed.path}`;
}

export function getFriendlyLoadingMessages(
  sources: ReadonlyMap<string, LoadingSource>,
): FriendlyLoadingMessage[] {
  const sortedSources = Array.from(sources.values()).sort(
    (a, b) => a.startedAt - b.startedAt,
  );

  const httpSources = sortedSources.filter((source) =>
    source.id.startsWith("HttpRequest|"),
  );
  const prioritizedSources =
    httpSources.length > 0 ? httpSources : sortedSources;

  return prioritizedSources.map((source) => ({
    id: source.id,
    text: getSourceMessage(source.id),
    startedAt: source.startedAt,
  }));
}
