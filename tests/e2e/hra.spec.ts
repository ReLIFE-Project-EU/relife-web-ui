/**
 * HRA (Home Renovation Assistant) browser journey.
 *
 * Follows the wizard the way a homeowner would: pick a reference building
 * from the catalog, review the energy estimate, select renovation measures
 * and a package, and read the results. Requires the backend Docker stack
 * (`task up-local`). See tests/e2e/README.md.
 */

import { expect, test } from "@playwright/test";
import { captureRunArtifacts, expectCleanAuditRun } from "./helpers/artifacts";
import { chooseCatalogArchetype } from "./helpers/buildingSelector";

// Italy is the ARV model's anchor EPC scale in the financial service (its
// class labels map 1:1), so the full pipeline including /financial/arv works.
// Greece — the retired integration fixtures' archetype — is known-broken
// upstream for ARV: arv.py borrows Italy's Latin-lettered consumption
// thresholds but maps Greece with Greek-lettered keys, so every Greek ARV
// request 400s and would trip the zero-error audit gate.
const BUILDING = { country: "Italy", category: "Single Family House" };

test("homeowner completes the HRA journey with plausible results", async ({
  page,
}) => {
  await page.goto("/home-assistant/tool");

  // ── Step 1: Building Information ──────────────────────────────────────
  // The HRA selector starts in map mode; the catalog path is deterministic.
  await page.getByText("From catalog", { exact: true }).click();
  await chooseCatalogArchetype(page, page, {
    ...BUILDING,
    chooseLabel: "Choose this",
  });

  const estimateButton = page.getByRole("button", {
    name: "Show my energy profile",
  });
  await expect(estimateButton).toBeEnabled();
  await estimateButton.click();

  // ── Step 2: Energy & Renovation ───────────────────────────────────────
  // EPC estimation runs a building simulation on the forecasting service.
  await expect(
    page.getByRole("heading", { name: "Energy Results & Renovation Options" }),
  ).toBeVisible({ timeout: 180_000 });

  // One envelope measure and one system measure.
  await page.getByRole("button", { name: /Wall Insulation/ }).click();
  await page.getByRole("button", { name: /Air-Water Heat Pump/ }).click();

  // Select the first two suggested packages; their CAPEX/OPEX are then
  // auto-estimated from EU reference data. Two packages are required for the
  // MCDA ranking to run at all — ResultsStep only auto-ranks with at least
  // two eligible scenarios. After a click the button flips to "Remove", so
  // .first() resolves to the next remaining "Select" button.
  const selectButtons = page.getByRole("button", {
    name: "Select",
    exact: true,
  });
  await selectButtons.first().click();
  await selectButtons.first().click();

  // The compare button enables once cost estimation has filled the
  // package's financial inputs.
  const compareButton = page.getByRole("button", {
    name: "Compare renovation options",
  });
  await expect(compareButton).toBeEnabled({ timeout: 120_000 });
  await compareButton.click();

  // ── Step 3: Results ───────────────────────────────────────────────────
  // Scenario evaluation chains ECM simulations, financial analysis and
  // MCDA ranking — the slowest part of the journey.
  await expect(
    page.getByRole("heading", { name: "Your renovation results" }),
  ).toBeVisible({ timeout: 480_000 });

  // The MCDA ranking runs client-side *after* the results step renders
  // (ResultsStep's auto-rank effect calls the technical service). Wait for
  // the recommendation band to show a score — i.e. ranking finished — so the
  // audit trace contains mcda.rank.end before we capture it.
  await expect(page.getByText(/Score \d/).first()).toBeVisible({
    timeout: 120_000,
  });

  // ── Audit trace gates + artifact handoff ──────────────────────────────
  const events = await captureRunArtifacts(page, "hra");
  expectCleanAuditRun(events, "hra", [
    "pipeline.run.start",
    "energy.estimate.end",
    "renovation.evaluate.end",
    "financial.run.end",
    "mcda.rank.end",
  ]);
});
