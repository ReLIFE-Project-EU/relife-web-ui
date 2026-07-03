# Browser E2E Tests

Playwright journeys that drive the active HRA and PRA tool flows through a
real browser, end to end, the way a user would:

- `hra.spec.ts` — Home Renovation Assistant: catalog archetype → energy
  estimate → measures + package → results.
- `pra.spec.ts` — Portfolio Renovation Advisor: two manually added buildings →
  portfolio measures → equity financing → portfolio analysis → results.

RSE E2E coverage is deferred until the planned UX refactor.

## Prerequisites

- **Backend stack running**: `task up-local` (or `task up`). The canonical
  entry point `task test-e2e` brings the stack up first.
- **Chromium installed**: `npx playwright install chromium` (one-time).
- No login is required: the HRA and PRA tool routes are public and the local
  stack accepts unauthenticated API calls. This is also why the PRA spec adds
  buildings manually — the CSV importer reads from saved portfolios behind an
  SSO login.

## Run

```bash
task test-e2e        # stack up + HRA/PRA journeys
npm run test:e2e     # stack must already be running
npx playwright test tests/e2e/hra.spec.ts   # single journey
```

Playwright starts the Vite dev server itself (`playwright.config.ts`) with
`VITE_RELIFE_AUDIT_LOG=debug`. If you reuse an already-running dev server, it
must have been started with that flag or artifact capture fails.

The journeys exercise live backend pipelines and take several minutes each;
they run serially on purpose.

## What the specs assert (and what they don't)

Specs gate on **coarse structural checks only**: the wizard reaches the
results step, the audit trace contains the expected stage events, and no
`error`-level audit events occurred (plus per-tool basics such as all PRA
buildings completing).

Numeric plausibility (are the savings, NPV, rankings realistic?) is
deliberately **not** asserted in code. That is the job of the
`renovation-result-validator` skill, which reasons over the captured
artifacts.

## Artifacts and AI validation handoff

Each spec writes an artifact set to `.work/e2e/artifacts/<tool>/`:

| File          | Content                                                     |
| ------------- | ----------------------------------------------------------- |
| `audit.json`  | Full structured audit trace (`window.__relifeAudit.dump()`) |
| `results.png` | Full-page screenshot of the results step                    |
| `meta.json`   | Capture timestamp, git SHA, event count                     |

To validate the numbers, invoke the `renovation-result-validator` skill on
`.work/e2e/artifacts/` after a run. The skill's "E2E audit artifacts" input
format documents how the trace is interpreted.

Playwright's own run output (traces, HTML report) goes to `.work/e2e/`.

## Fixtures

The HRA and PRA specs use the Italian single-family-house archetype catalog.
Italy is the financial service's ARV anchor EPC scale (its class labels map
1:1 in `arv.py`), so the whole pipeline — including the best-effort
`/financial/arv` call — completes without error-level audit events. Greece,
the previous fixture country, is known-broken upstream for ARV: `arv.py`
borrows Italy's Latin-lettered consumption thresholds but keys Greece's
mapping with Greek letters, so every Greek ARV request 400s. Revisit only if
the Italian archetypes regress.
