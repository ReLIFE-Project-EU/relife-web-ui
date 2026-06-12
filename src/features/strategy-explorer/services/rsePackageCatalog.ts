import type { ArchetypeDetails } from "../../../types/archetype";
import { pvKwpFromFloorArea } from "../../../services/pvConfig";
import {
  RSE_MVP_COST_SOURCE_NOTE,
  RSE_MVP_MEASURE_COST_ASSUMPTIONS,
  RSE_MVP_PACKAGE_MEASURE_IDS,
  RSE_PACKAGE_IDS,
  type RSEPackageId,
} from "../constants";
import type { RSEPackageDefinition } from "../types";

/**
 * Error thrown when the package catalog cannot compute a cost because
 * required archetype data is missing or invalid.
 *
 * The `reason` field is consumed by downstream stages (S7) to classify
 * unavailable combinations.
 */
export class RSEPackageCatalogError extends Error {
  readonly reason: string;

  constructor(message: string, reason: string) {
    super(message);
    this.reason = reason;
  }
}

/**
 * Predefined RSE package definitions for the MVP.
 *
 * Each package declares its measure composition and the cost assumptions
 * that apply to each measure.  The catalog stays open to future user-
 * composed packages without contract churn.
 */
export const RSE_PACKAGES: Record<RSEPackageId, RSEPackageDefinition> =
  Object.fromEntries(
    RSE_PACKAGE_IDS.map((packageId) => {
      const measureIds = RSE_MVP_PACKAGE_MEASURE_IDS[packageId];
      const costAssumptions = measureIds
        .map((measureId) => {
          const assumption = RSE_MVP_MEASURE_COST_ASSUMPTIONS[measureId];
          if (!assumption) {
            throw new Error(
              `Missing cost assumption for measure ${measureId} in package ${packageId}`,
            );
          }
          return {
            measureId,
            capex: assumption.capex,
            annualMaintenance: assumption.annualMaintenance,
            source: "mvp-assumption" as const,
            sourceNote: RSE_MVP_COST_SOURCE_NOTE,
          };
        })
        .filter((item) => item !== undefined);

      const labels: Record<RSEPackageId, string> = {
        envelope: "Envelope Package",
        "systems-heat-pump": "Heat Pump Package",
        "systems-boiler": "Condensing Boiler Package",
        combined: "Combined Package",
      };

      return [
        packageId,
        {
          id: packageId,
          label: labels[packageId],
          measureIds: [...measureIds],
          costAssumptions,
        } as RSEPackageDefinition,
      ];
    }),
  ) as Record<RSEPackageId, RSEPackageDefinition>;

/**
 * Compute per-building CAPEX and annual maintenance for a given RSE package.
 *
 * @param packageId - One of the predefined RSE package IDs.
 * @param details - Archetype details including `floorArea`.
 * @returns `{ capexEur, annualMaintenanceEur }` for one building.
 *
 * @throws {RSEPackageCatalogError} When `floorArea` is required but null or
 *   invalid, or when `pvKwpFromFloorArea` returns null for a package
 *   containing PV.
 */
export function computePackageCost(
  packageId: RSEPackageId,
  details: ArchetypeDetails,
): { capexEur: number; annualMaintenanceEur: number } {
  const pkg = RSE_PACKAGES[packageId];

  if (!pkg) {
    throw new RSEPackageCatalogError(
      `Unknown RSE package: ${packageId}`,
      "unknown-package",
    );
  }

  let capexEur = 0;
  let annualMaintenanceEur = 0;

  for (const assumption of pkg.costAssumptions) {
    const measureCapex = resolveCost(
      assumption.capex,
      assumption.measureId,
      details,
    );
    const measureMaintenance = resolveCost(
      assumption.annualMaintenance,
      assumption.measureId,
      details,
    );

    capexEur += measureCapex;
    annualMaintenanceEur += measureMaintenance;
  }

  return { capexEur, annualMaintenanceEur };
}

function resolveCost(
  basis: { kind: string; value: number } & Record<string, unknown>,
  measureId: string,
  details: ArchetypeDetails,
): number {
  switch (basis.kind) {
    case "eur_per_m2_floor_area": {
      if (
        details.floorArea === null ||
        details.floorArea === undefined ||
        !Number.isFinite(details.floorArea) ||
        details.floorArea <= 0
      ) {
        throw new RSEPackageCatalogError(
          `Floor area is required for measure ${measureId} but is missing or invalid`,
          "missing-floor-area",
        );
      }
      return basis.value * details.floorArea;
    }

    case "eur_per_building": {
      return basis.value;
    }

    case "eur_per_kwp": {
      const pvKwp = pvKwpFromFloorArea(details.floorArea);
      if (pvKwp === null) {
        throw new RSEPackageCatalogError(
          `PV capacity could not be determined for measure ${measureId}`,
          "missing-pv-capacity",
        );
      }
      return basis.value * pvKwp;
    }

    case "eur_per_m2_surface_area": {
      throw new RSEPackageCatalogError(
        `Surface-area cost basis is not supported for MVP measure ${measureId}`,
        "unsupported-cost-basis",
      );
    }

    default: {
      throw new RSEPackageCatalogError(
        `Unknown cost basis ${basis.kind} for measure ${measureId}`,
        "unknown-cost-basis",
      );
    }
  }
}
