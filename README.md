# ReLIFE Web Interface

Web interface for ReLIFE’s building-renovation tools, built with Vite, React, TypeScript, and Mantine UI.

```mermaid
flowchart LR
    UI["Web UI in the browser<br/>HRA, PRA, RSE"]
    PROXY[Caddy API proxy]

    subgraph APIs[Backend services]
      FIN["Financial API<br/>Costs, property values, returns and risk"]
      FCAST["Forecasting API<br/>Archetypes, energy and thermal health"]
      TECH["Technical API<br/>Multi-criteria ranking"]
    end

    subgraph SB[Supabase backend]
      AUTH[Authentication]
      DB[(Database)]
    end

    UI -->|API requests, session token when signed in| PROXY
    PROXY -->|/api/financial| FIN
    PROXY -->|/api/forecasting| FCAST
    PROXY -->|/api/technical| TECH
    UI -->|Sign-in and session management| AUTH
    UI -->|Saved portfolios and RSE simulation cache| DB
    FIN & FCAST & TECH -.->|Validate Supabase tokens| AUTH
```

## Development

The requirements are Node.js 22, Task, and Docker Compose.

Copy `.env.default` to `.env.local` and fill in the credentials.

```bash
npm ci           # Install dependencies
task dev         # Start Docker services and Vite with the API proxy
npm run build    # Build for production
npm run preview  # Preview the build
```

For local backend builds, `task fetch-sources` clones the three services into `external-services/`; `task dev-local` starts them with Vite.

### Testing

- `task test-unit`: Vitest unit and component tests, no backend required.
- `task test-e2e`: starts the locally built Docker stack and runs Playwright journeys for HRA and PRA. See [E2E prerequisites and commands](./tests/e2e/README.md).
- `task test`: both of the above.

### Releasing

Releases use SemVer tags (`vMAJOR.MINOR.PATCH`):

```bash
# Preview the next version and commands
task release -- patch --dry-run

# Bump the version, commit, tag, and push. Use minor or major for larger releases.
task release -- patch
```

The [release script](./scripts/release.sh) requires `main`, a clean working tree, and passing `task format-lint` checks. Pushing the release tag triggers the [Docker publish workflow](.github/workflows/docker-publish.yml) to publish the image to GHCR.

## Renovation Tool Workflows

### Home Renovation Assistant

```mermaid
sequenceDiagram
    participant UI as Web UI
    participant FCAST as Forecasting API
    participant FIN as Financial API
    participant TECH as Technical API

    UI->>FCAST: Load archetype catalog and details
    FCAST-->>UI: Reference building data
    alt Modified building
      UI->>FCAST: Validate building changes
      FCAST-->>UI: Validated building data
      UI->>FCAST: Simulate modified and reference baselines
      FCAST-->>UI: Baseline energy results
    else Reference building
      UI->>FCAST: Simulate baseline
      FCAST-->>UI: Baseline energy results
    end
    UI->>UI: Show energy profile

    opt Package costs missing
      UI->>FIN: Look up renovation and maintenance costs
      FIN-->>UI: Reference costs
    end
    UI->>FCAST: Simulate packages and assess thermal health
    FCAST-->>UI: Renovation energy and health impacts
    UI->>FCAST: Load emission factors
    FCAST-->>UI: Factors for local emissions calculations
    par Property valuation
      UI->>FIN: Appraise renovated property values
      FIN-->>UI: Valuations where available
    and Financial appraisal
      opt Positive bill savings and remaining investment
        UI->>FIN: Assess returns and risk with selected funding
        FIN-->>UI: Financial indicators
      end
    end
    opt At least two eligible packages and health data available
      UI->>TECH: Rank packages by selected priorities
      TECH-->>UI: Ranked packages and scores
    end
    UI->>UI: Show recommendations and scenario comparison
```

### Portfolio Renovation Advisor

```mermaid
sequenceDiagram
    participant UI as Web UI
    participant FCAST as Forecasting API
    participant FIN as Financial API

    loop Buildings processed in concurrent batches
      UI->>FCAST: Load archetype and simulate baseline
      FCAST-->>UI: Building data and baseline energy
      UI->>FCAST: Simulate renovation and assess thermal health
      FCAST-->>UI: Renovation energy and health impacts
      UI->>FCAST: Load emission factors
      FCAST-->>UI: Factors for local emissions calculations
      opt Renovation or maintenance cost missing
        UI->>FIN: Look up reference costs
        FIN-->>UI: Renovation and maintenance costs
      end
      par Property valuation
        UI->>FIN: Appraise renovated property values
        FIN-->>UI: Valuations where available
      and Financial appraisal
        opt Positive bill savings and remaining investment
          UI->>FIN: Assess returns and risk with selected funding
          FIN-->>UI: Financial indicators
        end
      end
      UI->>UI: Update progress after batch completes
    end
    UI->>UI: Show building results and portfolio summary
```

### Renovation Strategy Explorer

```mermaid
sequenceDiagram
    participant UI as Web UI
    participant FCAST as Forecasting API
    participant DB as Supabase
    participant FIN as Financial API

    UI->>FCAST: Load archetype catalog and details
    FCAST-->>UI: Reference building data
    UI->>DB: Read published simulation cache
    DB-->>UI: Baseline and renovated energy and emissions
    loop Each available archetype and package
      UI->>FIN: Look up renovation and maintenance costs
      FIN-->>UI: Reference costs
      opt Costs available, positive bill savings and remaining investment
        UI->>FIN: Assess returns and risk with selected funding
        FIN-->>UI: Financial indicators
      end
    end
    UI->>UI: Aggregate results and rank packages
    UI->>UI: Show strategy comparison
```
