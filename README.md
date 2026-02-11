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
    participant TECH as Technical API (stubbed in HRA flow)

    UI->>HRA: Submit building inputs and start EPC estimation
    HRA->>FCAST: listArchetypes / getArchetypeDetails
    FCAST-->>HRA: Archetype metadata for matching
    alt Modified archetype
      HRA->>FCAST: simulateCustomBuilding(archetype=false)
      FCAST-->>HRA: Baseline simulation results
    else Default archetype
      HRA->>FCAST: simulateDirect(archetype=true)
      FCAST-->>HRA: Baseline simulation results
    end

    UI->>HRA: Evaluate selected renovation measures
    HRA->>FCAST: simulateECM(supported envelope measures)
    FCAST-->>HRA: Current + renovated scenarios
    HRA->>FIN: calculateARV + assessRisk per scenario
    FIN-->>HRA: ARV and risk indicators (NPV/IRR/ROI/PBP/DPP)
    HRA-->>UI: Render scenarios and financial outputs

    UI->>HRA: Run persona-based ranking
    Note over HRA,TECH: MCDA uses local mock TOPSIS service, and Technical API is not called
    HRA-->>UI: Render ranked recommendations
    Note over FCAST: Partial: ECM path currently supports wall/roof/windows only
```

**Implementation status**
- Real Forecasting + Financial integrations are wired through `src/services/BuildingService.ts`, `src/services/EnergyService.ts`, `src/services/RenovationService.ts`, and `src/services/FinancialService.ts`.
- Technical API behavior is mocked/stubbed for this tool path: ranking runs via `src/services/mock/MockMCDAService.ts` and no tool flow calls `src/api/technical.ts`.
- Renovation simulation is partial: `src/services/RenovationService.ts` filters to supported envelope measures before `forecasting.simulateECM(...)`, while unsupported measures remain selectable but unsimulated.
- For users and contributors, this means energy/financial outputs are API-backed, but MCDA ranking and non-envelope renovation effects are not yet backend-validated.

### Portfolio Renovation Advisor

```mermaid
sequenceDiagram
    participant UI as Web UI
    participant PRA as Portfolio Renovation Advisor
    participant FCAST as Forecasting API
    participant FIN as Financial API
    participant TECH as Technical API (stubbed in PRA flow)

    UI->>PRA: Configure portfolio and click Analyze Portfolio
    PRA->>PRA: analyzePortfolio() with batched concurrency
    loop Each building in batch
      PRA->>FCAST: estimateEPC (simulateDirect/simulateCustomBuilding)
      FCAST-->>PRA: Baseline estimation
      PRA->>FCAST: evaluateScenarios (simulateECM)
      FCAST-->>PRA: Scenario simulation results
      PRA->>FIN: calculateARV + assessRisk
      FIN-->>PRA: Financial outputs per scenario
      PRA-->>UI: Progress callback and per-building result
    end
    PRA-->>UI: Portfolio summary and results step
    Note over PRA,TECH: Technical API is not invoked in current PRA analysis flow
    Note over FCAST: Partial: same ECM support constraints as HRA (envelope-focused)
```

**Implementation status**
- Real Forecasting + Financial calls are orchestrated by `src/features/portfolio-advisor/services/PortfolioAnalysisService.ts`, triggered from `src/features/portfolio-advisor/components/steps/FinancingStep.tsx`.
- The runtime service wiring in `src/features/portfolio-advisor/context/ServiceContext.tsx` uses real `EnergyService`, `RenovationService`, and `FinancialService`, and processes buildings in concurrency-limited batches.
- Technical API usage is currently stubbed/absent in the analysis path: no portfolio-analysis call targets `src/api/technical.ts`, and MCDA is not executed as part of the visible PRA workflow.
- For users and contributors, this means portfolio energy/financial outputs are API-backed, while Technical-service MCDA/pillar scoring is not yet part of production flow.

### Renovation Strategy Explorer

```mermaid
sequenceDiagram
    participant UI as Web UI
    participant RSE as Renovation Strategy Explorer (landing stub)
    participant FCAST as Forecasting API (not invoked)
    participant FIN as Financial API (not invoked)
    participant TECH as Technical API (not invoked)

    UI->>RSE: Navigate to /strategy-explorer
    RSE-->>UI: Render static landing content + disabled "Coming Soon" CTA
    Note over RSE,FCAST: No runtime request path to Forecasting API
    Note over RSE,FIN: No runtime request path to Financial API
    Note over RSE,TECH: No runtime request path to Technical API
```

**Implementation status**
- The current implementation is a UI stub in `src/routes/StrategyExplorerLanding.tsx`, exposed by the route registration in `src/App.tsx`.
- The page renders planned feature content only, with a disabled action button and no tool orchestration/service layer.
- Forecasting, Financial, and Technical APIs are all uninvoked in this tool path at runtime.
- For users and contributors, this means Strategy Explorer is discoverable in navigation but not yet functionally integrated with backend services.
