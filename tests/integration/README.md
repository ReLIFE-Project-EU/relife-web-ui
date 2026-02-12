# Integration Tests

This directory contains end-to-end integration tests for the ReLIFE Web UI, focusing on testing API contract compliance with the three backend services (Financial, Forecasting, Technical).

## Overview

Each test simulates a real tool workflow by making direct HTTP calls to the backend services. On failure, tests emit structured context to enable automated fix generation.

### Tests

- **`hra-workflow.test.ts`** — Home Renovation Assistant (HRA) workflow (6 steps)
- **`pra-workflow.test.ts`** — Portfolio Renovation Advisor (PRA) workflow (6 steps)

### Workflow Steps

Both tests exercise the same APIs but validate different response fields:

1. **Health checks** — Verify all 3 services are reachable
2. **List archetypes** — Get available building archetypes
3. **Simulate baseline energy** — Calculate current energy needs
4. **ECM renovation simulation** — Calculate post-renovation energy needs
5. **Calculate ARV** — Calculate After Renovation Value
6. **Risk assessment** — Calculate financial metrics
   - HRA: `output_level: "private"` (basic metrics)
   - PRA: `output_level: "professional"` (adds probabilities & percentiles)

## Prerequisites

Docker services must be running and healthy:

```bash
task up
```

This starts all three backend services (financial, forecasting, technical) via Docker Compose and waits for health checks.

## Running Tests

### All tests

```bash
npm run test:integration
```

Or via Task:

```bash
task test-integration
```

### Single test file

```bash
npm run test:integration -- tests/integration/hra-workflow.test.ts
```

### Watch mode (for development)

```bash
npm run test:integration -- --watch
```

## Configuration

Tests are configured via environment variables:

- **`INTEGRATION_API_BASE`** — Base URL for API calls (default: `http://localhost:8080/api`)
- **`INTEGRATION_AUTH_TOKEN`** — Optional Bearer token for authenticated requests

Example:

```bash
export INTEGRATION_API_BASE=http://localhost:8080/api
npm run test:integration
```

## Test Structure

### Helpers

- **`helpers/api-client.ts`** — Thin fetch() wrapper with request/response recording
- **`helpers/fixtures.ts`** — Minimal realistic test payloads from OpenAPI specs
- **`helpers/context-reporter.ts`** — AI-optimized failure context formatter

### Sequential Execution

Tests run sequentially within each workflow (not in parallel) because each step depends on data from the previous step. Vitest is configured with `singleFork: true` to ensure this.

### Failure Context

On assertion failure, tests emit structured JSON with:

- Request/response details
- Validation errors
- Relevant source files (types, API wrappers, services, OpenAPI specs)

This enables AI agents to automatically generate fixes.

## Test Design Principles

1. **Zero app code imports** — Tests use direct `fetch()` calls, no Vite/React/Supabase dependencies
2. **Real workflows** — Each test represents how the tools actually work today
3. **Contract validation** — Tests validate API response shapes, not implementation details
4. **AI-optimized failures** — Structured context on failure enables automated fix generation
5. **Minimal fixtures** — Test data derived from OpenAPI spec examples

## Troubleshooting

### Connection errors (fetch failed)

Services are not running. Start them with:

```bash
task up
```

### Tests timeout

Some API calls (especially simulate/ECM) can take 30-60 seconds. The test timeout is set to 120 seconds. If tests still timeout, check service logs:

```bash
docker compose logs -f forecasting
```

### Validation errors

Tests will emit detailed context on validation failures. Look for the "INTEGRATION TEST FAILURE" blocks in the output showing:

- What field was missing/invalid
- The actual request/response
- Which source files to review

## Adding New Tests

When adding a new tool or workflow:

1. Create a new test file: `tests/integration/{tool}-workflow.test.ts`
2. Follow the same structure: sequential steps with shared state
3. Use `createStepContext()` for each step to enable failure context reporting
4. Validate response shapes, not exact values (contracts, not implementation)
5. Update this README with the new test description

## Maintenance

### When OpenAPI specs change

1. Fetch latest specs: `task fetch-specs`
2. Run tests to detect contract breaks: `npm run test:integration`
3. Review failure context and update fixtures/validations as needed
4. Update type definitions in `src/types/` if response shapes changed

### When tool workflows change

1. Review the plan document: `.copilot/session-state/.../plan.md`
2. Update test steps to match new workflow
3. Add/remove validations as needed
4. Ensure failure context metadata points to correct source files
