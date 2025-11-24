# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Tech Stack Versions

**CRITICAL**: Always verify that any proposed changes, API usage, or code examples are compatible with the exact versions listed below. Do not suggest features, APIs, or patterns from different versions.

### Core Dependencies

- **React**: `^19.2.0`
- **React DOM**: `^19.2.0`
- **TypeScript**: `~5.9.3`
- **Vite**: `^7.2.4`

### UI Framework

- **Mantine Core**: `^8.3.8`
- **Mantine Hooks**: `^8.3.8`
- **Tabler Icons React**: `^3.35.0`

### Development Tools

- **@vitejs/plugin-react**: `^5.1.1`
- **ESLint**: `^9.39.1`
- **TypeScript ESLint**: `^8.46.4`
- **Prettier**: `^3.6.2`

### TypeScript Configuration

- **Target**: `ES2022`
- **Module**: `ESNext`
- **JSX**: `react-jsx`
- **Strict mode**: Enabled
- **Module Resolution**: `bundler`

**When in doubt**, consult the official documentation for the specific versions listed above, not the latest documentation.

## Code Style

### General Principles

- **Keep it minimal**: Do not add new dependencies unless strictly necessary and clearly justified.
- **Prefer built-in features** from Vite, React, and Mantine over external libraries.
- **Use TypeScript** with strict typing (`strict: true`) and avoid `any` unless unavoidable (and document why).
- **Always prefer Mantine components and layout primitives**: Use built-in Mantine components for all UI and layout needs. Custom CSS should only be used as a last resort when Mantine does not provide a clean, comparable solution.

### Project Structure

- Use a **feature-oriented structure**, e.g.:
  - `src/components/` – reusable UI components
  - `src/features/` – domain-specific features/pages
  - `src/api/` – API client and types
  - `src/hooks/` – shared hooks
  - `src/styles/` – global theme and styles

- Keep files **short and focused**; split components when they grow too large or complex.

### React & JSX

- Use **function components** and **React hooks**; do not use class components.
- Use **named exports** for components and functions (`export const MyComponent = ...`).
- Use **React.FC** only when needed for props like `children`; otherwise prefer plain function types.
- Keep components **presentational or container-style**:
  - Presentational components: UI, no direct API calls.
  - Container components/hooks: data fetching, side effects, state.

### Mantine

- Use Mantine components for layout and UI (e.g. `AppShell`, `Stack`, `Group`, `Button`, `TextInput`).
- Configure a **central Mantine theme** (colors, fonts, radius) in a single `theme` file and reuse it.
- Avoid custom CSS where Mantine props or `sx` can achieve the same result.
- Use **Mantine hooks** (e.g. `useDisclosure`, `useMantineTheme`) where appropriate instead of adding utility libraries.

### Styling

- Prefer **Mantine props and `sx`** for styling over global CSS.
- Use CSS variables or Mantine theme tokens for colors and spacing; avoid hard-coded values (magic numbers).
- Keep consistent spacing & typography using the theme scale.
- **Avoid emojis** in UI code; prefer native icon libraries (e.g. `@tabler/icons-react`) that are already included as dependencies.

### Error Handling & UX

- Handle API errors in the API client and return **typed error objects** or throw typed errors.
- Show user-facing error states with Mantine components (e.g. `Alert`), not `alert()` or console-only errors.
- Provide simple **loading states** using Mantine (`Loader`, skeletons, disabled buttons).

### State & Data Fetching

- Prefer **local component state and small custom hooks** over global state unless truly necessary.
- If you introduce a state or data-fetching library, it must be:
  - Justified by a clear need (e.g. caching, invalidation, complex state).
  - Consistent with the “minimal dependencies” guideline.

### Configuration & Environment

- Use **Vite environment variables** (`import.meta.env`) for configuration (API base URL, feature flags).
- Do not hardcode environment-specific URLs (`localhost`, production domains) inside components.
- Keep any dev-only config (e.g. proxy settings) in Vite config files.

### Testing & Quality

- Write **small, focused tests** for:
  - API client functions.
  - Critical UI components and hooks.

- Prefer **simple testing setups** (e.g. React Testing Library + Vitest/Jest if already included) and avoid heavy testing frameworks unless required.

### Code Style Essentials

- Use **consistent naming**:
  - Components: `PascalCase`
  - Functions, variables, hooks: `camelCase`
  - Hooks: `useSomething`

- Use ES modules and modern syntax:
  - `const` / `let` (no `var`)
  - Arrow functions for callbacks and small utilities.

- Keep imports **sorted and grouped**:
  - External libraries
  - Internal modules
  - Local-relative imports

- Avoid dead code, unused imports, and commented-out blocks—delete them instead.
