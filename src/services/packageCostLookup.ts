/**
 * Shared CAPEX/OPEX reference-data lookup.
 *
 * Resolves a renovation package's costs from EU reference data via the
 * Financial lookup, given the package measures plus the building's archetype
 * geometry. Used by HRA (to pre-fill editable cost inputs) and PRA (as the
 * cost fallback during portfolio analysis), so the orchestration lives in one
 * place. Callers keep their own concerns around it — HRA the React
 * effect/error-state/dispatch, PRA the audit logging and provenance flags.
 */

import { buildRenovationActions } from "./renovationActions";
import { surfaceAreasFromBui } from "../utils/archetypeModifier";
import { getCountryDisplayName } from "../utils/countries";
import type {
  EstimatePackageCostsResult,
  IBuildingService,
  IFinancialService,
} from "./types";
import type { RenovationMeasureId } from "../types/renovation";
import type { ArchetypeInfo } from "../types/forecasting";

export interface PackageCostLookupParams {
  /** Raw building country (code or display name); resolved internally. */
  country: string | null | undefined;
  /** Resolved archetype to read envelope geometry from. */
  archetype: ArchetypeInfo | undefined;
  /** Package measures to price. */
  measureIds: RenovationMeasureId[];
  /** Building floor area; falls back to the archetype's when null. */
  floorArea: number | null;
  /** Optional evaluation horizon (years). */
  projectLifetime?: number;
}

export interface PackageCostLookupDeps {
  building: Pick<IBuildingService, "getArchetypeDetails">;
  financial: Pick<IFinancialService, "estimatePackageCosts">;
}

/**
 * Resolve a renovation package's CAPEX/OPEX from EU reference data. Throws on
 * any unmet precondition (missing location/archetype, no priceable measures)
 * or lookup failure so callers can surface it in their own way.
 *
 * Envelope surface areas come from the archetype BUI; HVAC/PV capacity is sized
 * from the floor area. Per-building modifications that change envelope geometry
 * are not reflected here.
 */
export async function lookupPackageCosts(
  params: PackageCostLookupParams,
  deps: PackageCostLookupDeps,
): Promise<EstimatePackageCostsResult> {
  const country = getCountryDisplayName(params.country);
  if (!country || !params.archetype) {
    throw new Error(
      "Cost estimate unavailable: missing building location or archetype.",
    );
  }

  const details = await deps.building.getArchetypeDetails({
    category: params.archetype.category,
    country: params.archetype.country,
    name: params.archetype.name,
  });

  const renovationActions = buildRenovationActions({
    measureIds: params.measureIds,
    surfaceAreas: surfaceAreasFromBui(details.bui),
    floorArea: params.floorArea ?? details.floorArea,
  });
  if (renovationActions.length === 0) {
    throw new Error("No priceable measures in this package.");
  }

  return deps.financial.estimatePackageCosts({
    country,
    renovationActions,
    projectLifetime: params.projectLifetime,
  });
}
