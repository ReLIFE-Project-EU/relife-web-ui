/**
 * PRA (Portfolio Renovation Advisor) browser journey.
 *
 * Follows the wizard the way a portfolio manager would: add buildings via
 * the manual-add drawer, select portfolio-wide measures, keep the default
 * equity financing, run the analysis and read the portfolio results.
 *
 * Buildings are added manually rather than via CSV because the CSV importer
 * reads from saved portfolios in Supabase behind an SSO login — there is no
 * anonymous file-upload path. Requires the backend Docker stack
 * (`task up-local`). See tests/e2e/README.md.
 */

import { expect, test } from "@playwright/test";
import { captureRunArtifacts, expectCleanAuditRun } from "./helpers/artifacts";
import { chooseCatalogArchetype } from "./helpers/buildingSelector";

// Italy: ARV-safe fixture country (see the note in hra.spec.ts).
const BUILDING = { country: "Italy", category: "Single Family House" };
const BUILDING_NAMES = ["E2E Building A", "E2E Building B"];

test("portfolio manager completes the PRA journey with plausible results", async ({
  page,
}) => {
  // Two buildings run the full pipeline each; allow more than the default.
  test.setTimeout(900_000);

  await page.goto("/portfolio-advisor/tool");

  // ── Step 1: Building Portfolio ────────────────────────────────────────
  for (const name of BUILDING_NAMES) {
    await page
      .getByRole("button", { name: "Add building", exact: true })
      .first()
      .click();

    const drawer = page.getByRole("dialog");
    await drawer.getByLabel("Building name").fill(name);
    await chooseCatalogArchetype(page, drawer, {
      ...BUILDING,
      chooseLabel: "Select",
    });
    await drawer
      .getByRole("button", { name: "Add Building", exact: true })
      .click();
    await expect(drawer).toBeHidden();
  }

  // exact: true — the substring would also match the "Showing 2 of 2
  // buildings" list caption and trip strict mode.
  await expect(page.getByText("2 buildings", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Choose renovation measures" })
    .click();

  // ── Step 2: Energy & Renovation Options ───────────────────────────────
  await expect(
    page.getByRole("heading", { name: "Energy & Renovation Options" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Wall Insulation/ }).click();
  await page.getByRole("button", { name: /Air-Water Heat Pump/ }).click();
  await page.getByRole("button", { name: "Configure financing" }).click();

  // ── Step 3: Financing (equity is preselected) ─────────────────────────
  await expect(
    page.getByRole("heading", { name: "Financing Configuration" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Analyse portfolio" }).click();

  // ── Step 4: Results ───────────────────────────────────────────────────
  await expect(
    page.getByRole("heading", { name: "Portfolio Analysis Results" }),
  ).toBeVisible({ timeout: 720_000 });

  // ── Audit trace gates + artifact handoff ──────────────────────────────
  const events = await captureRunArtifacts(page, "pra");
  const run = expectCleanAuditRun(events, "pra", [
    "portfolio.run.start",
    "portfolio.run.end",
  ]);

  // Every building must have completed its pipeline without being rejected.
  const completed = run.filter(
    (event) => event.event === "portfolio.building.end",
  );
  expect(completed.length).toBe(BUILDING_NAMES.length);
  const rejected = run.filter(
    (event) => event.event === "portfolio.building.rejected",
  );
  expect(rejected).toEqual([]);
});
