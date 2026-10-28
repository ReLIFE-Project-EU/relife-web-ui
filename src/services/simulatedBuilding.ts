/**
 * The building Forecasting actually ran, plus the modeled home it stands for.
 *
 * EnergyService (HRA, PRA) and the RSE portfolio setup create it; energy
 * scaling, cost, carbon and the ECM request read every geometry fact from it.
 * Imports carry `.ts` extensions because the RSE cache seed script loads this
 * module under Node's type stripping.
 */

import type { BuildingPayload } from "../types/archetype";
import {
  applyFloorAreaModification,
  surfaceAreasFromBui,
} from "../utils/archetypeModifier.ts";
import { pvKwpFromRoofArea } from "./pvConfig.ts";

export interface SimulatedBuilding {
  archetype: { category: string; country: string; name: string };
  /** The BUI Forecasting ran: the catalogue one, or the validated adjusted one. */
  bui: BuildingPayload;
  /** Present for an adjusted archetype; sent with the custom ECM request. */
  adjustment?: { system: unknown; uni11300Config: unknown };
  /** Floor area of the modeled home (m²). */
  modeledFloorArea: number;
}

export function simulatedFloorArea(building: SimulatedBuilding): number {
  return building.bui.building.net_floor_area;
}

/** Modeled home floor area over simulated floor area; scales every output. */
export function energyScaleFactor(building: SimulatedBuilding): number {
  return building.modeledFloorArea / simulatedFloorArea(building);
}

/** Array covering the simulated building's whole roof, as sent to Forecasting. */
export function simulatedPvKwp(building: SimulatedBuilding): number | null {
  return pvKwpFromRoofArea(surfaceAreasFromBui(building.bui).roofM2);
}

/** The modeled home's share of the simulated array. Clamping first keeps a flat's share small. */
export function modeledPvKwp(building: SimulatedBuilding): number | null {
  const kwp = simulatedPvKwp(building);
  return kwp === null ? null : kwp * energyScaleFactor(building);
}

/**
 * Envelope and floor area that cost and carbon quantities come from, scaled by
 * the same factor as the energy results so all three describe the same home.
 */
export function envelopeForPricing(building: SimulatedBuilding): {
  bui: BuildingPayload;
  floorArea: number;
} {
  return {
    bui:
      energyScaleFactor(building) === 1
        ? building.bui
        : applyFloorAreaModification(building.bui, building.modeledFloorArea),
    floorArea: building.modeledFloorArea,
  };
}
