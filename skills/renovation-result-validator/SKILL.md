---
name: renovation-result-validator
description: >
  Domain-expert auditor for HRA, PRA, and RSE tool results. Accepts structured
  inputs/outputs, screenshots, or E2E audit artifacts and validates
  computational correctness of financial indicators, energy simulations, MCDA
  rankings, ARV predictions, and RSE strategy rankings. Actively reads frontend
  service code and backend API implementations to trace data transformations
  and identify root causes of anomalies. Triggered manually when verifying
  tool results.
---

# Renovation Result Validator

## Purpose

Audit the correctness and plausibility of computed results from the **HRA**
(Home Renovation Assistant), **PRA** (Portfolio Renovation Advisor), and
**RSE** (Renovation Strategy Explorer) tools. This skill transforms the agent
into an active code archaeologist that reads implementation code across the UI
and backend services to trace how inputs become outputs, then validates
whether those outputs are mathematically, logically, and procedurally
justified.

## Trigger

**Manual only.** The user explicitly requests validation of HRA, PRA, or RSE
results — typically after a manual tool run or a browser E2E run
(`task test-e2e`).

## Input Formats

1. **Structured data**: JSON, TypeScript objects, CSV tables, or any tabular
   representation containing identifiable HRA/PRA/RSE input parameters and
   output values.
2. **Screenshots**: Web application screenshots showing inputs and outputs.
   When screenshots are provided, extract every visible number, label, unit,
   and chart value. Reconstruct the tool context (HRA/PRA/RSE, which
   step/screen). Map visible values to known input/output schema fields (from
   `src/types/`). Apply the same audit protocol as structured data. Explicitly
   mark any values that could not be extracted with certainty.
3. **E2E audit artifacts**: The browser E2E suite (`tests/e2e/`) persists one
   artifact set per tool under `.work/e2e/artifacts/<tool>/` (`<tool>` is
   `hra`, `pra`, or `rse`):
   - `audit.json` — the full structured audit trace: an array of `AuditEvent`
     objects (`src/utils/auditLogger.ts`) with `ts`, `level`, `category`,
     `event`, `scope`, `runId`, optional `buildingId`/`scenarioId`, and a
     sanitized `data` payload.
   - `results.png` — full-page screenshot of the tool's results step. Treat it
     as a Screenshot input (format 2).
   - `meta.json` — capture timestamp, git SHA, and event count. Verify the git
     SHA matches the checked-out code before tracing; a mismatch means the
     trace may not correspond to the current implementation.

   How to read `audit.json`:
   - Select the run: filter events by `scope` (tool) and take the latest
     `runId`. PRA runs fan out per building — correlate with `buildingId`
     (and `scenarioId` for per-scenario financial events).
   - `info` events mark pipeline stage boundaries with summary outputs (e.g.
     `energy.estimate.end`, `portfolio.building.end`, `rse.workflow.end`) —
     use them to reconstruct the Pipeline Execution Trace.
   - `debug` events carry full request/response payloads and intermediate
     transformations (e.g. `financial.arv.request`, `mcda.criteria.matrix`,
     `renovation.ecm.scaling`, `rse.workflow.rankings`) — use them as the
     observed values for computation path traces.
   - `warn` events flag fallbacks (`energy.archetype.fallback`,
     `financial.risk.skipped`) — each one belongs in Input Quality Assessment
     or Known Disharmonies.
   - `error` events (`api.error`, `portfolio.building.error`) indicate a
     failed pipeline; report them before attempting numeric validation.

### E2E Handoff Workflow

The intended loop: run `task test-e2e` (brings up the Docker stack, drives
the three tool journeys in a real browser, writes the artifact sets), then
invoke this skill on `.work/e2e/artifacts/`. The E2E specs only gate on
coarse structural checks (flow completed, no audit `error` events, non-empty
results); numeric plausibility is this skill's job.

---

## Core Mandate

### First Action (NON-NEGOTIABLE)

Before making any judgment about correctness, the agent MUST read the actual
implementation code. The agent's existing knowledge of ReLIFE is secondary to
what the code actually does. Every validation step below begins with a read
instruction; this is mandatory, not optional.

### Source-of-Truth Hierarchy

1. Service implementation code (route handlers, models, business logic)
2. E2E audit artifacts (`.work/e2e/artifacts/`) and specs (`tests/e2e/`)
3. Running stack behavior (`task up` / Docker Compose)
4. Frontend service code (`src/services/`, `src/features/*/services/`)
5. Frontend utility functions (`src/utils/`)
6. Type definitions (`src/types/`)
7. D3.2 documentation (`D32_WEB_UI_GUIDANCE.md`)
8. This skill's methodology

### Rule: No Hardcoded Knowledge

This skill provides a discovery protocol, not a knowledge base. If the agent
finds that the code differs from what the skill describes, the **CODE WINS**.
The agent must report such discrepancies in the audit report under a dedicated
"Skill-Codebase Discrepancies" section.

### Rule: Never Assume

- Never assume a value based on memory of past sessions or training data.
- Never assume a constant's value (read the file).
- Never assume a formula's implementation (read the function).
- Never assume which service is active (read the context/service injection).

---

## Service Environment Detection (HRA / PRA)

Before auditing HRA or PRA results, determine which service implementations
are in use. This section does not apply to RSE — see the RSE Audit Protocol
for its environment notes.

### Step 1: Locate Service Injection Points

Read the provider file for the appropriate tool:

- **HRA**: `src/features/home-assistant/context/ServiceContext.tsx`
- **PRA**: `src/features/portfolio-advisor/context/ServiceContext.tsx`

Only use `ServiceContextDefinition.ts` to confirm the React context type. It
does not instantiate concrete services.

Identify which concrete service classes are instantiated (real vs. mock).
Also check whether the provider accepts injected `services` props; if so, note
that tests or specialized flows can override the default bundle.

### Step 2: Check the Financial Service Output Level

Read the `FinancialService` constructor call to identify the `output_level`
parameter.

- `"private"` → HRA mode (basic metrics)
- `"professional"` → PRA mode (detailed analysis with percentiles)
- `"public"` or `"complete"` → extended outputs

This determines which fields will be available in the API response.

### Step 3: Locate Backend Service Source

Check for local clones:

- `external-services/relife-financial-service/`
- `external-services/relife-forecasting-service/`
- `external-services/relife-technical-service/`

If absent, note that backend-level validation will be limited to probabilistic
reasoning. The upstream GitHub URLs are in `AGENTS.md` § Backend API contracts.

### Step 4: Determine MCDA Execution Path

Read the MCDA service implementation used by the tool:

- **TechnicalMCDAService** (default backend TOPSIS API) → `src/services/TechnicalMCDAService.ts`
- **Custom injected service** → trace the `IHomeAssistantServices.mcda` implementation from the provider or test injection site

Use the concrete implementation to determine the algorithm, normalization, and
mapping strategy. The default application path is the Technical service.

---

## Audit Depth Selection

Use the smallest audit depth that can answer the user's question. Escalate from
Quick to Deep when the observed values are anomalous, when root cause matters,
or when the user asks for a full validation.

### Quick Audit

Use for one screenshot, one scenario, or a small set of visible metrics.

1. Read service environment files and identify active service classes.
2. Locate the display component for each visible value with `rg`.
3. Trace each displayed value back one layer at a time until reaching the API
   response, frontend utility, or service method that produced it.
4. Apply only the relevant mathematical sanity checks.
5. Report uncertainty clearly if backend source or request payloads were not
   inspected.

### Deep Audit

Use for full HRA/PRA result validation, suspected regressions, portfolio
analysis, or any case where the user needs root cause evidence.

1. Complete Service Environment Detection.
2. Complete the relevant HRA or PRA protocol below.
3. Inspect backend implementation code when available.
4. Trace every audited output from input source through display formatting.
5. Produce the full report structure.

---

## HRA Audit Protocol

Each step follows the pattern: **Read → Trace → Verify**.

### HRA-1: Trace the Full Pipeline Order

Read the HRA reducer or wizard flow:
`src/features/home-assistant/context/homeAssistantReducer.ts`

Verify that services are called in the documented order:

1. Building → Energy estimation (`estimateEPC`)
2. Energy estimation → Renovation evaluation (`evaluateScenarios`)
3. Renovation scenarios → Financial calculation (`calculateForAllScenarios`)
4. Financial results + scenarios → MCDA ranking (`rank`)

Any deviation from this order may indicate missing or corrupted data.

### HRA-2: Trace Energy Estimation

Read the `EnergyService` implementation:
`src/services/EnergyService.ts`

Answer these questions by reading the code (not assuming):

- How is the archetype resolved? Is there a fallback chain (selected → matching → climate region)?
- What building parameters are sent to the Forecasting API?
- How is the area scale factor computed? What is the ratio?
- Which energy values are scaled by this factor, and which are not?
- How is delivered energy extracted from the API response?
- How is EPC class derived from energy intensity? What thresholds are used?
- How is annual energy cost computed? What price per kWh is applied?
- Is the energy price flat or stochastic?
- How are comfort and flexibility indices computed? Are they frontend-defined heuristics?
- Is there any PV self-consumption adjustment to delivered energy?
- Is there a validation step that modifies inputs before simulation?
- What happens if the archetype country differs from the building country?

### HRA-3: Trace Renovation Scenario Evaluation

Read the `RenovationService` implementation:
`src/services/RenovationService.ts`

Answer these questions:

- How are renovation measures mapped to ECM parameters (U-values, COP, PV config)?
- What U-value targets are applied per measure?
- What are the default system parameters (heat pump COP, PV defaults)?
- How is the ECM API response transformed into a `RenovationScenario`?
- Where does area scaling happen for renovated scenarios?
- How is delivered energy adjusted for PV self-consumption?
- What determines which package scenarios are generated from the selected measures?
- How are system-only scenarios handled differently from envelope scenarios?

### HRA-4: Trace Financial Calculation

Read the `FinancialService` implementation:
`src/services/FinancialService.ts`

Answer these questions:

- How are energy savings computed? Is it delivered energy difference, thermal needs difference, or something else?
- Is there a feature flag or constant controlling the savings semantic?
- How are funding options applied to CAPEX? (subsidy percentage? loan percentage?)
- How is the ARV request constructed? Which EPC class is used — scenario EPC or current EPC?
- What determines whether system measures use current EPC vs. scenario EPC?
- How is the risk assessment request built? Which fields are passed? What is omitted?
- When is risk assessment skipped? Is there a zero-savings check?
- How are API responses normalized? Any scale factors? Default values?
- How is cash flow data normalized? What fields are extracted and how?
- Are there frontend-side financial calculations (NPV, IRR, payback) or are all values from the API?

### HRA-5: Trace Financial Formulas (Frontend-Side)

Read the frontend financial calculation utilities:
`src/utils/financialCalculations.ts`

Answer these questions:

- What is the NPV formula? Discount rate? Summation bounds?
- What is the IRR algorithm? Tolerance? Max iterations?
- What is the simple payback formula? Guard against zero savings?
- What is the discounted payback formula? Interpolation? Max years?
- What is the ROI formula? Investment vs. total savings?
- Are any frontend calculations used in the displayed results, or are all values from the API?

### HRA-6: Trace MCDA Ranking

Read the active MCDA service (determined in Service Environment Detection).

**If backend API (TechnicalMCDAService)** → read `src/services/TechnicalMCDAService.ts`:

- How are KPI values mapped to scenario fields?
- Which fields are neutralized (set to constant or 0)?
- How are min/max bounds derived for normalization?
- Is the persona ID mapped to a profile? How?
- How are ranking eligibility and exclusion reasons determined?

**If custom injected service** → locate its `IMCDAService` implementation and
trace its scenario mapping, normalization, persona handling, ranking algorithm,
and audit output directly.

### HRA-7: Validate Specific Output Values

For each displayed output value, trace backward through the code to identify:

1. Which function produced this value?
2. What inputs went into that function?
3. Are those inputs consistent with what the user provided?
4. Is the computation itself correct given the code trace?

### HRA-8: Trace Display Formatting

For screenshots or UI-visible values, locate the component that renders the
label/value before judging the number. Start from:

- `src/features/home-assistant/components/steps/ResultsStep.tsx`
- `src/features/home-assistant/components/results/`

Use `rg` for the visible label, metric key, component name, or formatting
helper. Identify fallback precedence, rounding, unit conversion, percent
scaling, hidden null handling, and any substitution from risk point forecasts
before comparing observed and expected values.

---

## PRA Audit Protocol

PRA extends the HRA pipeline with portfolio-level aggregation. Audit HRA-2
through HRA-6 for individual building results, then apply PRA-specific checks.

### PRA-1: Trace Portfolio Analysis Service

Read the `PortfolioAnalysisService` implementation:
`src/features/portfolio-advisor/services/PortfolioAnalysisService.ts`

Answer these questions:

- How are `PRABuilding` objects converted to `BuildingInfo`?
- What fields are mapped? What defaults are applied?
- How is CAPEX resolved? Per-building override? Global override? Null?
- Is there concurrency control? How are errors handled?
- Do individual building failures affect portfolio-level aggregations?
- How are financial results enhanced for professional output? (probabilities? charts?)

### PRA-2: Trace Portfolio Aggregation

Read the component that displays portfolio-level metrics:
`src/features/portfolio-advisor/components/steps/ResultsStep.tsx`

Answer these questions:

- How are average NPV, average ROI, and total metrics computed?
- Are they simple averages or weighted (by floor area? investment? energy?)
- Are buildings with error status excluded from averages? Silent or visible?
- How are percentile distributions aggregated across buildings?
- How are displayed values rounded, converted, or replaced by fallback values?

### PRA-3: Validate Financing Scheme Application

Read the PRA constants file:
`src/features/portfolio-advisor/constants.ts`

Answer these questions:

- What financing schemes are available?
- How do they differ from HRA funding options?
- Is the scheme correctly applied to all buildings uniformly?

### PRA-4: Validate Cross-Building Statistical Consistency

For each financial indicator across all buildings:

- Are there extreme outliers? (e.g., one building with NPV 100× the mean)
- Do similar building types produce similar results? If not, why not?
- Are there buildings with zero or negative energy savings? Why?
- Do all buildings show the same EPC class? (suspicious if yes)

---

## RSE Audit Protocol

The RSE pipeline differs structurally from HRA/PRA: energy results come from a
**pre-published forecasting cache in Supabase**, not live simulations, and the
unit of analysis is the archetype × package combination aggregated over a
building stock. Service Environment Detection above does not apply — RSE has
no service injection context; its services are module-level singletons under
`src/features/strategy-explorer/services/`.

Each step follows the pattern: **Read → Trace → Verify**.

### RSE-1: Trace the Workflow Pipeline Order

Read the workflow orchestrator:
`src/features/strategy-explorer/services/rseWorkflowService.ts`

Verify the documented order:

1. Portfolio expansion (`archetypePortfolioService.expandPortfolio`)
2. Cache matrix resolution (`cacheService.resolveCacheMatrix`)
3. Cache entry normalization (`cacheService.normalizeEntry`)
4. Financial computation per combination (`computeFinancials`, bounded
   concurrency)
5. Package aggregation (`aggregatePackage`)
6. Ranking (`rankPackages`)

Combinations can drop out at stages 2–4 (`unavailableCombinations` with typed
reasons). Verify that exclusions are surfaced, not silently swallowed, and
that aggregation only covers archetypes that survived the financial stage.

### RSE-2: Trace Cache Resolution and Normalization

Read the cache service and API:
`src/features/strategy-explorer/services/rseForecastingCacheService.ts`,
`src/features/strategy-explorer/api/rseCacheApi.ts`

Answer these questions:

- Which cache version is used? Is it the published version or an explicit one?
- How is a cache entry keyed (archetype × package × schema version)?
- What validation does `normalizeEntry` apply, and which
  `RSEUnavailableReason` values exist?
- How are baseline vs. renovated energy figures extracted from the cached
  UNI 11300 payloads? What is the savings semantic (primary vs. delivered)?
- How is the carrier/source breakdown derived, and where is it consumed?

### RSE-3: Trace Financial Computation

Read: `src/features/strategy-explorer/services/rseFinancialService.ts`

Answer these questions:

- How are per-archetype savings converted to money? Which tariffs apply per
  carrier?
- Which Financial API endpoints are called, and with what `output_level`?
- When does a combination become `unavailable` (e.g. non-positive savings)?
- How do `financialAssumptions` (project lifetime, tariffs) flow in from the
  UI?

### RSE-4: Trace Aggregation and Ranking

Read: `src/features/strategy-explorer/services/rseAggregationService.ts`,
`src/features/strategy-explorer/services/rseRankingService.ts`,
`src/features/strategy-explorer/services/rsePackageCatalog.ts`

Answer these questions:

- How are per-archetype results scaled by `buildingCount` and combined into
  package aggregates?
- How does the selected goal (financial / energy / emission) change the
  ranking criteria and their direction?
- For the financial goal, how is the budget ceiling applied?
- How are CO₂ figures derived (`co2Mapper.ts`) and which method is active?
- Are packages that lost archetypes to exclusions still comparable
  head-to-head, or does partial coverage bias the ranking? Report partial
  coverage explicitly.

### RSE-5: Validate Specific Output Values

For each displayed ranking entry or aggregate metric, trace backward through
`aggregatePackage` → `normalizeEntry` → the cached payload. The audit trace
provides the observed intermediates: `rse.workflow.cache.normalized`,
`rse.workflow.aggregates`, and `rse.workflow.rankings` (debug events), plus
exclusion events (`rse.workflow.cache.unavailable`, `rse.workflow.cache.invalid`,
`rse.workflow.financial.unavailable`).

Display components live under
`src/features/strategy-explorer/components/results/`.

### RSE Sanity Checks

- Energy savings per archetype cannot exceed the archetype's baseline
  consumption; portfolio savings must equal the building-count-weighted sum
  of the included archetypes.
- Ranking scores must be finite and the ordering consistent with the goal's
  criteria direction (e.g. for the energy goal, a package strictly better on
  every criterion must not rank lower).
- CO₂ reductions must be non-negative and proportional to energy savings
  within the bounds of the carrier mix.
- A package with zero surviving archetype combinations must not appear in the
  ranking.
- Different goals should generally produce different rankings unless one
  package dominates on all criteria.

---

## Mathematical Sanity Cross-Checks

These checks apply AFTER the code trace. They are domain constraints, not
implementation-specific assertions. If a check fails, the root cause may be in
the implementation, the inputs, or the domain assumptions.

### Indicator Consistency

- If NPV > 0, IRR should be positive (the investment yields returns).
- Simple payback ≤ discounted payback (discounting delays breakeven).
- ROI and NPV should agree on direction: positive NPV → positive ROI, and vice versa.

### Bounds

- IRR for building renovations rarely exceeds 50%.
- NPV exceeding 5× CAPEX for standard energy renovations is anomalous.
- Payback period exceeding 2× project lifetime indicates negative or negligible savings.
- Energy savings cannot exceed baseline consumption.
- EPC class should not degrade after renovation (unless measures are intentionally removed).
- ARV per square meter should be within plausible regional market ranges.
- Area scale factor should be within [0.2, 5.0] for reasonable residential buildings.

### Monte Carlo / Risk

- Percentiles must be monotonically ordered: P10 ≤ P20 ≤ ... ≤ P90.
- P50 (point forecast) should be approximately central in the percentile distribution.
- Probability of NPV > 0 should correlate with the sign and magnitude of NPV.
- Wide inter-percentile ranges should correspond to high-uncertainty inputs.

### MCDA

- TOPSIS closeness scores must be in [0, 1] with higher = better.
- Rankings must be transitive (if A > B and B > C, then A > C).
- Different persona weights must produce different rankings unless all alternatives are trivially dominated or identical.
- No two alternatives should have identical scores unless they have identical criteria values or weights for distinguishing criteria are zero.

### Energy

- Energy intensity (kWh/m²/year) should be within [10, 500] for European buildings.
- Delivered energy should be consistent with the system type (heat pump COP > 1 means delivered < thermal needs; gas boiler ~0.9 efficiency means close to equal).
- PV generation (annual kWh) should be within [100, 50,000] for residential systems.
- PV self-consumption cannot exceed total delivered energy or total PV generation.

### Interpreting Sanity Checks

Treat these ranges as triage heuristics unless the check is a mathematical
identity or hard physical bound. Market-dependent values such as ARV,
payback, IRR, and NPV magnitude should usually produce `SUSPICIOUS` rather
than `INVALID` until the code trace proves a contradiction.

---

## Report Structure

Produce a structured audit report. Every anomaly must identify the ROOT CAUSE
in the data pipeline, not merely describe the symptom.

### Required Sections

```markdown
## HRA/PRA/RSE Result Validation Report

### Tool: [HRA | PRA | RSE]

### Data Source: [Structured | Screenshot | E2E artifacts]

### Audit Depth: [Quick | Deep]

### 0. Skill-Codebase Discrepancies

[Any places where the actual code differs from what this skill's protocol describes.
This section validates that the skill itself remains accurate.]

### 1. Service Environment

- **Services active**: [Real | Mock] for each service
- **Output level**: [private | professional | public | complete]
- **Backend source available**: [Yes | No] for each service
- **MCDA path**: [Frontend-local TOPSIS | Backend Technical API]

### 2. Input Quality Assessment

- Missing or null fields that trigger fallback behavior
- Contradictory or extreme input values
- Archetype country mismatches (fallback detection)

### 3. Pipeline Execution Trace

[Step-by-step: which services ran, in what order, with what inputs/outputs.
Reference specific file:line from the code that was read and traced.]

### 4. Computation Path Traces (One per output value)

For each audited output value:

**Value**: [e.g., NPV = 45,230 EUR]
**Code path**:

- Input source: [file:line]
- Transformation 1: [file:line] — [what happens]
- API call: [endpoint + request body]
- API response normalization: [file:line] — [how response is mapped]
- Display formatting: [file:line] — [any final transformations]

**Expected range**: [derived from code trace]
**Observed value**: [from the data/screenshot]
**Discrepancy**: [Yes/No + magnitude if yes]

### 5. Root Cause Analysis

For each anomaly, identify the layer where the issue originates:

| Severity | Metric | Observed | Expected | Root Cause Layer    | Evidence (file:line)                                         | Confidence |
| -------- | ------ | -------- | -------- | ------------------- | ------------------------------------------------------------ | ---------- |
| HIGH     | NPV    | 45,230€  | 8,500€   | Backend computation | `config.py:45` energy price assumption differs from frontend | 85%        |

**Root cause layer must be one of:**

- **Input validation** — user input not validated or sanitized
- **Frontend mapping** — incorrect transformation before API call
- **API layer** — wrong endpoint, wrong params, missing fields
- **Backend computation** — bug in calculation logic, incorrect assumptions
- **Backend response** — incorrect serialization, missing fields, default values
- **Frontend normalization** — incorrect mapping of API response to display
- **Display formatting** — rounding, unit conversion, or label error
- **Service dependency** — upstream service returned data that downstream service wasn't prepared for

### 6. Known Disharmonies (Expected Gaps)

[Any gaps that are expected given the current architecture, e.g.,
"Frontend uses flat pricing for EPC display, backend uses stochastic pricing.
The displayed cost will differ from financial analysis.
This is NOT a bug — it's an intentional simplification."]

### 7. Verdict

**VALID** — All outputs are consistent with inputs and code trace.
**SUSPICIOUS** — Outputs are mathematically consistent but financially/physically implausible.
**INVALID** — Outputs contradict inputs, code trace, or mathematical constraints.
[Reasoning]

### 8. Recommended Actions

[Specific, file-targeted actions: "Read X to verify Y", "Align constant Z in file A with parameter W in file B"]
```

### Confidence Scoring Guidelines

| Level   | Meaning         | Evidence Required                                       |
| ------- | --------------- | ------------------------------------------------------- |
| 90-100% | Definite bug    | Code trace + output mismatch + no plausible explanation |
| 70-89%  | High likelihood | Code trace is suspicious but edge case is possible      |
| 50-69%  | Unclear         | Insufficient context (e.g., backend source unavailable) |
| 10-49%  | Low confidence  | Mathematical oddity, likely domain-normal               |

---

## Important Constraints

- Do not implement fixes during validation. The skill's purpose is audit, not repair.
- If backend source is unavailable, explicitly mark conclusions as probabilistic.
- Never claim a finding is a "bug" with confidence < 70% unless it's a mathematical impossibility (e.g., negative area, percentile inversion).
- Always reference the specific file:line that was read for each claim.
- If the code trace contradicts the mathematical sanity checks, the code trace wins — report the discrepancy.
- This skill does not validate UI layout, colors, responsiveness, or accessibility. It validates computed values and data transformations only.
