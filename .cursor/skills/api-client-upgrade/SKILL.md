---
name: api-client-upgrade
description: >
  Proposes frontend API client (`src/api/`) upgrade plans using `api-specs/` snapshots
  cross-checked against service code under `external-services/` when available. Use when
  reviewing API integrations, upgrading clients, or analyzing endpoint gaps. If
  `external-services/` is missing, pause and ask the user before treating OpenAPI JSON alone as sufficient.
---

# API Client Upgrade Planning

Reviews the latest API specifications and proposes structured upgrade plans for the frontend API client (`src/api/`). **Service code under `external-services/` is the primary contract reference**; JSON under `api-specs/` is a hint and may be wrong or incomplete (see [`AGENTS.md`](../../../AGENTS.md) § API specifications).

## Workflow

Follow these steps when reviewing API specifications:

### Step 1: Identify Latest Specifications

1. List contents of `api-specs/` directory
2. Identify the directory with the latest timestamp (alphabetically sorted, highest value)
3. Note the three service specification files: `financial.json`, `forecasting.json`, `technical.json`

### Step 2: Verify Against Service Code

1. Check whether these directories exist: `external-services/relife-financial-service`, `external-services/relife-forecasting-service`, `external-services/relife-technical-service`
2. **If any expected repo is missing**: stop and **ask the user** to clone (e.g. `task fetch-sources` per [`Taskfile.yml`](../../../Taskfile.yml)) or to confirm another verification path before performing gap analysis from OpenAPI JSON alone
3. For each present service, use the codebase (routes, models, validation) to confirm paths, parameters, and bodies—**reconcile discrepancies** with `api-specs/` and call out spec drift explicitly in the plan

### Step 3: Analyze Specifications

For each service (preferring verified code, using spec files as supplementary):

1. **Extract endpoints**:
   - List all paths and HTTP methods
   - Document path parameters, query parameters, and request body schemas
   - Extract response schemas and status codes

2. **Document types**:
   - Identify all request payload types
   - Identify all response payload types
   - Note any shared/common schemas

### Step 4: Gap Analysis

Compare verified contract (code first, then spec) against current implementation:

1. **Review current API client structure**:
   - Check `src/api/financial.ts`, `src/api/forecasting.ts`, `src/api/technical.ts`
   - Note existing endpoint methods and their signatures
   - Review type definitions in `src/types/` (e.g., `src/types/financial.ts`)

2. **Identify gaps**:
   - Missing endpoints in current implementation
   - Endpoints with changed signatures (parameters, response types)
   - New request/response types not yet defined
   - Deprecated endpoints still in use

### Step 5: Propose Upgrade Plan

Create a structured plan with:

1. **Type definitions**:
   - List new TypeScript interfaces/types needed
   - Specify file locations (e.g., `src/types/financial.ts`, `src/types/forecasting.ts`)
   - Note any changes to existing types

2. **API client updates**:
   - List new endpoint methods to add
   - List existing methods to update (with before/after signatures)
   - List methods to deprecate or remove

3. **Implementation structure**:
   - Maintain existing error handling (`APIError` from `src/types/common`)
   - Preserve authentication handling (via `request` function from `src/api/client.ts`)
   - Keep service-specific files separate (`financial.ts`, `forecasting.ts`, `technical.ts`)

4. **Example signatures**:
   - Provide example function signatures showing:
     - Function name
     - Parameter types (from request schemas)
     - Return type (from response schemas)
     - HTTP method and path

## Output Format

Structure the plan as:

```markdown
# API Client Upgrade Plan

## Contract sources

- `api-specs/` directory: `api-specs/[timestamp]/`
- Service code verified under `external-services/`: yes/no (note gaps)
- Services: financial, forecasting, technical

## Type Definitions

### Financial Service

- **File**: `src/types/financial.ts`
- New types:
  - `NewRequestType`: { ... }
  - `NewResponseType`: { ... }
- Updated types:
  - `ExistingType`: Add field `newField: string`

## API Client Updates

### Financial Service (`src/api/financial.ts`)

- **Add**: `newEndpoint(data: NewRequestType): Promise<NewResponseType>`
  - Method: POST
  - Path: `/financial/new-endpoint`
- **Update**: `existingEndpoint(data: UpdatedRequestType): Promise<UpdatedResponseType>`
  - Changes: Added optional parameter `newParam?: string`

## Implementation Notes

- Maintain existing error handling patterns
- Preserve authentication via `request` helper
- Follow existing code style (named exports, TypeScript strict mode)
```

## Important Constraints

- **Do not implement** the full code—only propose the plan
- Ensure compatibility with React 19, TypeScript 5.9, Vite
- Maintain strict typing (avoid `any`)
- Preserve existing architecture patterns from `src/api/client.ts`
- **Source-of-truth order**: (1) service implementation in `external-services/`, (2) observed HTTP behavior / tests when code is unavailable, (3) `api-specs/` snapshots as a non-authoritative aid—never assume JSON alone is complete or current

## Project Context

- Contract policy and repo table: [`AGENTS.md`](../../../AGENTS.md) § API specifications (OpenAPI)
- API client uses two-layer architecture (see `CLAUDE.md`)
- Layer 1 (`src/api/`) contains thin HTTP wrappers
- Layer 2 (`src/features/*/services/`) contains business logic
- This skill focuses on Layer 1 updates only
