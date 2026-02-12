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

The ReLIFE Web UI implements three renovation tools with different implementation maturity levels. The diagrams below document current runtime behavior (not target design), including where services are real, mocked, partial, or not wired yet.

### Home Renovation Assistant

#### Sequence Diagram

```mermaid
sequenceDiagram
    participant UI as Web UI
    participant HRA as Home Renovation Assistant
    participant FCAST as Forecasting API
    participant FIN as Financial API
    participant TECH as Technical API

    UI->>HRA: Submit building inputs
    HRA->>FCAST: listArchetypes / getArchetypeDetails
    FCAST-->>HRA: Archetype metadata for matching
    alt Modified archetype
      HRA->>FCAST: simulateCustomBuilding(archetype=false)
      FCAST-->>HRA: Baseline simulation results
    else Default archetype
      HRA->>FCAST: simulateDirect(archetype=true)
      FCAST-->>HRA: Baseline simulation results
    end

    UI->>HRA: Evaluate selected measures
    HRA->>FCAST: simulateECM(supported envelope measures)
    FCAST-->>HRA: Current + renovated scenarios
    HRA->>FIN: calculateARV and assessRisk per scenario
    FIN-->>HRA: ARV and risk indicators
    HRA-->>UI: Render scenarios and financial outputs

    UI->>HRA: Run persona ranking with local MockMCDAService
    HRA->>HRA: Technical API is not called in this flow
    HRA-->>UI: Render ranked recommendations and scenario comparison
    HRA->>HRA: ECM path currently supports wall, roof, and windows
```

#### Flow Diagram

```mermaid
flowchart LR
    UserInput["USER INPUT<br/>---<br/>Required:<br/>- Country and location lat/lng<br/>- Building type and period<br/>- Floor area, project lifetime<br/>---<br/>Optional:<br/>- Archetype modifications<br/>- CAPEX and maintenance<br/>- Loan amount and term"]

    DB[("RELIFE DATA SOURCES<br/>---<br/>Forecasting archetypes<br/>Financial CAPEX/OPEX defaults<br/>Risk model parameters")]

    Forecasting["FORECASTING API PARTIAL<br/>---<br/>GET /forecasting/building/available<br/>POST /forecasting/building archetype=true<br/>POST /forecasting/simulate<br/>POST /forecasting/ecm_application<br/>---<br/>Returns baseline and renovated energy outputs<br/>NOTE: Renovation simulation limited to envelope measures"]

    Financial["FINANCIAL API REAL<br/>---<br/>POST /financial/arv<br/>POST /financial/risk-assessment<br/>---<br/>Returns ARV + risk metrics<br/>NPV, IRR, ROI, PBP, DPP"]

    Technical["TECHNICAL API STUB - NOT CALLED<br/>---<br/>Endpoints exist in src/api/technical.ts<br/>No HRA runtime invocation<br/>Ranking runs in local mock service"]

    Output["HOME ASSISTANT RESULTS UI<br/>---<br/>Shows EPC and scenario comparisons<br/>Shows ARV and risk charts/metrics<br/>Shows ranking from local MockMCDAService"]

    UserInput --> Forecasting
    DB --> Forecasting
    UserInput --> Financial
    DB --> Financial
    Forecasting --> Financial
    Forecasting --> Output
    Financial --> Output
    Forecasting -. planned-only .-> Technical
    Financial -. planned-only .-> Technical
    Technical -. not-executed .-> Output

    style UserInput fill:#f0f0f0
    style DB fill:#d4edda
    style Forecasting fill:#cfe2ff,stroke:#4c6ef5
    style Financial fill:#fff3cd,stroke:#a37f00
    style Technical fill:#f8d7da,stroke:#666,stroke-dasharray: 5 5
    style Output fill:#d1ecf1
```

**Implementation status**

- Real Forecasting + Financial integrations are wired through `src/services/BuildingService.ts`, `src/services/EnergyService.ts`, `src/services/RenovationService.ts`, and `src/services/FinancialService.ts`.
- Technical API is not invoked in the HRA runtime path; ranking uses `src/services/mock/MockMCDAService.ts` (local TOPSIS) instead of `src/api/technical.ts`.
- Renovation simulation is partial: `src/services/RenovationService.ts` filters to wall/roof/windows before `forecasting.simulateECM(...)`; other selected measures are currently unsimulated.
- This means energy and financial outputs are backend-backed, while ranking and non-envelope technical effects are local/mock behavior.
- Compare with the design flow in `docs/hra-tool-design.md#sequential-flow`.

### Portfolio Renovation Advisor

#### Sequence Diagram

```mermaid
sequenceDiagram
    participant UI as Web UI
    participant PRA as Portfolio Renovation Advisor
    participant FCAST as Forecasting API
    participant FIN as Financial API
    participant TECH as Technical API

    UI->>PRA: Configure portfolio and click Analyze Portfolio
    PRA->>PRA: analyzePortfolio() with batched concurrency
    loop Each building in batch
      PRA->>FCAST: estimateEPC
      FCAST-->>PRA: Baseline estimation
      PRA->>FCAST: evaluateScenarios
      FCAST-->>PRA: Scenario simulation results
      PRA->>FIN: calculateARV + assessRisk
      FIN-->>PRA: Financial outputs per scenario
      PRA-->>UI: Progress callback and per-building result
    end
    PRA->>PRA: No Technical API call in portfolio analysis flow
    PRA->>PRA: Same ECM support constraints as HRA
    PRA-->>UI: Portfolio summary in results step
```

#### Flow Diagram

```mermaid
flowchart LR
    ProfessionalInput["PROFESSIONAL INPUT<br/>---<br/>Portfolio buildings via CSV/manual<br/>Archetype and modification fields<br/>Selected renovation measures<br/>Project lifetime and financing settings"]

    DB[("RELIFE DATA SOURCES<br/>---<br/>Forecasting archetypes<br/>Financial CAPEX/OPEX defaults<br/>Risk model parameters")]

    Forecasting["FORECASTING API PARTIAL<br/>---<br/>simulateDirect and simulateCustomBuilding<br/>simulateECM for selected measures<br/>---<br/>Used per building in batched analysis<br/>NOTE: ECM support remains envelope-focused"]

    Financial["FINANCIAL API REAL<br/>---<br/>POST /financial/arv<br/>POST /financial/risk-assessment<br/>---<br/>Professional output level<br/>Provides metrics and probability metadata"]

    Technical["TECHNICAL API STUB - NOT CALLED<br/>---<br/>No invocation in PortfolioAnalysisService<br/>MCDA/technical pillar scoring not wired"]

    ProfessionalUI["PORTFOLIO ADVISOR RESULTS UI<br/>---<br/>Shows per-building baseline/renovated outputs<br/>Shows ARV and risk indicators<br/>Shows portfolio progress and aggregated results"]

    ProfessionalInput --> Forecasting
    DB --> Forecasting
    ProfessionalInput --> Financial
    DB --> Financial
    Forecasting --> Financial
    Forecasting --> ProfessionalUI
    Financial --> ProfessionalUI
    Forecasting -. planned-only .-> Technical
    Financial -. planned-only .-> Technical
    Technical -. not-executed .-> ProfessionalUI

    style ProfessionalInput fill:#f0f0f0
    style DB fill:#d4edda
    style Forecasting fill:#cfe2ff,stroke:#4c6ef5
    style Financial fill:#fff3cd,stroke:#a37f00
    style Technical fill:#f8d7da,stroke:#666,stroke-dasharray: 5 5
    style ProfessionalUI fill:#d1ecf1
```

**Implementation status**

- Real Forecasting + Financial calls are orchestrated in `src/features/portfolio-advisor/services/PortfolioAnalysisService.ts`, triggered from `src/features/portfolio-advisor/components/steps/FinancingStep.tsx`.
- Service wiring in `src/features/portfolio-advisor/context/ServiceContext.tsx` uses real `EnergyService`, `RenovationService`, and `FinancialService` with concurrency-limited batches.
- Technical API is not called in the PRA analysis path; `src/api/technical.ts` endpoints are currently outside this runtime workflow.
- This means portfolio energy and finance outputs are backend-backed, while technical/MCDA backend scoring remains unimplemented in the production path.
- Compare with the design flow in `docs/pra-tool-design.md#sequential-flow`.

### Renovation Strategy Explorer

#### Sequence Diagram

```mermaid
sequenceDiagram
    participant UI as Web UI
    participant RSE as Renovation Strategy Explorer
    participant FCAST as Forecasting API
    participant FIN as Financial API
    participant TECH as Technical API

    UI->>RSE: Navigate to /strategy-explorer
    RSE->>RSE: No runtime API calls from this route
    RSE->>RSE: Forecasting API not invoked
    RSE->>RSE: Financial API not invoked
    RSE->>RSE: Technical API not invoked
    RSE-->>UI: Render static landing content and disabled Coming Soon CTA
```

#### Flow Diagram

```mermaid
flowchart LR
    PolicyInput["POLICYMAKER INPUT PLACEHOLDER<br/>---<br/>User navigates to strategy page<br/>No data-capture form implemented"]

    DB[("RELIFE DATABASE NOT USED IN FLOW<br/>---<br/>No Strategy Explorer reads or writes yet")]

    Forecasting["FORECASTING API STUB - NOT CALLED<br/>---<br/>No route or service invocation<br/>No request payloads implemented"]

    Financial["FINANCIAL API STUB - NOT CALLED<br/>---<br/>No route or service invocation<br/>No request payloads implemented"]

    Technical["TECHNICAL API STUB - NOT CALLED<br/>---<br/>No route or service invocation<br/>No request payloads implemented"]

    PolicyUI["STRATEGY EXPLORER LANDING UI<br/>---<br/>Static feature cards<br/>Disabled Coming Soon button"]

    PolicyInput --> PolicyUI
    PolicyInput -. planned-only .-> Forecasting
    PolicyInput -. planned-only .-> Financial
    PolicyInput -. planned-only .-> Technical
    DB -. planned-only .-> Forecasting
    DB -. planned-only .-> Financial
    DB -. planned-only .-> Technical
    Forecasting -. not-executed .-> PolicyUI
    Financial -. not-executed .-> PolicyUI
    Technical -. not-executed .-> PolicyUI

    style PolicyInput fill:#f0f0f0
    style DB fill:#d4edda
    style Forecasting fill:#cfe2ff,stroke:#666,stroke-dasharray: 5 5
    style Financial fill:#fff3cd,stroke:#666,stroke-dasharray: 5 5
    style Technical fill:#f8d7da,stroke:#666,stroke-dasharray: 5 5
    style PolicyUI fill:#e2e3e5
```

**Implementation status**

- The current implementation is a UI stub in `src/routes/StrategyExplorerLanding.tsx`, mounted via `src/App.tsx`.
- The page shows static planned-feature content with a disabled CTA and no orchestration/service layer.
- Forecasting, Financial, and Technical APIs are all uninvoked in this tool path at runtime.
- This means Strategy Explorer is visible in navigation but remains a non-functional placeholder.
