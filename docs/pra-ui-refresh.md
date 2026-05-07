# PRA UI Refresh — Implementation Plan

## Context

The Portfolio Renovation Advisor (PRA) at `src/features/portfolio-advisor/` is functional but its UI/UX has drifted from best practices. The user provided a Claude Design handoff bundle (4 jsx prototypes + tokens.css derived from `src/theme.ts`) prescribing a **polish-only UI refresh** of the existing 4-step wizard — no new fields, services, or state shape changes.

The design chat transcript flags six concrete pain points:

1. No portfolio context visible across steps — easy to lose the count/area/CAPEX
2. Manual-add form (1008 lines) overwhelms Step 1
3. Per-building measure overrides are hard to find
4. Cost-overrides card feels like a hack mid-flow
5. Results table is dense and not explorable (no sort/filter/drill-down/charts)
6. Empty / loading / error states are inconsistent

Goal: address these via Mantine-native components (no custom CSS file, no new dependencies) while keeping the reducer/state/services/types untouched.

## Scope decisions (confirmed with user)

- **Results** → tabs + drill-down modal + EPC distribution viz + energy before/after chart
- **Manual add** → wrap existing `ManualAddPanel` body in a right-hand Drawer
- **Buildings table** → local search + country/type filter + sortable headers (no EPC column — `PRABuilding` has no EPC field; EPC only exists post-analysis)

## Explicitly out of scope (prototype scaffolding, not production)

- Custom side nav, breadcrumb chrome, dev banner, "tweaks" panel, "Help / Save draft / Share" toolbar — the live app sits inside the existing app shell and we don't add new chrome
- Roboto fonts (`tokens.css` itself documents the live app uses `system-ui`; only branded slides opt in)
- Custom `app.css` / `tokens.css` — the codebase relies on Mantine theme + CSS variables; we use those directly
- Scenario comparison tab, save scenario, bookmark, share, export-as-JSON, "Top opportunities" preview card — not in current flow
- "Advanced overrides" U-value/fuel inputs in the building form — not in `PRABuilding` schema
- Methodology card with fabricated rows ("Output level: professional Monte Carlo", "Concurrency limit") — would require reading from new state surfaces

## Files to modify

### Step 0 — Building Portfolio

- `src/features/portfolio-advisor/components/steps/BuildingPortfolioStep.tsx` — add toolbar (TextInput search + Country Select + Type Select + sort state) and make `Table.Th` sortable for Name / Country / Type / Floor area / Construction period. **Construction period sort uses the existing string-typed `PRABuilding.constructionPeriod` field** with a deterministic ordering helper that maps the documented period labels (e.g. `"<1900" | "1900-1945" | "1946-1970" | …`) to a numeric ordinal — no numeric `year` field exists. Render `ManualAddPanel` inside a `Drawer` (Mantine `useDisclosure`) opened by an "Add building" button. Show empty-state Card when `buildings.length === 0`.
- **No EPC column / no EPC filter on Step 0.** `PRABuilding` (`context/types.ts`) has no EPC field — EPC is only produced by analysis (`BuildingAnalysisResult.estimation` / renovated scenarios). The design's mock EPC was prototype fiction; we drop it from this step.
- `src/features/portfolio-advisor/components/steps/ManualAddPanel.tsx` — accept optional `onClose` prop and call it after a successful `onAdd`. No internal-form changes. The outer `Card` wrapper becomes conditional via a `withCard?: boolean` prop (default `true`) so the drawer renders the form bare. Drawer's standard close affordances (X button, Escape, outside click via `closeOnClickOutside`) are sufficient for cancel.

### Step 1 — Energy & Renovation

- `src/features/portfolio-advisor/components/steps/EnergyRenovationStep.tsx` — calmer color treatment: stop alternating `blue / orange / green` per category, use `relife`-scale neutrals with the category label as a small eyebrow. Add small "Clear" and "Suggested package" buttons in the measures Card header. **Both dispatch the existing `SET_MEASURES` reducer action** (`SET_MEASURES([])` for Clear, `SET_MEASURES(SUGGESTED_PACKAGE)` for Suggested) — replace semantics, idempotent, and avoids the toggle-flip bug from the prototype. Move the **Cost Overrides** content into the same Card as **Project Settings**, retitled "Project settings & cost overrides". Wrap the Per-Building Measure Overrides table (`BuildingMeasuresTable`) in a Mantine `<Accordion>` (collapsed by default) so it stops competing with the measure grid.
- Suggested-package constant: add `SUGGESTED_PACKAGE: RenovationMeasureId[]` to existing `src/features/portfolio-advisor/constants.ts` (no new file). Initial set: `["wall-insulation", "roof-insulation", "windows", "air-water-heat-pump", "pv"]` — same five used by the design.

### Step 2 — Financing

- `src/features/portfolio-advisor/components/steps/FinancingStep.tsx` — re-style scheme cards to use `relife` accent (drop `teal-6` / `teal-0` hard-codes — switch to `var(--mantine-color-relife-7)` / `relife.0` per `theme.ts`). Show a small "summary" `SimpleGrid` of read-only `MetricCard`s under the loan-config card when scheme is debt: Total CAPEX (sum of building `estimatedCapex` overrides + global × buildings without override), Loan amount, Owner equity, Annual annuity. Pure derived display from existing state — no new reducer fields. Move the "Analysing portfolio…" Progress out of this step (it already shows globally on the wizard via `PortfolioAdvisor.tsx`'s top-level Progress bar; remove the duplicate in `FinancingStep`).

### Step 3 — Results

- `src/features/portfolio-advisor/components/steps/ResultsStep.tsx` — wrap content in Mantine `<Tabs>` with three tabs: **Portfolio summary**, **Per building**, **Report**.
  - **Portfolio summary**: existing 8 metric cards (re-using `MetricCard` / `ConceptMetricCard`) + two new chart Cards: `EPCShiftChart` and `EnergyChart`. Chart aggregation reads from `state.buildingResults` only.
  - **Per building**: extract the existing results `Table` into a `BuildingResultsTable` component with sortable headers and a `<Select>` status filter. Filter values match the actual `BuildingAnalysisResult.status` enum: `pending`, `running`, `success`, `error`, plus a derived `"no-savings"` predicate (locally computed: `status === "success" && (financialResults?.netPresentValue ?? 0) <= 0`). Each row becomes clickable → opens drill-down `Modal`.
  - **Report**: render the existing `Data Transparency` card content (already in `ResultsStep`) — no new methodology table.
- `src/features/portfolio-advisor/components/results/EPCShiftChart.tsx` _(new, ~80 lines)_ — pure SVG bars (before grey, after EPC color), reads aggregated `epcBefore` / `epcAfter` counts from props.
- `src/features/portfolio-advisor/components/results/EnergyChart.tsx` _(new, ~50 lines)_ — two SVG bars before/after, MWh labels.
- `src/features/portfolio-advisor/components/results/BuildingResultsTable.tsx` _(new, ~250 lines)_ — extracted from current `ResultsStep` table; adds sort + filter + row-click. Re-uses `EPCBadge`, `DeltaValue`.
- `src/features/portfolio-advisor/components/results/BuildingDrillDownModal.tsx` _(new, ~150 lines)_ — Mantine `Modal`. Reads `financialResults.riskAssessment.cashFlowData` from `BuildingAnalysisResult` (see `src/types/renovation.ts`). Both `riskAssessment` and `cashFlowData` are optional. Layout:
  1. Top metric grid (EPC arrow, energy reduction %, NPV, payback) — already-derived fields from `BuildingAnalysisResult`.
  2. Cash-flow table — derived from the parallel arrays on `CashFlowData` (`src/types/renovation.ts:325`): `years: number[]`, `annual_inflows: number[]`, `annual_outflows: number[]`, optional `annual_net_cash_flow: number[]`, optional `cumulative_cash_flow: number[]`, optional `initial_investment: number`. Render Year 0 from `initial_investment` (negative CAPEX/Investment cell) when present, then iterate the first five entries of `years[]` and read each row by index from the matching arrays. Columns: Year, CAPEX/Investment, Savings (= `annual_inflows[i]`), Net (use `annual_net_cash_flow[i]` if defined, else `annual_inflows[i] − annual_outflows[i]`), Cumulative (use `cumulative_cash_flow[i]` if defined, else running sum derived locally). Show a "+ N more" footer when `years.length > 5`. **If `riskAssessment?.cashFlowData` is missing or `years` is empty**, hide the table and render a single empty-state Alert ("Detailed cash-flow timeline not available for this building.").
  3. If `status === "error"`, hide both metric grid (where deltas would be nonsensical) and cash-flow table; show the existing user-facing error message via `ErrorAlert` only — no raw service diagnostics.

### Wizard chrome (sticky summary)

- `src/features/portfolio-advisor/components/PortfolioSummaryStrip.tsx` _(new, ~70 lines)_ — Mantine `Card` rendered just under the `Stepper` inside `PortfolioAdvisor.tsx`. Uses CSS `position: sticky; top: 96px` (matches existing `scrollMarginTop: 96` in `useWizardStepScroll`). Five cells: Buildings, Floor area, Estimated CAPEX, Project lifetime, Status. All values derive from `state.buildings` / `state.projectLifetime` / `state.isEvaluating` / `state.buildingResults`. No new state.
- `src/features/portfolio-advisor/PortfolioAdvisor.tsx` — render `PortfolioSummaryStrip` between the Progress bar and the `Stepper`. Step 0 sees a placeholder ("—") in CAPEX/area until buildings are added.

## Reuse — existing utilities & components

- `src/components/shared/StepNavigation.tsx` — keep using as the bottom Prev/Next bar (already in every step).
- `src/components/shared/EPCBadge.tsx` — used in the new EPC distribution chart and the drill-down EPC arrow (post-analysis only; not on Step 0).
- `src/components/shared/MetricCard.tsx`, `ConceptMetricCard.tsx` — used in financing summary and results metrics.
- `src/components/shared/DeltaValue.tsx` — used in results table (energy reduction column already uses it; keep).
- `src/components/shared/ErrorAlert.tsx` — already used in `FinancingStep`; thread it through tabs in Results.
- `src/utils/archetypeLabels.ts` — `countryFlag`, `countryNameToCode`, `formatArchetypeName` already used in Step 0; reused for filter labels.
- `src/utils/inputSanityChecks.ts` — `checkCapexPerSqm`, `checkAreaArchetypeMismatch` already wired; preserved.
- Mantine: `Tabs`, `Drawer`, `Modal`, `Accordion`, `useDisclosure`, `SimpleGrid`, `Group`, `Stack`, `Card`, `Table` — all already in the dep tree.

## Color strategy

The prototype's CSS variables (`--persona-finance` teal, `--persona-soft`, `--persona-ink`) map onto Mantine's `relife` scale already declared in `src/theme.ts`. We do **not** ship `tokens.css` / `app.css`; we reach for `var(--mantine-color-relife-N)` and Mantine props (`color="relife"`, `bg="relife.0"`, `c="relife.7"`) instead. EPC color tokens are already in Mantine's semantic palette via `EPCBadge.getEPCColor`.

## State / API impact

**None.** No reducer actions added, no service signatures changed, no `PRABuilding` / `BuildingAnalysisResult` field changes, no new API calls. Search / filter / sort state on Step 0 and Step 3 is local component state.

## Verification

- `npm run build` — typecheck + Vite build clean.
- `npm run lint` — ESLint clean on touched files.
- Manual smoke (unit-style not needed, no logic changes):
  1. Empty state → "Import CSV" / "Add building" CTAs visible, "Add building" opens Drawer, save closes Drawer and appends row.
  2. With buildings: search filters by name; country and type selects narrow; sortable headers toggle ↑/↓ (including Construction period using the ordinal helper).
  3. Sticky summary strip stays visible scrolling each step; "Status" badge flips from `Not started` → `In progress` → `Running…` (during analysis) → `Complete`.
  4. Step 1 measures: Suggested-package button selects 5 ids, Clear empties; per-building accordion expands the existing table; cost-override fields still validate empty → red error.
  5. Step 2 debt: loan summary metrics update with percentage / rate / duration; non-debt schemes hide the loan card; the duplicate progress bar is gone.
  6. Step 3 tabs: switching between Portfolio summary / Per building / Report works; sort by NPV desc by default; status filter narrows rows; row click opens drill-down. Cash-flow table shows up to 5 yearly rows (plus Year 0 when `initial_investment` is present) sourced from `CashFlowData` arrays — visible row count is bounded by `cashFlowData.years.length`, not by `projectLifetime`. Charts show non-zero bars when results contain renovated scenarios.
  7. `Start Over` resets state and returns to Step 0.

## D3.2 alignment note

D3.2 lists single-interface scenario comparison as a PRA requirement (UR1 / TR18-level). This refresh **preserves the current functional scope** and does **not** close that gap — scenario compare remains absent here as it is in `main` today. Flagged so reviewers don't read this plan as the comparison work item.

## Verification additions (Codex round 1)

Beyond the smoke list above, also exercise:

- Step 0 Drawer: cancel via X, Escape, and outside-click should all close cleanly without dispatching `ADD_BUILDING`. Save closes the Drawer and resets the form.
- Step 0 sort/filter persistence: filter to country=Spain, then add a new building outside Spain — the new row stays hidden until filter clears. Sort by Floor area desc, then remove the top row — sort order survives.
- Step 3 partial data: a `status === "error"` row opens drill-down → only `ErrorAlert` visible; a `success` row whose `financialResults.riskAssessment` is `undefined` shows the "timeline not available" Alert; a `success` row missing `renovated` scenario falls back gracefully (no NaN deltas in metric cards).
- Step 3 status filter: `no-savings` derived predicate matches a row whose `netPresentValue <= 0` and excludes profitable ones.

## Out-of-scope items to flag (not implemented, surfaced for reviewers)

The chat suggested but we are deliberately not adding: scenario comparison, "Save scenario" / "Save draft", "Top opportunities" preview card, JSON export, top-bar Help/Share buttons, dev banner, side nav, breadcrumbs, Roboto type. Each adds product surface that the user said is out of bounds for a UI refresh.
