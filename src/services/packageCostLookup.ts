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
import type {
  EstimationResult,
  RenovationMeasureId,
} from "../types/renovation";
import type { ArchetypeDetails, BuildingPayload } from "../types/archetype";

/** The building the energy simulation ran on. */
export type SimulatedBuilding = Pick<
  EstimationResult,
  "archetype" | "archetypeFloorArea" | "modifiedBui"
>;

export interface PackageCostLookupParams {
  /** Raw building country (code or display name); resolved internally. */
  country: string | null | undefined;
  /** Estimation whose simulated building supplies the envelope. */
  estimation: SimulatedBuilding | null;
  /** Package measures to price. */
  measureIds: RenovationMeasureId[];
  /** Building floor area; falls back to the archetype's when null. */
  floorArea: number | null;
  /** PV array credited to the home (see `modeledPvKwp`). */
  pvKwp: number | null;
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
  /** Floor area used to size HVAC capacity. */
  floorArea: number | null;
  /** PV array credited to the home (see `modeledPvKwp`). */
  pvKwp: number | null;
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
    pvKwp: params.pvKwp,
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
 * Envelope surface areas come from the simulated building; HVAC capacity is
 * sized from the floor area, and PV comes from the caller.
 */
export async function lookupPackageCosts(
  params: PackageCostLookupParams,
  deps: PackageCostLookupDeps,
): Promise<EstimatePackageCostsResult> {
  const country = getCountryDisplayName(params.country);
  if (!country || !params.estimation?.archetype) {
    throw new Error(
      "Cost estimate unavailable: missing building location or archetype.",
    );
  }

  const geometry = await resolveArchetypeGeometry(
    {
      estimation: params.estimation,
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
      pvKwp: params.pvKwp,
      measureIds: params.measureIds,
      projectLifetime: params.projectLifetime,
    },
    { financial: deps.financial },
  );
}

export interface ResolvedArchetypeGeometry {
  /** Envelope geometry, scaled to the modeled floor area where requested. */
  bui: BuildingPayload;
  /** Floor area used to size HVAC capacity. */
  floorArea: number;
}

/**
 * Apply the optional floor-area scaling to already-fetched archetype geometry.
 * Callers that hold `ArchetypeDetails` (RSE expands its portfolio up front) use
 * this directly; `resolveArchetypeGeometry` resolves it from an estimation.
 */
export function scaleArchetypeGeometry(
  details: Pick<ArchetypeDetails, "bui" | "floorArea">,
  params: { floorArea: number | null; scaleEnvelopeToFloorArea?: boolean },
): ResolvedArchetypeGeometry {
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

/**
 * The simulated building's geometry with the optional floor-area scaling: the
 * adjusted BUI when the estimation has one, else the catalogue archetype.
 * Shared with the embodied-carbon calculation so both derive their quantities
 * from identical geometry; `getArchetypeDetails` is instance-cached, so the
 * second caller costs no extra request.
 */
export async function resolveArchetypeGeometry(
  params: {
    estimation: SimulatedBuilding;
    floorArea: number | null;
    scaleEnvelopeToFloorArea?: boolean;
  },
  deps: Pick<PackageCostLookupDeps, "building">,
): Promise<ResolvedArchetypeGeometry> {
  const { archetype, archetypeFloorArea, modifiedBui } = params.estimation;
  const details = modifiedBui
    ? { bui: modifiedBui as BuildingPayload, floorArea: archetypeFloorArea }
    : await deps.building.getArchetypeDetails({
        category: archetype!.category,
        country: archetype!.country,
        name: archetype!.name,
      });

  return scaleArchetypeGeometry(details, {
    floorArea: params.floorArea,
    scaleEnvelopeToFloorArea: params.scaleEnvelopeToFloorArea,
  });
}
