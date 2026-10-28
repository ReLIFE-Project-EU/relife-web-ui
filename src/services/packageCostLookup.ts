/**
 * Shared CAPEX/OPEX reference-data lookup.
 *
 * Resolves a renovation package's costs from EU reference data via the
 * Financial lookup, given the package measures plus the building's archetype
 * geometry. Used by HRA (to pre-fill editable cost inputs), PRA (as the cost
 * fallback during portfolio analysis), and RSE (to price archetype/package
 * combinations), so the orchestration lives in one place. Callers keep their
 * own concerns around it — HRA the React effect/error-state/dispatch, PRA the
 * audit logging and provenance flags, RSE the per-combination availability
 * classification.
 */

import { buildRenovationActions } from "./renovationActions";
import {
  envelopeForPricing,
  modeledPvKwp,
  type SimulatedBuilding,
} from "./simulatedBuilding";
import { surfaceAreasFromBui } from "../utils/archetypeModifier";
import { getCountryDisplayName } from "../utils/countries";
import type { EstimatePackageCostsResult, IFinancialService } from "./types";
import type { RenovationMeasureId } from "../types/renovation";

export interface PackageCostLookupParams {
  /** Raw building country (code or display name); resolved internally. */
  country: string | null | undefined;
  /** Building whose envelope, floor area and PV share are priced. */
  simulated: SimulatedBuilding | null;
  /** Package measures to price. */
  measureIds: RenovationMeasureId[];
  /** Optional evaluation horizon (years). */
  projectLifetime?: number;
}

export interface PackageCostLookupDeps {
  financial: Pick<IFinancialService, "estimatePackageCosts">;
}

/**
 * Resolve a renovation package's CAPEX/OPEX from EU reference data. Throws on
 * any unmet precondition (missing location or building, no priceable measures)
 * or lookup failure so callers can surface it in their own way.
 *
 * Quantities come from the simulated building at the modeled home's share:
 * envelope surfaces, floor area for HVAC capacity, and the PV array.
 */
export async function lookupPackageCosts(
  params: PackageCostLookupParams,
  deps: PackageCostLookupDeps,
): Promise<EstimatePackageCostsResult> {
  const country = getCountryDisplayName(params.country);
  if (!country || !params.simulated) {
    throw new Error(
      "Cost estimate unavailable: missing building location or archetype.",
    );
  }

  const envelope = envelopeForPricing(params.simulated);
  const renovationActions = buildRenovationActions({
    measureIds: params.measureIds,
    surfaceAreas: surfaceAreasFromBui(envelope.bui),
    floorArea: envelope.floorArea,
    pvKwp: modeledPvKwp(params.simulated),
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
