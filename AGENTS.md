# AGENTS.md

Guidance for AI agents working in this repository.

## Pre-Task Checklist

Before starting work:

1. **D3.2**: if the task touches HRA/PRA/RSE, building data input, financial indicators, MCDA, EPC reporting, renovation service flows, or compliance, read [D32_WEB_UI_GUIDANCE.md](./D32_WEB_UI_GUIDANCE.md).
2. **Versions**: use only the documented dependency versions below and those already present in `package.json` / lockfile.
3. **Scope**: solve the stated problem with the smallest direct change.
4. **Conflict**: if the request conflicts with D3.2, current architecture, or an adjacent requirement, stop and ask.
5. **Ambiguity**: if multiple valid interpretations remain after repo inspection, ask before coding.
6. **API/client types**: if changing `src/api/` or service-related types, verify request/response shapes from service source, running stack, or integration tests. Ask if contracts cannot be verified.

Stop and ask when:

- D3.2 conflicts with the task or user instruction.
- Adding a dependency is being considered.
- The change would touch more than about 3 files in ways not directly requested.
- A user-visible assumption has not been stated explicitly.
- A new architecture pattern, layer, or abstraction would be needed.
- Accurate service request/response shape matters and cannot be verified.

## ReLIFE Context

This repository implements the **ReLIFE Web UI**, part of the EU LIFE ReLIFE project for building energy renovation in Europe.

D3.2 defines:

- **Three tools**: Renovation Strategy Explorer (policy/research), Portfolio Renovation Advisor (financial institutions/ESCOs/large owners), Home Renovation Assistant (homeowners/tenants/small owners).
- **Three backend services**: Financial, Forecasting, Technical.
- **Key domains**: funding options, NPV/IRR/ROI/PP/DPP/ARV, risk assessment, building simulation, climate scenarios, technical sheets, five-pillar MCDA, building stock analysis, GDPR, RBAC, data minimization.

Shared user-facing terminology lives in `src/constants/relifeConcepts.ts`. Reuse entries for labels, descriptions, caveats, professional details, metric names, and measure effects. Do not redefine shared concept copy inline. Add concepts only when necessary.

Use visible explanations sparingly. Prefer shared concept labels plus tooltip/popover detail for repeated labels, dense tables, and secondary metrics.

## Development Process

This project values transparency, restraint, and verifiability over speed or broad rewrites.

Think before coding:

- State assumptions explicitly.
- Surface multiple interpretations instead of choosing silently.
- Ask when requirements conflict or remain ambiguous after repo inspection.

Simplicity first:

- Implement exactly what was requested.
- Prefer the smaller change when it solves the problem.
- Validate at system boundaries; avoid defensive checks for impossible internal states.

Surgical changes:

- Preserve surrounding style and architecture.
- Do not refactor working code as a side effect.
- Do not remove dependencies unless your change created the dependency.
- Flag unrelated dead code instead of deleting it silently.

Goal-driven execution:

- Turn vague requests into measurable success criteria.
- For multi-step work, define a brief verification plan.
- Test before and after when you need to establish causality.

## Backend API Contracts

This repo does not ship authoritative OpenAPI/spec snapshots. FastAPI `/openapi.json` may be incomplete or stale.

Authoritative contract sources:

| Service     | Local source when present                      | Upstream                                                        |
| ----------- | ---------------------------------------------- | --------------------------------------------------------------- |
| Financial   | `external-services/relife-financial-service`   | https://github.com/ReLIFE-Project-EU/relife-financial-service   |
| Forecasting | `external-services/relife-forecasting-service` | https://github.com/ReLIFE-Project-EU/relife-forecasting-service |
| Technical   | `external-services/relife-technical-service`   | https://github.com/ReLIFE-Project-EU/relife-technical-service   |

Workflow:

- Prefer route handlers, request/response models, serializers, and validation in `external-services/<repo>`.
- If local clones are missing, use upstream GitHub source, a running stack (`task up` / Docker Compose), or `tests/integration/`.
- Cross-check HTTP behavior when in doubt.
- If still uncertain, ask whether to fetch service sources, inspect a specific handler, or confirm observed behavior.

## API Integration Architecture

Use the existing two-layer boundary.

### Layer 1: API Wrappers (`src/api/`)

Thin HTTP adapters only:

- `client.ts`: core request utilities with auth handling (`request`, `uploadRequest`, `downloadRequest`).
- `financial.ts`, `forecasting.ts`, `technical.ts`: endpoint wrappers.
- `index.ts`: service client re-exports.

API wrappers handle Supabase auth tokens, typed request/response interfaces, and `APIError`. They should not contain business logic.

### Layer 2: Feature/Domain Services

Feature services under `src/features/<tool>/services/` and shared services under `src/services/` consume API wrappers and add orchestration, transformations, calculations, interfaces, and mocks.

| Task                                    | Edit                       |
| --------------------------------------- | -------------------------- |
| Backend endpoint changed                | `src/api/<service>.ts`     |
| New backend endpoint                    | `src/api/<service>.ts`     |
| Feature business logic or orchestration | Feature/shared service     |
| Feature-specific transformations        | Feature/shared service     |
| Test/dev fake behavior                  | Existing mock service area |

## Tech Stack Versions

Do not use APIs or patterns from incompatible versions.

Core:

- React `^19.2.0`
- React DOM `^19.2.0`
- TypeScript `~5.9.3`
- Vite `^7.2.4`
- react-router-dom `^7.9.6`
- `@supabase/supabase-js` `^2.84.0`

UI:

- `@mantine/core` `^8.3.8`
- `@mantine/hooks` `^8.3.8`
- `@mantine/form` `^8.3.12`
- `@mantine/charts` `^8.3.12`
- `@mantine/dropzone` `^8.3.12`
- `@tabler/icons-react` `^3.35.0`
- `react-leaflet` `^5.0.0`
- `leaflet` `^1.9.4`

Tooling:

- `@vitejs/plugin-react` `^5.1.1`
- ESLint `^9.39.1`
- TypeScript ESLint `^8.46.4`
- Prettier `^3.6.2`
- Vitest `^4.0.18`

TypeScript config: target `ES2022`, module `ESNext`, JSX `react-jsx`, strict mode enabled, module resolution `bundler`.

## Project Structure

- `src/api/`: API wrappers.
- `src/auth.ts`: Supabase auth setup.
- `src/components/`: shared reusable UI.
- `src/config.ts`: app-wide env/config constants.
- `src/constants/`: shared domain constants and concept ontology.
- `src/contexts/`: React contexts.
- `src/features/`: domain-specific feature areas.
- `src/hooks/`: shared hooks.
- `src/routes/`: route definitions.
- `src/services/`: shared business services.
- `src/theme.ts`: central Mantine theme.
- `src/types/`: shared TypeScript types.
- `src/utils/`: shared utilities.

Keep files short and focused. Split large components rather than expanding them indefinitely.

## Coding Rules

General:

- Write minimal code that solves the requested problem only.
- Match existing patterns in the touched file/feature.
- Prefer built-in Vite, React, Mantine, and browser APIs over new libraries.
- Avoid speculative features, unused abstractions, unrelated refactors, mutable globals, and commented-out code.
- Delete dead code introduced by your change. Flag pre-existing dead code instead of silently removing it.
- Use TypeScript strict typing; avoid `any` unless unavoidable and explained.
- Use modern ES modules and syntax: `const`/`let`, no `var`.
- Use consistent names: components `PascalCase`; functions, variables, and hooks `camelCase`; hooks start with `use`.
- Keep imports grouped: external, internal, relative.

React:

- Use function components and hooks; no class components.
- Prefer named exports.
- Use `React.FC` only when it materially helps, such as explicit `children` typing.
- Keep presentational components free of direct API calls; put fetching/effects/state orchestration in containers/hooks/services.

Mantine and styling:

- Prefer Mantine components and layout primitives.
- Reuse `src/theme.ts`; do not create a second theme.
- Use `style`, `className`, or `classNames`. Do not use Mantine `sx`.
- Use Mantine hooks, such as `useDisclosure` or `useMantineTheme`, where they fit.
- Prefer theme tokens/CSS variables over hard-coded colors and magic numbers.
- Prefer `@tabler/icons-react` over emojis in UI.
- Add custom CSS files only when Mantine props/styles cannot handle the case cleanly.

Error handling and state:

- At API and user-input boundaries, handle errors explicitly and visibly with typed errors and Mantine UI states such as `Alert`, disabled controls, loaders, or skeletons.
- Do not swallow boundary errors or rely on `console.error` alone.
- Inside pure/internal code, avoid defensive checks for states TypeScript/framework guarantees impossible.
- Prefer local state and small custom hooks over global state. Do not add data/state libraries without a clear need.

Configuration:

- Use Vite env variables (`import.meta.env`) for API base URLs and feature flags.
- Do not hardcode environment-specific URLs, production domains, tokens, or secrets in components.
- Keep dev proxy/config in Vite or compose/task config.

## Testing and Verification

- Search for existing patterns before implementing new ones.
- For non-trivial changes, define success criteria and a verification plan.
- Test before and after changes when causality matters.
- Write focused tests for changed API clients, critical hooks/components, and domain logic.
- Use Vitest + React Testing Library; do not add heavy test frameworks.
- Run lint and build before completion when feasible.
- Keep `README.md` current for non-obvious operational or architecture changes.
