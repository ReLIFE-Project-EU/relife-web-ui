# Integration Tests

Test suite for ReLIFE Web UI backend integration, run with Vitest in Node environment.

## Test Taxonomy

This suite contains five categories of tests:

### Backend API Workflow Tests

Direct HTTP calls to backend services that verify API contracts and payload shapes:

- `hra-workflow.test.ts`: HRA-like workflow (6 steps, risk `output_level: "private"`)
- `pra-workflow.test.ts`: PRA-like workflow (6 steps, risk `output_level: "professional"`)
- `forecasting-pv-ecm.test.ts`: PV ECM API contract tests (PV-only, envelope+PV, invalid requests)

These tests call backend endpoints directly via `helpers/api-client.ts` with **no app runtime imports**. They do not validate React UI journeys.

### Service-Orchestrator PV Workflow Tests

Tests that exercise production Web UI feature services (BuildingService, EnergyService, RenovationService, FinancialService, PortfolioAnalysisService) with mocked `src/api/client` to redirect HTTP to the integration backend:

- `hra-service-pv-workflow.test.ts`: HRA production service path with PV ECM packages
- `pra-service-pv-workflow.test.ts`: PRA production service path with PV and per-building overrides

These tests validate app business logic, query param construction, and result handling **without running the React UI in a browser**. They are slow live-service tests and are excluded from the default integration gate. Run them explicitly with `npm run test:integration:pv-workflows` or `task test-integration-pv-workflows`.

### Manual Trace Utilities

Diagnostic tools that write detailed request/response artifacts for debugging:

- `pra-trace.test.ts`: PRA workflow trace that writes `pra-trace-<timestamp>.md` with HTTP exchange details

Trace tests are excluded from the normal integration gate and run manually.

### Smoke/Performance Tests

Operational smoke tests that verify service behavior under load:

- `forecasting-concurrency-smoke.test.ts`: Forecasting service concurrent vs sequential simulation performance

Smoke tests are excluded from the normal integration gate and run via dedicated config.

## Run

- Default integration gate: `npm run test:integration`
- Slow PV service workflows: `npm run test:integration:pv-workflows`
- PRA trace: `npm run trace:pra`
- Forecasting concurrency smoke: `npm run test:forecasting-concurrency-smoke`

## Important Notes

- **Current suite is NOT browser UI E2E**: These tests run in Vitest's Node environment. They do not render React components, click buttons, or validate browser UI behavior.
- **Strategy Explorer coverage**: Out of scope until a functional Strategy Explorer workflow exists beyond the coming-soon route.
- **Browser UI tests**: Planned as a future phase requiring explicit user approval for browser tooling (Playwright/Cypress).
