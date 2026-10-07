---
name: forecasting-simulation-debug
description: Trace a building's energy inputs, processing, and outputs through the Web UI, Forecasting API, and installed pybuildingenergy. Produce concise, self-contained result lineage with indexed evidence. Use to debug demand, consumption, or renovation savings; excludes financial and Technical API analysis.
---

# Forecasting simulation debug

Produce a self-contained walkthrough from the user's selection to the displayed
energy numbers. Follow the [report outline](references/report-outline.md).
Explain each data handoff in ordinary sentences; use tables to compare values.
Conciseness must not remove the context needed to understand a calculation.
Audit the calculation without changing application code.

## Resolve the input without changing it

Accept an exact archetype (country, category, name), a building ID with its source,
or selection requirements (location, type, period, approximate area). Resolve IDs
to actual data; do not assume a building-ID endpoint exists. Query the catalogue;
ask if multiple distinct matches remain.

**Use a selected archetype as supplied.** Requirements select a model; they do not
request edits. Approximate area, location, or construction period must not trigger
resizing, coordinate replacement, rounding, or output scaling. Record any mismatch
as selection context. Modify inputs only when explicitly requested, recording the
requested change and exact before/after values. Preserve existing edits when the
input is an explicitly supplied custom building. Do not simulate extra archetypes
or renovations unless requested.

Use the supplied local stack without rebuilding it. Keep case-specific values,
findings, and comparisons in the run evidence, never in this reusable workflow.

## Identify the three running layers

Record capture time and a compact version table:

- **Web UI:** visible build version/revision; matching checkout and dirty status.
- **Forecasting API:** installed package version, image ID/digest, source revision.
  Without a build revision, compare installed calculation-source hashes to the
  checkout; call a match source equivalence, not proven build provenance.
- **pybuildingenergy:** installed version and relevant source hashes/install
  provenance. Record numerical/calendar dependencies when they affect replay.

A repository HEAD or dependency pin alone does not establish a deployed version.
Inspect installed code and authoritative service handlers. Start with
`src/services/EnergyService.ts`, `energyUtils.ts`, `renovationEcmParams.ts`,
`src/api/forecasting.ts`, and `external-services/relife-forecasting-service/`.
Trace selection/edits through `building-selector/` and `archetypeModifier.ts`
only when relevant. Executable code takes precedence over stale comments.

## Trace the boundaries

Discover the actual flow before assigning stages or owners. For each handoff,
record the responsible component, incoming data and source, operation, outgoing
data and next consumer. Include relevant values, units, array coverage, and the
field names needed to find the data in the evidence. An input must come from an
earlier output or an explicitly identified source.

Separate these responsibilities where they occur in the inspected implementation:

1. UI selection, catalogue lookup, and simulation request. Distinguish what the
   user enters, what the UI displays, and what it actually transmits.
2. API lookup and preparation. Identify the source of geometry, system parameters,
   and defaults; show the actual changes made before calling the engine.
3. External data acquisition and schedule generation. Identify who obtains weather,
   who creates hourly schedules, and how the two are paired. Do not imply these
   arrive from the UI or API merely because the API starts the calculation.
4. Engine calculation. Explain how the inputs affect heating/cooling demand.
   Distinguish supplied fields from consumed settings. Show representative real
   heating and cooling hours when needed to make the transformation understandable.
5. API post-processing and system conversion. Separate settling-period removal,
   demand units, system losses, recovered heat, generation, and auxiliary energy.
   Include a numerical example connecting demand to fuel/electricity consumption.
6. Response and UI calculations. Name the response fields actually read, the sums
   the UI recomputes, unit conversions, scaling and rounding. Do not assign an
   operation to the API simply because the report can derive it from API data.

Attach unexpected substitutions or ignored fields to the step where they happen.
Explain their relevance and whether their numerical effect has been measured.
Show which end uses are actually calculated. For comparisons, explain the baseline
once, then identify changed inputs and the stages repeated with those changes.
Preserve weather across scenarios; do not infer causes from plausible magnitudes.

## Collect and verify evidence

Use `.work/forecasting-debug/<case>/`. Keep working captures in a temporary staging
area. The standard-library [collector](scripts/capture.py) captures the verified
ECM baseline contract; the optional window target adds a comparison:

```sh
python3 skills/forecasting-simulation-debug/scripts/capture.py \
  --base-url http://localhost:8080/api/forecasting \
  --country COUNTRY --category CATEGORY --name EXACT_ARCHETYPE \
  --output NEW_DIRECTORY
# Add --window-u TARGET_W_M2K only for a requested window comparison.
```

`--selection-area` records an approximate selection requirement without affecting
calculation. There is no automatic area scaling. For explicitly requested custom
inputs, pass `--custom-building PATH` containing validated `bui`, `system`, and
`uni11300_input_example`, plus `--change-reason`. The collector transmits those
inputs unchanged; it does not emulate geometry edits or validation.

The helper does not prove deployed versions, hidden engine inputs, or UI behavior.
For other contracts, adapt the capture from inspected source. Observe the relevant
browser request/result when claiming an actual UI observation; label source-derived
UI arithmetic as reconstructed.

When the API hides effective inputs or timestamps, capture them in an isolated
process using the installed engine. Record instrumentation and preserve external
weather responses for replay. Treat reconstruction as unverified until all relevant
hourly outputs match the API. Keep weather dates separate from profile/calendar
dates; do not infer months from an undated row index.

Verify finite values, units, coverage, warm-up removal, hourly-to-annual sums,
system conversion, and any UI scaling/rounding. Record tolerances. For comparisons,
check exact input changes and full weather parity; outdoor temperature alone does
not establish solar/wind parity. Report gaps explicitly. Keep findings limited to
those affecting this lineage, with owner, observed effect and source location.

## Deliver a small, self-contained package

Default deliverables:

- `report.md`: the complete readable result and a short resource index.
- `data/inputs.json` and `data/results.json`: reusable inputs and aggregate outputs.
  Add a monthly CSV only when verified timestamps make it useful.
- `raw/evidence.zip`: one indexed archive of the evidence needed to verify/replay
  claims: requests/responses, versions, checks, relevant source excerpts/hashes,
  and any required weather/replay script. Each entry needs a purpose and checksum.

Keep raw evidence once. Avoid duplicate hourly JSON/CSV, whole browser/network
logs, entire source trees, and overlapping narrative documents. Do not retain loose
staging files in the final case directory. Failed captures may retain their raw
receipts for diagnosis, clearly marked incomplete. Do not delete user-owned data.

The report must stand alone when copied out of the directory. Use the numbered
handoffs in the report outline, with a short case description, three-layer version
table, and useful resource index. Aggregate repetitive values without merging
unrelated facts. Explain essential terms at the step where they first matter.
Avoid chains of slashes, semicolons, arrows, unexplained abbreviations, and dense
cells containing both data and several explanations. Put explanations in short
sentences next to the values they explain. Keep technical provenance details in
the archive unless needed to understand the result; retain specific versions and
source revisions in the report. Links support explanations, never replace them.

Do not import conversational context: unnamed reported values, people, email
history, earlier attempts, or unexplained comparisons. Include an external benchmark
only if the requested analysis needs it, with its source, value, units and basis
stated inside the report. Write from the captured case, not from the chat narrative.

## Acceptance checks

Before handing off, read only the report and trace each displayed number backward.
Can the reader identify its source fields, contributing values, arithmetic, and
responsible component? Can they trace each input forward to where it is consumed,
changed, ignored, or passed through? Can they distinguish user choices, catalogue
data, external data, defaults, and computed values without opening another file?

Verify worked examples against captured outputs. A description such as "prepared
inputs become hourly demand" fails this check: explain the relevant inputs and
calculation, show real outputs, and state any part that remains unverified.
Do not invent a complete heat-loss balance from diagnostics that fail to reconcile.
Check resource links and the archive against substantive claims; remove artifacts
that support no claim or replay step.

When changing this skill/collector, run `scripts/test_capture.py` and the
skill-creator validator. Exercise native and explicitly modified inputs; verify
that an approximate requirement does not modify the archetype or scale its outputs,
and that another archetype inherits no case-specific assumptions. Validate the
workflow with a fresh local capture. Fix general workflow failures in the skill
before polishing the example report.
