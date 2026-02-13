/**
 * PRA Tool End-to-End Trace
 *
 * This trace exercises the actual PRA production orchestration entrypoint:
 * **PortfolioAnalysisService.analyzePortfolio()** — the same method that
 * the PRA wizard uses in production.
 *
 * By calling the orchestrator directly, we ensure this trace faithfully
 * replicates the production tool's behavior, including:
 *
 *  - PRABuilding → BuildingInfo conversion (toBuildingInfo)
 *  - CAPEX/maintenance precedence (building → global → null)
 *  - PRAFinancialResults wrapping with probability extraction
 *  - Field mappings (propertyType → buildingType, etc.)
 *
 * A vitest module mock on src/api/client redirects HTTP calls to the
 * integration backend and records all network traffic for diagnostics.
 *
 * Output: A timestamped Markdown report in the repository root.
 */

import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { BuildingService } from "../../src/services/BuildingService";
import { EnergyService } from "../../src/services/EnergyService";
import { RenovationService } from "../../src/services/RenovationService";
import { FinancialService } from "../../src/services/FinancialService";
import { PortfolioAnalysisService } from "../../src/features/portfolio-advisor/services/PortfolioAnalysisService";
import type {
  PRABuilding,
  BuildingAnalysisResult,
} from "../../src/features/portfolio-advisor/context/types";
import type {
  FundingOptions,
  RenovationMeasureId,
} from "../../src/types/renovation";
import { writeFileSync } from "fs";

// ---------------------------------------------------------------------------
// Shared State (module-level)
// ---------------------------------------------------------------------------

// HTTP exchange recorder — shared between mock and tests
const httpHistory: HttpExchange[] = [];

// Get base URL and auth token from environment
const getBaseURL = (): string =>
  process.env.INTEGRATION_API_BASE ?? "http://localhost:8080/api";

const getAuthToken = (): string => process.env.INTEGRATION_AUTH_TOKEN ?? "";

// ---------------------------------------------------------------------------
// Mock API Client to redirect HTTP calls + trace network traffic
// ---------------------------------------------------------------------------

/**
 * This module mock redirects all backend API calls to the integration test
 * backend (configured via INTEGRATION_API_BASE env var) and records all
 * HTTP exchanges for the final diagnostic report.
 */
vi.mock("../../src/api/client", async (importOriginal) => {
  const original =
    (await importOriginal()) as typeof import("../../src/api/client");
  const { APIError } = await import("../../src/types/common");

  // Custom request function with tracing (matches real client signature)
  const request = async <T>(
    path: string,
    options?: RequestInit,
  ): Promise<T> => {
    const base = getBaseURL();
    const token = getAuthToken();

    const url = `${base}${path}`;
    const method = options?.method || "GET";

    // Build headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options?.headers as Record<string, string>),
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // Execute request
    const timestamp = new Date().toISOString();

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const responseBody = await response.text();
    const isJSON = response.headers
      .get("content-type")
      ?.includes("application/json");

    const body =
      isJSON && responseBody ? JSON.parse(responseBody) : responseBody;

    // Record exchange
    httpHistory.push({
      request: {
        method,
        url,
        headers,
        body: options?.body
          ? typeof options.body === "string"
            ? JSON.parse(options.body as string)
            : options.body
          : undefined,
        timestamp,
      },
      response: {
        status: response.status,
        body,
      },
    });

    // Throw APIError for non-2xx
    if (!response.ok) {
      throw new APIError(
        response.status,
        response.statusText,
        body as
          | import("../../src/types/common").HTTPValidationError
          | undefined,
      );
    }

    return body as T;
  };

  // Custom uploadRequest for FormData endpoints
  const uploadRequest = async <T>(
    path: string,
    formData: FormData,
  ): Promise<T> => {
    const base = getBaseURL();
    const token = getAuthToken();

    // For FormData, we typically send query params via URL
    const url = `${base}${path}`;

    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    // Note: Do NOT set Content-Type for FormData; browser sets it automatically with boundary

    const timestamp = new Date().toISOString();

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: formData,
    });

    const responseBody = await response.text();
    const isJSON = response.headers
      .get("content-type")
      ?.includes("application/json");

    const body =
      isJSON && responseBody ? JSON.parse(responseBody) : responseBody;

    // Record exchange (FormData body cannot be logged directly)
    httpHistory.push({
      request: {
        method: "POST",
        url,
        headers,
        body: "[FormData]",
        timestamp,
      },
      response: {
        status: response.status,
        body,
      },
    });

    if (!response.ok) {
      throw new APIError(
        response.status,
        response.statusText || `HTTP ${response.status} from POST ${path}`,
        body as
          | import("../../src/types/common").HTTPValidationError
          | undefined,
      );
    }

    return body as T;
  };

  // Custom downloadRequest (unused in this trace, but required by client)
  const downloadRequest = async (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _path: string,
  ): Promise<Blob> => {
    throw new Error("downloadRequest not implemented in trace mock");
  };

  // Factory function for API service clients (matches real client)
  const createServiceApi = (serviceName: string) => {
    return {
      health: () => request(`/${serviceName}/health`),
      whoami: () => request(`/${serviceName}/whoami`),
      storage: {
        list: () => request(`/${serviceName}/storage`),
        upload: (file: File) => {
          const formData = new FormData();
          formData.append("file", file);
          return uploadRequest(`/${serviceName}/storage`, formData);
        },
      },
      readTable: (tableName: string) =>
        request(`/${serviceName}/table/${encodeURIComponent(tableName)}`),
      getUserProfile: () => request(`/${serviceName}/user-profile`),
    };
  };

  return {
    ...original,
    request,
    uploadRequest,
    downloadRequest,
    createServiceApi,
  };
});

// ---------------------------------------------------------------------------
// Test Fixture
// ---------------------------------------------------------------------------

/**
 * Single representative building using PRABuilding format — matches the
 * actual input structure that the PRA tool uses in production.
 */
const TEST_BUILDING: PRABuilding = {
  id: "test-building-001",
  name: "Test Apartment (Athens)",
  source: "manual",
  category: "Multi family House", // Note: will be mapped by archetype matching
  country: "GR",
  lat: 37.981,
  lng: 23.728,
  floorArea: 85,
  constructionYear: 1985,
  numberOfFloors: 5,
  propertyType: "apartment", // Maps to buildingType via toBuildingInfo()
  floorNumber: 2,
  estimatedCapex: 10_000, // Per-building CAPEX — takes precedence over global
  annualMaintenanceCost: 200, // Per-building maintenance cost
  validationStatus: "valid",
};

/** Wall insulation only — single representative scenario. */
const SELECTED_MEASURES: RenovationMeasureId[] = ["wall-insulation"];

/** Equity (self-funded) financing — simplest case. */
const FUNDING: FundingOptions = {
  financingType: "self-funded",
  loan: { percentage: 0, duration: 0, interestRate: 0 },
};

/** Project lifetime (years). */
const PROJECT_LIFETIME = 20;

// ---------------------------------------------------------------------------
// HTTP Exchange Recording
// ---------------------------------------------------------------------------

interface HttpExchange {
  request: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: unknown;
    timestamp: string;
  };
  response: {
    status: number;
    body: unknown;
  };
}

// ---------------------------------------------------------------------------
// Report State
// ---------------------------------------------------------------------------

const reportSections: string[] = [];

function addSection(markdown: string) {
  reportSections.push(markdown);
}

// ---------------------------------------------------------------------------
// Workflow State (shared across sequential steps)
// ---------------------------------------------------------------------------

let analysisResult: BuildingAnalysisResult;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe.sequential("PRA Trace", () => {
  // Instantiate production services matching PRA production wiring
  const buildingService = new BuildingService();
  const energyService = new EnergyService(buildingService);
  const renovationService = new RenovationService();
  const financialService = new FinancialService("professional");
  const portfolioAnalysisService = new PortfolioAnalysisService(
    energyService,
    renovationService,
    financialService,
  );

  beforeAll(() => {
    // Reset state
    httpHistory.length = 0;
    reportSections.length = 0;
  });

  afterAll(() => {
    const timestamp = new Date().toISOString();
    const filename = `pra-trace-${timestamp.replace(/:/g, "-")}.md`;

    const sequenceDiagram = buildSequenceDiagram(httpHistory);

    const report = [
      buildReportHeader(timestamp),
      ``,
      ...(sequenceDiagram ? [sequenceDiagram, ``] : []),
      ...reportSections,
      ``,
      buildHttpAppendix(httpHistory),
    ].join("\n");

    writeFileSync(filename, report, "utf-8");
    console.log(`\n📄 Report written to: ${filename}`);
  });

  // -------------------------------------------------------------------------
  // Step 1: Health Checks
  //
  // Verifies that all three backend services are reachable and healthy.
  // This is logged to console and the HTTP appendix, but not included in
  // the main report body to reduce noise.
  // -------------------------------------------------------------------------

  test("Step 1: Health checks", async () => {
    const { createServiceApi } = await import("../../src/api/client");

    const services = ["forecasting", "financial", "technical"] as const;

    for (const service of services) {
      const api = createServiceApi(service);
      const health = await api.health();
      console.log(`✓ ${service} health check:`, health);
    }

    // NOTE: Not calling addSection() here — health checks are now omitted
    // from the main report body per user request. They remain in HTTP appendix.
  });

  // -------------------------------------------------------------------------
  // Step 2: Run PRA Analysis Pipeline
  //
  // Calls PortfolioAnalysisService.analyzePortfolio() — the actual production
  // orchestration entrypoint that exercises the full PRA pipeline.
  // -------------------------------------------------------------------------

  test("Step 2: Run PRA analysis pipeline", async () => {
    const results = await portfolioAnalysisService.analyzePortfolio(
      [TEST_BUILDING],
      SELECTED_MEASURES,
      "equity", // FinancingScheme (unused internally, but required by signature)
      FUNDING,
      PROJECT_LIFETIME,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      (_completed, _total, _current) => {
        // Progress callback — no-op for single building
      },
      null, // globalCapex (not used — building.estimatedCapex takes precedence)
      null, // globalMaintenanceCost (not used — building.annualMaintenanceCost takes precedence)
    );

    analysisResult = results[TEST_BUILDING.id];

    // Hard assertions: trace is a diagnostic tool; missing data should fail loudly
    if (!analysisResult) {
      throw new Error(
        `Missing analysis result for building ID: ${TEST_BUILDING.id}`,
      );
    }
    if (analysisResult.status !== "success") {
      throw new Error(
        `Analysis failed for building: ${analysisResult.error ?? "unknown error"}`,
      );
    }
    if (!analysisResult.estimation) {
      throw new Error("Missing estimation in analysis result");
    }
    if (!analysisResult.scenarios) {
      throw new Error("Missing scenarios in analysis result");
    }
    if (!analysisResult.financialResults) {
      throw new Error("Missing financialResults in analysis result");
    }

    const estimation = analysisResult.estimation;
    const scenarios = analysisResult.scenarios;
    const currentScenario = scenarios.find((s) => s.id === "current");
    const renovatedScenario = scenarios.find((s) => s.id === "renovated");

    if (!currentScenario) {
      throw new Error("Missing 'current' scenario");
    }
    if (!renovatedScenario) {
      throw new Error("Missing 'renovated' scenario");
    }
    if (renovatedScenario.annualEnergyNeeds === undefined) {
      throw new Error("Missing 'annualEnergyNeeds' on 'renovated' scenario");
    }

    const savings =
      currentScenario.annualEnergyNeeds - renovatedScenario.annualEnergyNeeds;
    const savingsPct =
      currentScenario.annualEnergyNeeds > 0
        ? (savings / currentScenario.annualEnergyNeeds) * 100
        : 0;

    // Generate report sections
    const scenarioRows = scenarios.map((s) => [
      s.id,
      s.label,
      `**${s.epcClass}**`,
      `${fmtNumber(s.annualEnergyNeeds)} kWh`,
      `${fmtNumber(s.annualEnergyCost)} EUR`,
      s.measures.length > 0 ? s.measures.join(", ") : "_none_",
    ]);

    addSection(
      [
        `## Step 1: PRA Analysis Pipeline (via PortfolioAnalysisService)`,
        ``,
        `Production orchestrator: \`PortfolioAnalysisService.analyzePortfolio()\``,
        ``,
        `> This exercises the actual PRA entrypoint, including:`,
        `> - \`toBuildingInfo()\` conversion (PRABuilding → BuildingInfo)`,
        `> - CAPEX/maintenance precedence (building → global → null)`,
        `> - \`PRAFinancialResults\` wrapping with probability extraction`,
        ``,
        `### Input Building (PRABuilding)`,
        ``,
        mdTable(
          ["Field", "Value"],
          [
            ["ID", TEST_BUILDING.id],
            ["Name", TEST_BUILDING.name],
            ["Country", TEST_BUILDING.country],
            ["Coordinates", `${TEST_BUILDING.lat}, ${TEST_BUILDING.lng}`],
            ["Property type", TEST_BUILDING.propertyType],
            ["Category", TEST_BUILDING.category],
            ["Floor area", `${TEST_BUILDING.floorArea} m²`],
            ["Construction year", String(TEST_BUILDING.constructionYear)],
            ["Number of floors", String(TEST_BUILDING.numberOfFloors)],
            ["Floor number", String(TEST_BUILDING.floorNumber ?? "_n/a_")],
            ["Estimated CAPEX", `${TEST_BUILDING.estimatedCapex} EUR`],
            [
              "Annual maintenance",
              `${TEST_BUILDING.annualMaintenanceCost} EUR/year`,
            ],
          ],
        ),
        ``,
        `### Estimation Result`,
        ``,
        mdTable(
          ["Metric", "Value"],
          [
            ["Estimated EPC class", `**${estimation.estimatedEPC}**`],
            [
              "Annual energy needs",
              `${fmtNumber(estimation.annualEnergyNeeds)} kWh`,
            ],
            [
              "Annual energy cost",
              `${fmtNumber(estimation.annualEnergyCost)} EUR`,
            ],
            [
              "Heating/cooling needs",
              `${fmtNumber(estimation.heatingCoolingNeeds)} kWh`,
            ],
            ["Comfort index", String(estimation.comfortIndex)],
            ["Flexibility index", String(estimation.flexibilityIndex)],
            [
              "Archetype floor area",
              `${fmtNumber(estimation.archetypeFloorArea)} m²`,
            ],
            [
              "Matched archetype",
              estimation.archetype
                ? `${estimation.archetype.country} / ${estimation.archetype.category} / ${estimation.archetype.name}`
                : "_none_",
            ],
          ],
        ),
        ``,
        `### Scenarios`,
        ``,
        `Selected measures: ${SELECTED_MEASURES.map((m) => `\`${m}\``).join(", ")}`,
        ``,
        mdTable(
          [
            "Scenario",
            "Label",
            "EPC Class",
            "Annual Energy",
            "Annual Cost",
            "Measures",
          ],
          scenarioRows,
        ),
        ``,
        `### Energy Savings`,
        ``,
        mdTable(
          ["Metric", "Value"],
          [
            [
              "Baseline energy",
              `${fmtNumber(currentScenario.annualEnergyNeeds)} kWh`,
            ],
            [
              "Renovated energy",
              `${fmtNumber(renovatedScenario.annualEnergyNeeds)} kWh`,
            ],
            ["Savings", `${fmtNumber(savings)} kWh`],
            ["Savings (%)", `${fmtNumber(savingsPct, 1)}%`],
          ],
        ),
      ].join("\n"),
    );

    console.log(
      `EPC: ${estimation.estimatedEPC}, Annual energy: ${estimation.annualEnergyNeeds} kWh`,
    );
    console.log(
      `Renovation: ${currentScenario.epcClass} → ${renovatedScenario.epcClass}, savings: ${savings.toFixed(0)} kWh (${savingsPct.toFixed(1)}%)`,
    );
  });

  // -------------------------------------------------------------------------
  // Step 3: Extract and Report Financial Results
  //
  // Unpacks the PRAFinancialResults from Step 2 for detailed reporting.
  // This demonstrates the financial data structure that PRA produces.
  // -------------------------------------------------------------------------

  test("Step 3: Extract and report financial results", async () => {
    // Extract financial results (already computed in Step 2)
    const praFinancialResults = analysisResult.financialResults!;

    // ARV section (PRAFinancialResults extends FinancialResults, so it has arv)
    const arvRows: (string | number)[][] = [];
    if (praFinancialResults.arv) {
      arvRows.push([
        "Renovated",
        `${fmtNumber(praFinancialResults.arv.pricePerSqm)} EUR/m²`,
        `${fmtNumber(praFinancialResults.arv.totalPrice)} EUR`,
        String(praFinancialResults.arv.energyClass ?? "_n/a_"),
      ]);
    }

    // Risk assessment section
    const risk = praFinancialResults.riskAssessment;
    const pointForecasts = risk?.pointForecasts;

    // Probabilities: prefer PRA-level field (populated by PortfolioAnalysisService)
    const probabilities = praFinancialResults.probabilities;

    const percentiles = risk?.percentiles;

    const pfRows = pointForecasts
      ? Object.entries(pointForecasts).map(([k, v]) => [k, fmtNumber(v, 4)])
      : [];

    const probRows = probabilities
      ? Object.entries(probabilities).map(([k, v]) => [
          k,
          fmtNumber(v, 4),
          `${fmtNumber(v * 100, 1)}%`,
        ])
      : [];

    // Percentiles table
    const percentileIndicators = percentiles
      ? Object.keys(percentiles).filter(
          (k) => percentiles[k as keyof typeof percentiles] !== undefined,
        )
      : [];
    const percentileKeys = [
      "P10",
      "P20",
      "P30",
      "P40",
      "P50",
      "P60",
      "P70",
      "P80",
      "P90",
    ];
    const percRows = percentileKeys.map((pk) => [
      pk,
      ...percentileIndicators.map((ind) => {
        const data = percentiles?.[ind as keyof typeof percentiles];
        const val = data?.[pk as keyof typeof data];
        return fmtNumber(val as number | undefined, 4);
      }),
    ]);

    const financialSection = [
      `## Step 2: Financial Analysis (PRAFinancialResults)`,
      ``,
      `Production class: \`FinancialService.calculateForAllScenarios()\``,
      `Wrapper: \`PortfolioAnalysisService.analyzeBuilding()\` → \`PRAFinancialResults\``,
      ``,
      `- CAPEX: **${TEST_BUILDING.estimatedCapex} EUR** (from building fixture)`,
      `- Annual maintenance: **${TEST_BUILDING.annualMaintenanceCost} EUR/year** (from building fixture)`,
      `- Financing: **${FUNDING.financingType}**`,
      `- Output level: **professional**`,
      ``,
      `### After Renovation Value (ARV)`,
      ``,
      arvRows.length > 0
        ? mdTable(
            ["Scenario", "Price/m²", "Total Price", "Energy Class"],
            arvRows,
          )
        : "_No ARV results_",
      ``,
      `### Risk Assessment — Point Forecasts`,
      ``,
      `> **Note:** Values below are raw API outputs. IRR, ROI, and SuccessRate are decimals (e.g., 0.05 = 5%).`,
      `> For user-friendly units, see the Summary table at the end of this section.`,
      ``,
      pfRows.length > 0
        ? mdTable(["Indicator", "Value"], pfRows)
        : "_No point forecasts (risk assessment may have been skipped due to zero savings)_",
    ];

    if (probRows.length > 0) {
      financialSection.push(
        ``,
        `### Risk Assessment — Probabilities`,
        ``,
        mdTable(["Key", "Value", "Percent"], probRows),
      );
    }

    if (percentileIndicators.length > 0) {
      financialSection.push(
        ``,
        `### Risk Assessment — Percentiles (P10–P90)`,
        ``,
        mdTable(["Percentile", ...percentileIndicators], percRows),
      );
    }

    // Cash flow data
    if (risk?.cashFlowData) {
      financialSection.push(
        ``,
        `### Cash Flow Data`,
        ``,
        truncateJson(risk.cashFlowData, 4096),
      );
    }

    // Metadata
    if (risk?.metadata) {
      financialSection.push(
        ``,
        `### Risk Assessment Metadata`,
        ``,
        truncateJson(risk.metadata, 4096),
      );
    }

    // Summary table
    financialSection.push(
      ``,
      `### Summary`,
      ``,
      `> Human-readable values with units. ROI is converted from decimal to percentage.`,
      `> Integer rounding applied for readability; see HTTP log appendix for full precision.`,
      ``,
      mdTable(
        ["Metric", "Value"],
        [
          [
            "Capital expenditure",
            `${fmtNumber(praFinancialResults.capitalExpenditure)} EUR`,
          ],
          [
            "Net present value",
            `${fmtNumber(praFinancialResults.netPresentValue)} EUR`,
          ],
          [
            "Return on investment",
            `${fmtNumber(praFinancialResults.returnOnInvestment !== undefined ? praFinancialResults.returnOnInvestment * 100 : undefined, 1)}%`,
          ],
          [
            "Payback time",
            `${fmtNumber(praFinancialResults.paybackTime)} years`,
          ],
          [
            "After renovation value",
            `${fmtNumber(praFinancialResults.afterRenovationValue)} EUR`,
          ],
        ],
      ),
    );

    addSection(financialSection.join("\n"));

    console.log(
      `Financial: NPV=${pointForecasts?.NPV?.toFixed(2) ?? "n/a"}, ` +
        `ROI=${pointForecasts?.ROI !== undefined ? (pointForecasts.ROI * 100).toFixed(1) + "%" : "n/a"}, ` +
        `PBP=${pointForecasts?.PBP?.toFixed(1) ?? "n/a"} years`,
    );

    // Verify that we have probabilities if risk assessment was run
    expect(praFinancialResults).toBeDefined();
    if (pointForecasts) {
      // If we have point forecasts, we should also have probabilities (either top-level or metadata)
      expect(probRows.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Report Helpers
// ---------------------------------------------------------------------------

function buildReportHeader(timestamp: string): string {
  const base = getBaseURL();

  return [
    `# PRA Tool End-to-End Trace`,
    ``,
    `| Field | Value |`,
    `| --- | --- |`,
    `| Generated | ${timestamp} |`,
    `| API base | \`${base}\` |`,
    `| Building | ${TEST_BUILDING.name} (${TEST_BUILDING.country}, ${TEST_BUILDING.propertyType}, ${TEST_BUILDING.floorArea} m²) |`,
    `| Measures | ${SELECTED_MEASURES.join(", ")} |`,
    `| Financing | ${FUNDING.financingType} |`,
    ``,
    `> This report was produced by \`tests/integration/pra-trace.test.ts\`.`,
    `> It exercises the **production PRA orchestrator** (PortfolioAnalysisService)`,
    `> with HTTP calls intercepted via a vitest module mock on \`src/api/client\`.`,
    ``,
    `> **Not a CI gate** — intended for API developers investigating`,
    `> PRA numerical outputs and ground-truth behavior.`,
  ].join("\n");
}

function buildSequenceDiagram(history: HttpExchange[]): string {
  if (history.length === 0) {
    return "";
  }

  const lines: string[] = [
    "```mermaid",
    "sequenceDiagram",
    "  participant PRA as PRA Client",
    "  participant F as Forecasting",
    "  participant FI as Financial",
    "  participant T as Technical",
  ];

  const participantMap: Record<string, string> = {
    forecasting: "F",
    financial: "FI",
    technical: "T",
  };

  for (const entry of history) {
    const urlObj = (() => {
      try {
        return new URL(entry.request.url);
      } catch {
        return null;
      }
    })();

    const pathname = urlObj?.pathname ?? entry.request.url;

    // Extract service name from /api/<service>/...
    const serviceMatch = pathname.match(/^\/api\/(\w+)/);
    const serviceName = serviceMatch?.[1] ?? "unknown";
    const participant = participantMap[serviceName] ?? "F";

    // Build a compact label: METHOD /relative/path
    const relativePath = pathname.replace(/^\/api\/\w+/, "");
    const label = `${entry.request.method} ${relativePath || "/"}`;
    const status = entry.response.status;

    lines.push(`  PRA->>${participant}: ${label}`);
    lines.push(`  ${participant}-->>${"PRA"}: ${status}`);
  }

  lines.push("```");

  return [`## HTTP Sequence Overview`, ``, ...lines].join("\n");
}

function buildHttpAppendix(history: HttpExchange[]): string {
  const BODY_LIMIT = 8192;

  const entries = history.map((entry, i) => {
    const { request, response } = entry;

    const urlObj = (() => {
      try {
        return new URL(request.url);
      } catch {
        return null;
      }
    })();

    const queryStr = urlObj?.search ?? "";
    const bodyStr =
      request.body === "[FormData]"
        ? "_empty FormData body — all parameters passed as query string (see above)_"
        : request.body !== undefined
          ? truncateJson(request.body, BODY_LIMIT)
          : "_none_";
    const respStr = truncateJson(response.body, BODY_LIMIT);

    return [
      `### Call ${i + 1}: ${request.method} ${urlObj?.pathname ?? request.url}`,
      ``,
      `- **Method:** \`${request.method}\``,
      `- **URL:** \`${request.url}\``,
      queryStr ? `- **Query params:** \`${queryStr}\`` : null,
      `- **Timestamp:** ${request.timestamp}`,
      `- **Status:** ${response.status}`,
      ``,
      `**Request body:**`,
      ``,
      bodyStr,
      ``,
      `**Response body:**`,
      ``,
      respStr,
    ]
      .filter((l) => l !== null)
      .join("\n");
  });

  return [
    `## Appendix: Full HTTP Log`,
    ``,
    `${history.length} HTTP call(s) recorded.`,
    ``,
    ...entries,
  ].join("\n\n");
}

/**
 * Format a number for display: returns formatted string or "_n/a_" if absent.
 */
function fmtNumber(value: number | undefined | null, decimals = 0): string {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "_n/a_";
  }
  return value.toFixed(decimals);
}

/**
 * Render a simple Markdown table.
 */
function mdTable(headers: string[], rows: (string | number)[][]): string {
  const headerRow = `| ${headers.join(" | ")} |`;
  const separator = `| ${headers.map(() => "---").join(" | ")} |`;
  const dataRows = rows.map((r) => `| ${r.join(" | ")} |`);
  return [headerRow, separator, ...dataRows].join("\n");
}

/**
 * Truncate and pretty-print JSON for the report.
 */
function truncateJson(obj: unknown, maxLen: number): string {
  const json = JSON.stringify(obj, null, 2);
  if (json.length > maxLen) {
    return `\`\`\`json\n${json.slice(0, maxLen)}\n\n... (truncated, ${json.length - maxLen} chars omitted)\n\`\`\``;
  }
  return `\`\`\`json\n${json}\n\`\`\``;
}
