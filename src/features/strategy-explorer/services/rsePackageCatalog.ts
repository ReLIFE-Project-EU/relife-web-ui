import { RSE_MVP_PACKAGE_MEASURE_IDS, type RSEPackageId } from "../constants";
import type { RSEPackageDefinition } from "../types";

/**
 * Predefined RSE package definitions.
 *
 * Each package declares its measure composition; costs are resolved per
 * archetype from EU reference data via the shared Financial lookup. The
 * catalog stays open to future user-composed packages without contract churn.
 */
export const RSE_PACKAGES: Record<RSEPackageId, RSEPackageDefinition> = {
  envelope: {
    id: "envelope",
    label: "Envelope Package",
    measureIds: [...RSE_MVP_PACKAGE_MEASURE_IDS.envelope],
  },
  "systems-heat-pump": {
    id: "systems-heat-pump",
    label: "Heat Pump Package",
    measureIds: [...RSE_MVP_PACKAGE_MEASURE_IDS["systems-heat-pump"]],
  },
  "systems-boiler": {
    id: "systems-boiler",
    label: "Condensing Boiler Package",
    measureIds: [...RSE_MVP_PACKAGE_MEASURE_IDS["systems-boiler"]],
  },
  combined: {
    id: "combined",
    label: "Combined Package",
    measureIds: [...RSE_MVP_PACKAGE_MEASURE_IDS.combined],
  },
};
