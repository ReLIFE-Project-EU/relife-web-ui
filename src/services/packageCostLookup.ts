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
  applyFloorAreaModification,
  surfaceAreasFromBui,
} from "../utils/archetypeModifier";
import { getCountryDisplayName } from "../utils/countries";
import type {
  EstimatePackageCostsResult,
  IBuildingService,
  IFinancialService,
} from "./types";
import type { RenovationMeasureId } from "../types/renovation";
import type { BuildingPayload } from "../types/archetype";
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
  /**
   * Scale the archetype's envelope surfaces proportionally to `floorArea`
   * before pricing. Used when the modeled property is a share of the
   * reference building (HRA apartments), so envelope measure costs match
   * the linearly scaled energy savings instead of whole-building geometry.
   */
  scaleEnvelopeToFloorArea?: boolean;
}

export interface PackageCostLookupDeps {
  building: Pick<IBuildingService, "getArchetypeDetails">;
  financial: Pick<IFinancialService, "estimatePackageCosts">;
}

export interface PackageCostLookupFromDetailsParams {
  /** Raw building country (code or display name); resolved internally. */
  country: string | null | undefined;
  /** BUI payload providing the envelope surface areas. */
  bui: BuildingPayload;
  /** Floor area used to size HVAC/PV capacity. */
  floorArea: number | null;
  /** Package measures to price. */
  measureIds: RenovationMeasureId[];
  /** Optional evaluation horizon (years). */
  projectLifetime?: number;
}

/**
 * Resolve a renovation package's CAPEX/OPEX from EU reference data using
 * already-fetched archetype geometry. Throws on any unmet precondition
 * (unresolvable country, no priceable measures) or lookup failure so callers
 * can surface it in their own way.
 */
export async function lookupPackageCostsFromDetails(
  params: PackageCostLookupFromDetailsParams,
  deps: Pick<PackageCostLookupDeps, "financial">,
): Promise<EstimatePackageCostsResult> {
  const country = getCountryDisplayName(params.country);
  if (!country) {
    throw new Error("Cost estimate unavailable: missing building location.");
  }

  const renovationActions = buildRenovationActions({
    measureIds: params.measureIds,
    surfaceAreas: surfaceAreasFromBui(params.bui),
    floorArea: params.floorArea,
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

  const geometry = await resolveArchetypeGeometry(
    {
      archetype: params.archetype,
      floorArea: params.floorArea,
      scaleEnvelopeToFloorArea: params.scaleEnvelopeToFloorArea,
    },
    { building: deps.building },
  );

  return lookupPackageCostsFromDetails(
    {
      country,
      bui: geometry.bui,
      floorArea: geometry.floorArea,
      measureIds: params.measureIds,
      projectLifetime: params.projectLifetime,
    },
    { financial: deps.financial },
  );
}

export interface ResolvedArchetypeGeometry {
  /** Envelope geometry, scaled to the modeled floor area where requested. */
  bui: BuildingPayload;
  /** Floor area used to size HVAC/PV capacity. */
  floorArea: number;
}

/**
 * Fetch an archetype's geometry and apply the optional floor-area scaling.
 * Shared with the embodied-carbon calculation so both derive their quantities
 * from identical geometry; `getArchetypeDetails` is instance-cached, so the
 * second caller costs no extra request.
 */
export async function resolveArchetypeGeometry(
  params: {
    archetype: ArchetypeInfo;
    floorArea: number | null;
    scaleEnvelopeToFloorArea?: boolean;
  },
  deps: Pick<PackageCostLookupDeps, "building">,
): Promise<ResolvedArchetypeGeometry> {
  const details = await deps.building.getArchetypeDetails({
    category: params.archetype.category,
    country: params.archetype.country,
    name: params.archetype.name,
  });

  const scaledFloorArea =
    params.scaleEnvelopeToFloorArea &&
    typeof params.floorArea === "number" &&
    params.floorArea > 0 &&
    params.floorArea !== details.floorArea
      ? params.floorArea
      : null;

  return {
    bui:
      scaledFloorArea !== null
        ? applyFloorAreaModification(details.bui, scaledFloorArea)
        : details.bui,
    floorArea: params.floorArea ?? details.floorArea,
  };
}
