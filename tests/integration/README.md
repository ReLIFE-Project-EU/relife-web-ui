# Integration Tests

Contract-level workflow tests for backend APIs, run with Vitest in Node.

## Scope

- `hra-workflow.test.ts`: HRA workflow (6 steps, risk `output_level: "private"`).
- `pra-workflow.test.ts`: PRA workflow (6 steps, risk `output_level: "professional"`).
- Tests call backend endpoints directly via `helpers/api-client.ts` (no app runtime imports).

## Run

- Direct Vitest run (you start services first):
  1. `task up` (published images) or `task up-local` (local sources).
  2. `npm run test:integration`
- Task-based run (startup included):
  - `task test-integration` (runs `up-local` before tests)

## Environment

- `INTEGRATION_API_BASE` (default: `http://localhost:8080/api`)
- `INTEGRATION_AUTH_TOKEN` (optional bearer token)

Vitest integration config is in `vitest.integration.config.ts` (sequential single-fork, fail-fast, 120s test timeout).
