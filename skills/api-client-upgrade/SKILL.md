---
name: api-client-upgrade
description: >
  Proposes frontend API client (`src/api/`) upgrade plans from verified service
  implementation (optional `external-services/` clones or upstream GitHub), plus
  integration tests or live HTTP when needed. Use when reviewing API integrations,
  upgrading clients, or analyzing endpoint gaps. Do not infer contracts from OpenAPI
  JSON alone; this repo does not ship API spec snapshots.
---

# API Client Upgrade Planning

Proposes structured upgrade plans for the frontend API client (`src/api/`). **Contract truth is the service implementation** (route handlers, models, validation): read it from `external-services/<repo>` when present, otherwise from the **public GitHub repositories** listed in [`AGENTS.md`](../../AGENTS.md) § Backend API contracts. Use **integration tests** (`tests/integration/`) and a **running stack** to validate behavior at HTTP boundaries when source alone is ambiguous.

## Workflow

### Step 1: Locate contract sources

1. Check whether these directories exist: `external-services/relife-financial-service`, `external-services/relife-forecasting-service`, `external-services/relife-technical-service`
2. **If any expected repo is missing**: use the GitHub URLs in [`AGENTS.md`](../../AGENTS.md) to review the same code paths in the browser or ask the user to clone (`task fetch-sources` per [`Taskfile.yml`](../../Taskfile.yml)) if local search is required
3. Optionally cross-check with `task up` / Docker Compose and Vitest integration tests

### Step 2: Map each service from code

For each service (financial, forecasting, technical):

1. Find route definitions and handler entrypoints (e.g. FastAPI routers, dependencies)
2. Confirm paths, HTTP methods, path/query parameters, and request/response models or validation
3. Note serializers or response wrappers that change the wire format relative to any generated OpenAPI

### Step 3: Analyze vs current Web UI client

1. **Extract endpoints** from verified code:
   - Paths and methods
   - Request bodies and query/path parameters
   - Response shapes and status codes

2. **Document types** implied by those models

### Step 4: Gap analysis

Compare verified contract against the current implementation:

1. **Review current API client structure**:
   - `src/api/financial.ts`, `src/api/forecasting.ts`, `src/api/technical.ts`
   - Types in `src/types/` (e.g. `src/types/financial.ts`)

2. **Identify gaps**:
   - Missing or outdated endpoints
   - Signature or type drift
   - Deprecated usage

### Step 5: Propose upgrade plan

Create a structured plan with type additions/changes, new or updated client methods, and implementation notes (error handling via `APIError`, auth via `src/api/client.ts`, strict typing).

## Output format

Structure the plan as:

```markdown
# API Client Upgrade Plan

## Contract sources

- `external-services/` verified locally: yes/no (note which repos)
- Upstream GitHub / user guidance used: note
- Cross-check: integration tests / running stack (yes/no)

## Type Definitions

### Financial Service

- **File**: `src/types/financial.ts`
- New types: …
- Updated types: …

## API Client Updates

### Financial Service (`src/api/financial.ts`)

- **Add**: …
- **Update**: …

## Implementation Notes

- Maintain `APIError` and `request` patterns from `src/api/client.ts`
```

## Important constraints

- **Do not implement** the full code—only propose the plan
- Ensure compatibility with React 19, TypeScript 5.9, Vite
- Maintain strict typing (avoid `any`)
- Preserve existing architecture patterns from `src/api/client.ts`
- **Source-of-truth order**: (1) service implementation in `external-services/` or equivalent paths on GitHub, (2) observed HTTP behavior and integration tests when code is ambiguous, (3) ask the user when still uncertain—**never** assume generated OpenAPI from services is complete or current

## Project context

- Contract policy and repo table: [`AGENTS.md`](../../AGENTS.md) § Backend API contracts
- API client uses the two-layer architecture documented in `AGENTS.md`
- Layer 1 (`src/api/`) contains thin HTTP wrappers
- Layer 2 (`src/features/*/services/`) contains business logic
- This skill focuses on Layer 1 updates only
