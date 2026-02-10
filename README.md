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
    participant BuildingSvc as Building Service
    participant EnergySvc as Energy Service
    participant RenovationSvc as Renovation Service
    participant FinancialSvc as Financial Service
    participant MCDASvc as MCDA Service (mock)
    participant FCAST as Forecasting API
    participant FIN as Financial API

    Note over UI,HRA: Step 1: Building Information & EPC Estimation
    UI->>BuildingSvc: getOptions() + getArchetypes()
    BuildingSvc->>FCAST: GET /building/available
    FCAST-->>BuildingSvc: Available archetypes (country, category, period)
    BuildingSvc-->>UI: Dynamic dropdown options (from archetypes)
    UI->>UI: User selects location on interactive map
    UI->>BuildingSvc: findMatchingArchetype(lat, lng, category, period)
    BuildingSvc-->>UI: Best matching archetype (distance-based)
    UI->>HRA: Submit building information
    HRA->>EnergySvc: estimateEPC(building)
    EnergySvc->>FCAST: POST /simulate?archetype=true&weather_source=pvgis
    FCAST-->>EnergySvc: Energy simulation results (hourly data)
    EnergySvc-->>HRA: EstimationResult (EPC, energy needs, costs)
    HRA-->>UI: Display EPC estimation

    Note over UI,HRA: Step 2: Renovation Measures & Financial Analysis
    UI->>HRA: Select renovation measures
    HRA->>RenovationSvc: evaluateScenarios(building, estimation, measures)
    RenovationSvc->>FCAST: POST /ecm_application (envelope measures only)
    Note over RenovationSvc: Currently supports: wall, roof, windows<br/>Systems/renewables: TODO
    FCAST-->>RenovationSvc: Renovated scenario energy data
    RenovationSvc-->>HRA: RenovationScenario[] (current + renovated)

    HRA->>FinancialSvc: calculateForAllScenarios(scenarios, funding, ...)
    loop For each scenario
        FinancialSvc->>FIN: POST /arv (property value calculation)
        FIN-->>FinancialSvc: ARV result
        FinancialSvc->>FIN: POST /risk-assessment (Monte Carlo simulation)
        FIN-->>FinancialSvc: Financial indicators (NPV, IRR, ROI, PBP, DPP)
    end
    FinancialSvc-->>HRA: FinancialResults (per scenario)
    HRA-->>UI: Display scenarios with financial data

    Note over UI,HRA: Step 3: MCDA Ranking & Decision Support
    UI->>HRA: Select MCDA persona
    HRA->>MCDASvc: rank(scenarios, financialResults, persona)
    Note over MCDASvc: Mock implementation<br/>Local TOPSIS algorithm<br/>Technical API integration: TODO
    MCDASvc-->>HRA: MCDARankingResult[] (sorted by rank)
    HRA-->>UI: Display ranked recommendations
```

**Implementation Status:**

- **Forecasting API**: Fully integrated. Building options are dynamically derived from available archetypes via `GET /building/available`. Uses archetype-based simulation (`/simulate` with `archetype=true`) for baseline EPC estimation and ECM application endpoint (`/ecm_application`) for renovation scenarios. Currently supports envelope measures (wall insulation, roof insulation, windows); systems and renewable measures are pending API support.
- **Financial API**: Fully integrated. Calls `/arv` for property value calculation and `/risk-assessment` for Monte Carlo financial analysis. Both endpoints are production-ready.
- **Technical API**: Not integrated. MCDA ranking uses a local mock implementation with TOPSIS algorithm. The Technical API's five pillar endpoints (`/ee`, `/rei`, `/sei`, `/uc`, `/fv`) are not yet called. See [`src/features/home-assistant/services/mock/MockMCDAService.ts`](src/features/home-assistant/services/mock/MockMCDAService.ts).
- **Building Service**: Real implementation using Forecasting API archetypes. Dropdown options (building type, construction period) are dynamically filtered based on available archetypes. Location input uses an interactive Leaflet map with archetype markers. Distance-based matching selects the closest archetype using country reference coordinates. See [`src/features/home-assistant/services/BuildingService.ts`](src/features/home-assistant/services/BuildingService.ts).

### Portfolio Renovation Advisor

```mermaid
sequenceDiagram
    participant UI as Web UI
    participant PRA as Portfolio Renovation Advisor
    participant PM as Portfolio Manager
    participant SB as Supabase (Storage)
    participant FCAST as Forecasting API
    participant FIN as Financial API
    participant TECH as Technical API

    Note over UI,PM: Portfolio Management (Implemented)
    UI->>PRA: Navigate to /my-portfolios
    PRA->>PM: Load PortfolioManager component
    PM->>SB: portfolioApi.list()
    SB-->>PM: User's portfolios
    PM-->>UI: Display portfolio selector

    UI->>PM: Create new portfolio
    PM->>SB: portfolioApi.create(name, description)
    SB-->>PM: Portfolio created

    UI->>PM: Upload CSV building data
    PM->>SB: fileApi.upload(file, portfolioId)
    Note over PM,SB: Validates: file type, size (50MB max), quota
    SB-->>PM: File stored in Supabase Storage
    PM-->>UI: Display uploaded files with quota indicator

    Note over PRA,TECH: Analysis Features (Not Yet Implemented)
    UI->>PRA: Navigate to /portfolio-advisor
    PRA-->>UI: Display landing page with planned features
    Note over PRA: Planned:<br/>- Financial Analysis (FIN API)<br/>- Technical Analysis (TECH API)<br/>- Comparative Analytics
```

**Implementation Status:**

- **Tool Status**: Partially implemented. Portfolio management is functional at `/my-portfolios` (authenticated). Landing page at `/portfolio-advisor` displays planned features.
- **Portfolio Manager**: Fully implemented using Supabase. Supports CRUD operations for portfolios, CSV file upload/management, and storage quota tracking. See [`src/features/portfolio-manager/`](src/features/portfolio-manager/).
- **Forecasting API**: Not integrated. Planned for building simulation across portfolio.
- **Financial API**: Not integrated. Planned for portfolio-level financial analysis.
- **Technical API**: Not integrated. Planned for MCDA across multiple buildings.

### Renovation Strategy Explorer

```mermaid
sequenceDiagram
    participant UI as Web UI
    participant RSE as Renovation Strategy Explorer
    participant FCAST as Forecasting API
    participant FIN as Financial API
    participant TECH as Technical API

    Note over UI,RSE: Tool not yet implemented
    UI->>RSE: Navigate to /strategy-explorer
    RSE-->>UI: Display landing page with planned features

    Note over RSE: Planned features:<br/>- Building Stock Analysis<br/>- Regional Projections<br/>- Geographic Insights<br/>- Policy Dashboard
```

**Implementation Status:**

- **Tool Status**: Not implemented. Only a landing page exists at `/strategy-explorer` route (see [`src/routes/StrategyExplorerLanding.tsx`](src/routes/StrategyExplorerLanding.tsx)). The landing page displays planned features but no actual tool functionality is available.
- **Forecasting API**: Not integrated.
- **Financial API**: Not integrated.
- **Technical API**: Not integrated.
