# ReLIFE Web Interface

A minimal, modern web application built with Vite, React, TypeScript, and Mantine UI. This app serves as the primary web interface (UI) for the ReLIFE Platform Services, including the technical, forecasting, and financial services.

## Development

```bash
# Install dependencies
npm install

# Start development server (with API proxy)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Renovation Tools Architecture

The ReLIFE Web UI implements three distinct renovation tools, each targeting different user groups and use cases. The architecture follows a two-layer pattern: API wrappers (`src/api/`) handle low-level HTTP communication, while feature services (`src/features/<tool>/services/`) add business logic and orchestration.

### Home Renovation Assistant

```mermaid
sequenceDiagram
    participant UI as Web UI
    participant HRA as Home Renovation Assistant
    participant FCAST as Forecasting API
    participant FIN as Financial API
    participant TECH as Technical API - stubbed for this tool

    UI->>HRA: Open /home-assistant/tool and submit building data
    HRA->>FCAST: listArchetypes/getArchetypeDetails
    FCAST-->>HRA: Archetype candidates + selected archetype metadata
    HRA->>FCAST: simulateDirect or simulateCustomBuilding for baseline EPC
    FCAST-->>HRA: Baseline energy simulation

    UI->>HRA: Evaluate selected renovation measures
    HRA->>FCAST: simulateECM for supported envelope measures only
    FCAST-->>HRA: Renovated scenario simulation

    HRA->>FIN: calculateARV + assessRisk per scenario
    FIN-->>HRA: ARV + risk indicators NPV IRR ROI PBP DPP
    HRA-->>UI: Render scenarios and financial results

    UI->>HRA: Run MCDA ranking
    Note over HRA,TECH: Technical API is not called and ranking uses local mock MCDA TOPSIS
    HRA-->>UI: Render ranked recommendations

    Note over FCAST: Partial for this tool: ECM currently applies wall/roof/windows only
```

Implementation status: Home Assistant is implemented end-to-end with real Forecasting + Financial API calls via `src/services/BuildingService.ts`, `src/services/EnergyService.ts`, `src/services/RenovationService.ts`, and `src/services/FinancialService.ts`. The Technical API is currently stubbed for this tool path: `mcda.rank(...)` is provided by `src/services/mock/MockMCDAService.ts` rather than `src/api/technical.ts`. Renovation simulation is partial because `simulateECM` currently applies supported envelope measures (wall, roof, windows), while other selected measures are not simulated in the API path.

### Portfolio Renovation Advisor

```mermaid
sequenceDiagram
    participant UI as Web UI
    participant PRA as Portfolio Renovation Advisor
    participant FCAST as Forecasting API
    participant FIN as Financial API
    participant TECH as Technical API - stubbed for this tool

    UI->>PRA: Open /portfolio-advisor/tool and configure buildings/measures
    UI->>PRA: Click "Analyze Portfolio"
    PRA->>PRA: analyzePortfolio batched by PRA_CONCURRENCY_LIMIT

    loop For each building
      PRA->>FCAST: estimateEPC via simulateDirect or simulateCustomBuilding
      FCAST-->>PRA: Baseline estimation
      PRA->>FCAST: evaluateScenarios via simulateECM
      FCAST-->>PRA: Renovated scenarios
      PRA->>FIN: calculateARV + assessRisk
      FIN-->>PRA: Financial results per scenario
      PRA-->>UI: Progress update + per-building result
    end

    Note over PRA,TECH: Technical API is not called in the current portfolio flow
    PRA-->>UI: Final portfolio results table and summary

    Note over FCAST: Partial for this tool because renovation simulation depends on supported ECM measures
```

Implementation status: Portfolio Advisor analysis is implemented with real Forecasting + Financial integrations orchestrated by `src/features/portfolio-advisor/services/PortfolioAnalysisService.ts` and triggered in `src/features/portfolio-advisor/components/steps/FinancingStep.tsx`. The service context at `src/features/portfolio-advisor/context/ServiceContext.tsx` wires real `EnergyService`, `RenovationService`, and `FinancialService`, then processes buildings in batches with progress callbacks. The Technical API remains stubbed for this tool path because no call is made to `src/api/technical.ts`; MCDA state/actions exist but ranking is not executed in the current workflow.

### Renovation Strategy Explorer

```mermaid
sequenceDiagram
    participant UI as Web UI
    participant RSE as Renovation Strategy Explorer
    participant FCAST as Forecasting API - not invoked
    participant FIN as Financial API - not invoked
    participant TECH as Technical API - not invoked

    UI->>RSE: Navigate to /strategy-explorer
    RSE-->>UI: Render landing page content and disabled "Coming Soon" CTA
    Note over RSE,FCAST: No runtime request path from this tool to Forecasting API
    Note over RSE,FIN: No runtime request path from this tool to Financial API
    Note over RSE,TECH: No runtime request path from this tool to Technical API
```

Implementation status: Strategy Explorer is currently a landing-page stub only, implemented in `src/routes/StrategyExplorerLanding.tsx` and routed in `src/App.tsx`. The Web UI renders static planned features and a disabled CTA, with no service orchestration layer and no tool-specific feature module yet. Forecasting, Financial, and Technical APIs are all uninvoked in the current runtime path for this tool.
