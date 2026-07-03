/**
 * Shared driver for the catalog ("browse") mode of the BuildingSelector
 * component (src/components/building-selector/). Used by the HRA step 1 and
 * the PRA manual-add drawer, which host the same component with different
 * copy (chooseLabel is "Choose this" for HRA, "Select" for PRA).
 *
 * Browse-mode selection publishes the archetype's own coordinates, so no map
 * interaction is needed to satisfy the location requirement.
 */

import { expect, type Locator, type Page } from "@playwright/test";

export async function chooseCatalogArchetype(
  page: Page,
  root: Page | Locator,
  opts: { country: string; category: string; chooseLabel: string },
): Promise<void> {
  // Filter dropdowns render their options in a body-level portal, so option
  // clicks go through `page` even when the selector lives inside a drawer.
  await root.getByPlaceholder("Country").click();
  await page.getByRole("option", { name: opts.country, exact: true }).click();

  await root.getByPlaceholder("Type").click();
  await page.getByRole("option", { name: opts.category, exact: true }).click();

  await root
    .getByRole("button", { name: opts.chooseLabel, exact: true })
    .first()
    .click();

  // Selection is confirmed asynchronously (archetype details fetch); the row
  // button flips to "Selected" once the selection has been published.
  await expect(
    root.getByRole("button", { name: "Selected", exact: true }).first(),
  ).toBeVisible();
}
