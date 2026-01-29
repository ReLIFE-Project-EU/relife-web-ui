---
name: api-client-upgrade
description: Reviews latest OpenAPI specifications from api-specs/ and proposes upgrade plans for the frontend API client. Use when reviewing API specifications, upgrading API clients, analyzing endpoint gaps, or when the user asks to review or update API integrations.
---

# API Client Upgrade Planning

Reviews the latest API specifications and proposes structured upgrade plans for the frontend API client (`src/api/`).

## Workflow

Follow these steps when reviewing API specifications:

### Step 1: Identify Latest Specifications

1. List contents of `api-specs/` directory
2. Identify the directory with the latest timestamp (alphabetically sorted, highest value)
3. Note the three service specification files: `financial.json`, `forecasting.json`, `technical.json`

### Step 2: Analyze Specifications

For each service specification file in the latest directory:

1. **Extract endpoints**:
   - List all paths and HTTP methods
   - Document path parameters, query parameters, and request body schemas
   - Extract response schemas and status codes

2. **Document types**:
   - Identify all request payload types
   - Identify all response payload types
   - Note any shared/common schemas

### Step 3: Gap Analysis

Compare specifications against current implementation:

1. **Review current API client structure**:
   - Check `src/api/financial.ts`, `src/api/forecasting.ts`, `src/api/technical.ts`
   - Note existing endpoint methods and their signatures
   - Review type definitions in `src/types/` (e.g., `src/types/financial.ts`)

2. **Identify gaps**:
   - Missing endpoints in current implementation
   - Endpoints with changed signatures (parameters, response types)
   - New request/response types not yet defined
   - Deprecated endpoints still in use

### Step 4: Propose Upgrade Plan

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

## Latest Specifications

- Directory: `api-specs/[timestamp]/`
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
- Reference OpenAPI specs as the source of truth

## Project Context

- API client uses two-layer architecture (see `CLAUDE.md`)
- Layer 1 (`src/api/`) contains thin HTTP wrappers
- Layer 2 (`src/features/*/services/`) contains business logic
- This skill focuses on Layer 1 updates only
