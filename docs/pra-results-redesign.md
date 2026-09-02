# PRA Results Redesign (Direction A — Grouped)

## Context

The PRA results step worked but read badly. Three complaints from the product owner:

1. The portfolio summary was a flat wall of 11 undifferentiated metric cards — no
   hierarchy, nothing to scan.
2. The per-building table was hard to compare across rows.
3. The drill-down modal was a long scroll with awkwardly wrapping labels.

A Claude Design project supplied three directions for the same three screens: **A
(grouped)**, B (verdict-first, rejected) and a recreation of the then-current UI for
before/after comparison. Direction A was built and replaces the previous results step.

This supersedes the "Step 3 — Results" section of [`pra-ui-refresh.md`](./pra-ui-refresh.md),
which describes the layout this redesign replaced. The rest of that document still stands.

The change is presentational. No backend calls, no service-layer changes, no new data and
no new state: `aggregatePortfolioPackage` and `PortfolioAnalysisService` are untouched. Every
metric shown before is still shown, and none was moved behind a click.

## Precedence

The mockup fixed layout and information hierarchy; the repository won on colour, typography
and chrome. The prototypes hard-code Mantine's resolved values (`#F8F9FA` for `gray.0`,
`16px` for `spacing.md`) because they run outside Mantine — none of those literals shipped.
The mockup's dev banner, header, navbar, footer and stepper were prototype scaffolding; the
live screen sits inside the existing `AppShell`.

## What changed

### Shared metric cards

`src/components/shared/MetricCard.tsx` and `ConceptMetricCard.tsx`. The card is now a flex
column with `mih={96}`, and the value (`fz={20}`, tabular figures) is pushed to the bottom
with `mt="auto"` so numbers line up across a grid even when labels wrap to different heights.

`prefix` moved from an inline span before the label to an uppercase eyebrow above it. Inline,
it produced "Total reduction in Annual building thermal needs (kWh thermal/year)" on one
wrapping line.

The eyebrow renders only when `prefix` is set. The handoff asked for a reserved empty line so
prefix-less cards stay aligned with their neighbours; `mih` plus `mt="auto"` already achieves
that, and every grid in the app is uniform, so the reserved line would only add dead space.

`src/components/shared/MetricEyebrow.tsx` is new: the same treatment appeared in five places,
starting with `PortfolioSummaryStrip`'s `Cell`, which now consumes it. It renders a `div`
rather than the default `<p>` because eyebrows sit inside table headers and other `Text`
nodes, where a nested `<p>` is invalid HTML.

These are shared components, so the taller card and larger value also reach HRA's
`EPCDisplay` (2 cards) and PRA's `FinancingStep` (4 cards). Accepted deliberately rather than
gating the layout behind a prop or forking a PRA-local card.

### Portfolio summary tab

`ResultsStep.tsx`. The card header carries `Total buildings` and `In these totals` as inline
stats instead of two of the metric cards, keeping the errored / rejected / not-costed badges.
The remaining nine cards split into two eyebrow-labelled groups, **Financial outcome** (5) and
**Energy & carbon** (4). The CO₂ card shows before dimmed and smaller than after, with the
unit written once.

`orDash()` still gates every optional total, so a figure no contributing building can supply
renders `—` rather than a smaller number.

### EPC distribution

`EPCDistribution.tsx` replaces the per-class table with one proportional band per state.
Segment widths are raw flex-grow factors equal to the counts.

Segments are a pale tint of the class hue with the hue as a border and a darkened hue as ink,
never a solid fill. `EPCBadge` reserves the solid badge for a real certificate and renders
simulated classes as an outline, and PRA always passes `estimated`; white on `lime.6` /
`yellow.6` also only reaches about 2:1.

`src/utils/epcUtils.ts` gained `getEPCTint`, `getEPCInk` and `getEPCColorVar`. The ink values
are literals rather than Mantine tokens because Mantine's scale does not go dark enough at the
yellow end — `yellow.9` on `yellow.0` is about 2.6:1. `tests/unit/utils/epcColors.test.ts`
holds every class at 4.5:1 or better (worst observed: 4.78:1).

A legend below the band repeats the counts as text, because a segment holding one building out
of many is too narrow for its own label.

### Per-building table

`BuildingResultsTable.tsx`. A two-tier header groups the columns into Building, Energy
performance and Financial outcome. The "Energy performance" colspan is **computed**, not
literal: the system-energy column only renders when some scenario reports `deliveredTotal`.

Units moved from the cells to a sub-line under each header, which is what lets every numeric
cell stay on one line. A rank column shows the 1-based position in the current sort, and
renumbers when the sort changes. Zebra striping gave way to hairline row borders.

NPV gained a comparison bar sized against the largest magnitude among **visible** rows, so it
rescales when the status filter changes. The cell still doubles as the error slot: a failed
row shows its truncated message there, and the bar renders only on the appraised branch.

Two width fixes the mockup did not anticipate:

- `Table.ScrollContainer minWidth` is 1040, not the mockup's 900. The mockup abbreviated its
  headers; the real screen keeps the full concept labels, and at 900 the columns compressed
  instead of scrolling.
- The EPC badge pair is pinned to `min-width: max-content`. Mantine's `Badge` label is
  `overflow: hidden`, so its min-content width is near zero and the column happily squeezed
  "~G" down to "~..". The constraint sits on the flex row, not the `<td>`: `min-width` on a
  table cell is not honoured the way it is on a block box.

### Drill-down modal

`BuildingDrillDownModal.tsx`. Width 880 with `padding={0}`, and a sticky header carrying the
verdict — lifetime NPV and payback — so it survives scrolling. Both still gate on
`availability === "appraised"` and render `—` otherwise. Moving those two figures out of the
metric grid turns the old 7-cards-in-4-columns, which left an orphan, into a clean five.

The body is three eyebrow-labelled bands: Energy & carbon impact, Professional risk analytics,
and an unlabelled `300px 1fr` split whose two columns label themselves (Probability thresholds,
Outcome distribution). Pairing those two short blocks side by side removed most of the modal's
scroll length. The cash-flow chart, cost-source alert, no-savings alert and error state are
unchanged.

The archetype meta line dropped its "Matched archetype:" prefix. `formatArchetypeName` already
returns exactly the form the design wanted (`Greece · Multi-Family House · Pre-1945`).

### Risk analytics

`FinancialRiskAnalytics.tsx`. The five `RiskRangeCard`s became five rows of one bordered grid
(`210px 1fr 96px 96px`), so values and P10/P90 bounds align vertically instead of drifting
across ten independently sized cards. The bar is the existing `RangeIndicator` with
`showLabels={false}`; the bounds moved into their own columns. Indicator colours still come
from `INDICATOR_CONFIGS`, and both fallbacks — a missing risk assessment, and an indicator
whose percentiles were not returned — are preserved.

Reusing `RangeIndicator` also sidestepped the mockup's `linear-gradient` range tracks and its
eyeballed marker positions, which were literals rather than derived from the percentiles.

## Corrections to the handoff

- It located `FinancialRiskAnalytics.tsx` under `components/shared/`. It lives in
  `features/portfolio-advisor/components/results/`.
- It stated the font stack comes from `src/index.css`. Neither `src/index.css` nor
  `src/App.css` is imported anywhere — `src/main.tsx` loads only Mantine's stylesheets — so
  both are dead Vite scaffolding and the app runs on Mantine's default font. Flagged rather
  than deleted.
- It gave A+'s border as `#2B8A3E`, which is `green.9`; `getEPCColor("A+")` is `green.8`. The
  implementation follows the function.
- It warned that e2e selectors depending on the old table header would need updating. They did
  not: `tests/e2e/pra.spec.ts` asserts only the `Portfolio Analysis Results` heading.

## Verification

`npm run typecheck`, `npm run typecheck:test`, `npm run lint`, `npm run test:unit`
(529 passing), `npm run build`, and `task test-e2e` (both HRA and PRA journeys) all pass. The
HRA journey matters here because it exercises the shared metric-card change.

Checked in the running app against the Docker stack: grouped summary with aligned values,
proportional EPC band and legend, table scrolling rather than colliding at a 1000px viewport,
sticky modal header, five-card band with no orphan, aligned risk rows, and the side-by-side
probability/histogram band.
