/**
 * Utility functions to modify archetype JSON payloads
 * These functions apply user-friendly modifications while preserving complex technical parameters
 */

import type {
  ArchetypeDetails,
  BuildingModifications,
  BuildingPayload,
  BuildingSurface,
  ModificationValidation,
  SystemPayload,
} from "../types/archetype";

// Re-export for convenience
export { MODIFICATION_CONSTRAINTS } from "../types/archetype";

function clonePayload<T>(payload: T): T {
  return structuredClone(payload);
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate building modifications against constraints
 */
export function validateModifications(
  modifications: BuildingModifications,
  archetypeDetails: ArchetypeDetails,
): ModificationValidation {
  const errors: ModificationValidation["errors"] = [];
  const maxFloorArea = Math.max(
    1000,
    Math.ceil(archetypeDetails.floorArea * 3),
  );
  const CONSTRAINTS = {
    floorArea: { min: 10, max: maxFloorArea },
    numberOfFloors: { min: 1, max: 20 },
    floorHeight: { min: 2, max: 6 },
    uValues: { min: 0.1, max: 5.0 },
    heatingSetpoint: { min: 15, max: 22 },
    coolingSetpoint: { min: 24, max: 30 },
  };

  const rangeChecks: {
    field:
      | "floorArea"
      | "numberOfFloors"
      | "floorHeight"
      | "wallUValue"
      | "roofUValue"
      | "windowUValue"
      | "heatingSetpoint"
      | "coolingSetpoint";
    label: string;
    unit: string;
    constraint: { min: number; max: number };
  }[] = [
    {
      field: "floorArea",
      label: "Floor area",
      unit: "m²",
      constraint: CONSTRAINTS.floorArea,
    },
    {
      field: "numberOfFloors",
      label: "Number of floors",
      unit: "",
      constraint: CONSTRAINTS.numberOfFloors,
    },
    {
      field: "floorHeight",
      label: "Floor height",
      unit: "m",
      constraint: CONSTRAINTS.floorHeight,
    },
    {
      field: "wallUValue",
      label: "Wall U-value",
      unit: "W/m²K",
      constraint: CONSTRAINTS.uValues,
    },
    {
      field: "roofUValue",
      label: "Roof U-value",
      unit: "W/m²K",
      constraint: CONSTRAINTS.uValues,
    },
    {
      field: "windowUValue",
      label: "Window U-value",
      unit: "W/m²K",
      constraint: CONSTRAINTS.uValues,
    },
    {
      field: "heatingSetpoint",
      label: "Heating setpoint",
      unit: "°C",
      constraint: CONSTRAINTS.heatingSetpoint,
    },
    {
      field: "coolingSetpoint",
      label: "Cooling setpoint",
      unit: "°C",
      constraint: CONSTRAINTS.coolingSetpoint,
    },
  ];

  for (const { field, label, unit, constraint } of rangeChecks) {
    const value = modifications[field];
    if (
      value !== undefined &&
      (value < constraint.min || value > constraint.max)
    ) {
      errors.push({
        field,
        message: `${label} must be between ${constraint.min}-${constraint.max}${
          unit ? ` ${unit}` : ""
        }`,
      });
    }
  }

  if (modifications.totalWindowArea !== undefined) {
    const wallArea = calculateTotalWallArea(archetypeDetails.bui);
    const maxWindowArea = wallArea * 0.4;

    if (modifications.totalWindowArea > maxWindowArea) {
      errors.push({
        field: "totalWindowArea",
        message: `Window area cannot exceed 40% of wall area (${maxWindowArea.toFixed(1)} m²)`,
      });
    }
  }

  if (modifications.coolingSetpoint !== undefined) {
    const heating =
      modifications.heatingSetpoint !== undefined
        ? modifications.heatingSetpoint
        : archetypeDetails.setpoints.heatingSetpoint;
    if (modifications.coolingSetpoint <= heating) {
      errors.push({
        field: "coolingSetpoint",
        message: "Cooling setpoint must be higher than heating setpoint",
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// Modification Functions
// ============================================================================

export function applyFloorAreaModification(
  bui: BuildingPayload,
  newFloorArea: number,
): BuildingPayload {
  const originalArea = bui.building.net_floor_area;
  const scaleFactor = newFloorArea / originalArea;
  const modified = clonePayload(bui);

  modified.building.net_floor_area = newFloorArea;
  modified.building_surface = modified.building_surface.map((surface) => ({
    ...surface,
    area: surface.area * scaleFactor,
  }));
  modified.building.exposed_perimeter =
    modified.building.exposed_perimeter * Math.sqrt(scaleFactor);

  return modified;
}

export function applyGeometryModification(
  bui: BuildingPayload,
  numberOfFloors?: number,
  floorHeight?: number,
): BuildingPayload {
  const modified = clonePayload(bui);

  const originalTotalHeight = bui.building.n_floors * bui.building.height;
  const newTotalHeight =
    (numberOfFloors ?? bui.building.n_floors) *
    (floorHeight ?? bui.building.height);

  if (numberOfFloors !== undefined) {
    modified.building.n_floors = numberOfFloors;
  }

  if (floorHeight !== undefined) {
    modified.building.height = floorHeight;
  }

  // Rescale vertical surfaces (walls + windows) when total building height changes
  if (originalTotalHeight > 0 && newTotalHeight !== originalTotalHeight) {
    const heightScale = newTotalHeight / originalTotalHeight;
    modified.building_surface = modified.building_surface.map((surface) => {
      if (isVerticalSurface(surface)) {
        return { ...surface, area: surface.area * heightScale };
      }
      return surface;
    });
  }

  return modified;
}

export function applyThermalModification(
  bui: BuildingPayload,
  wallU?: number,
  roofU?: number,
  windowU?: number,
): BuildingPayload {
  const modified = clonePayload(bui);

  modified.building_surface = modified.building_surface.map((surface) => {
    const newSurface = { ...surface };

    if (surface.type === "opaque") {
      const name = surface.name.toLowerCase();
      if (name.includes("roof") && roofU !== undefined) {
        newSurface.u_value = roofU;
      } else if (
        (name.includes("wall") ||
          name.includes("north") ||
          name.includes("south") ||
          name.includes("east") ||
          name.includes("west")) &&
        wallU !== undefined
      ) {
        newSurface.u_value = wallU;
      }
    } else if (surface.type === "transparent" && windowU !== undefined) {
      newSurface.u_value = windowU;
    }

    return newSurface;
  });

  return modified;
}

export function applySetpointModification(
  bui: BuildingPayload,
  heatingSetpoint?: number,
  coolingSetpoint?: number,
): BuildingPayload {
  const modified = clonePayload(bui);

  if (heatingSetpoint !== undefined) {
    modified.building_parameters.temperature_setpoints.heating_setpoint =
      heatingSetpoint;
    modified.building_parameters.temperature_setpoints.heating_setback =
      heatingSetpoint - 3;
  }

  if (coolingSetpoint !== undefined) {
    modified.building_parameters.temperature_setpoints.cooling_setpoint =
      coolingSetpoint;
    modified.building_parameters.temperature_setpoints.cooling_setback =
      coolingSetpoint + 4;
  }

  return modified;
}

export function applyAllModifications(
  archetypeDetails: ArchetypeDetails,
  modifications: BuildingModifications,
): { bui: BuildingPayload; system: SystemPayload } {
  let modifiedBui = clonePayload(archetypeDetails.bui);

  if (modifications.floorArea !== undefined) {
    modifiedBui = applyFloorAreaModification(
      modifiedBui,
      modifications.floorArea,
    );
  }

  if (
    modifications.numberOfFloors !== undefined ||
    modifications.floorHeight !== undefined
  ) {
    modifiedBui = applyGeometryModification(
      modifiedBui,
      modifications.numberOfFloors,
      modifications.floorHeight,
    );
  }

  if (
    modifications.wallUValue !== undefined ||
    modifications.roofUValue !== undefined ||
    modifications.windowUValue !== undefined
  ) {
    modifiedBui = applyThermalModification(
      modifiedBui,
      modifications.wallUValue,
      modifications.roofUValue,
      modifications.windowUValue,
    );
  }

  if (
    modifications.heatingSetpoint !== undefined ||
    modifications.coolingSetpoint !== undefined
  ) {
    modifiedBui = applySetpointModification(
      modifiedBui,
      modifications.heatingSetpoint,
      modifications.coolingSetpoint,
    );
  }

  const modifiedSystem = clonePayload(archetypeDetails.system);

  return {
    bui: modifiedBui,
    system: modifiedSystem,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function isVerticalSurface(surface: BuildingSurface): boolean {
  const name = surface.name.toLowerCase();
  if (surface.type === "transparent") return true;
  return (
    surface.type === "opaque" &&
    !name.includes("roof") &&
    !name.includes("slab") &&
    !name.includes("ground")
  );
}

/**
 * A near-zero sky-view factor marks a ground-contact (slab/floor) surface: it
 * sees no sky. Mirrors the forecasting backend, which classifies ground slabs by
 * `sky_view_factor` in addition to name, so floor surfaces whose name does not
 * contain "slab"/"ground" are still detected. Vertical walls have a meaningfully
 * higher sky-view factor and are unaffected.
 */
const GROUND_SKY_VIEW_FACTOR_MAX = 0.01;

export type EnvelopeElement = "wall" | "roof" | "floor" | "window";

export interface EnvelopeElementGeometry {
  areaM2: number;
  /**
   * Area-weighted mean U-value (W/m²K) across the element's surfaces, or null
   * when the building has none of that element.
   */
  uValue: number | null;
}

/**
 * Classify a surface into an envelope element, reusing the same conventions as
 * the modification helpers: transparent surfaces are windows; opaque surfaces
 * are roof (by name), floor (by name or near-zero sky-view factor), otherwise
 * wall.
 */
function classifyEnvelopeSurface(surface: BuildingSurface): EnvelopeElement {
  if (surface.type === "transparent") return "window";

  const name = surface.name.toLowerCase();
  if (name.includes("roof")) return "roof";
  if (
    name.includes("slab") ||
    name.includes("ground") ||
    surface.sky_view_factor <= GROUND_SKY_VIEW_FACTOR_MAX
  ) {
    return "floor";
  }
  return "wall";
}

/**
 * Aggregate the building's surfaces into per-element area and area-weighted
 * U-value. The U-values let callers work out how much thermal resistance a
 * renovation has to add to reach a target U, which is what the embodied-carbon
 * calculation uses to pick an insulation thickness.
 */
export function envelopeElementsFromBui(
  bui: BuildingPayload,
): Record<EnvelopeElement, EnvelopeElementGeometry> {
  const totals: Record<EnvelopeElement, { areaM2: number; uArea: number }> = {
    wall: { areaM2: 0, uArea: 0 },
    roof: { areaM2: 0, uArea: 0 },
    floor: { areaM2: 0, uArea: 0 },
    window: { areaM2: 0, uArea: 0 },
  };

  for (const surface of bui.building_surface) {
    const element = totals[classifyEnvelopeSurface(surface)];
    element.areaM2 += surface.area;
    element.uArea += surface.u_value * surface.area;
  }

  const toGeometry = (t: {
    areaM2: number;
    uArea: number;
  }): EnvelopeElementGeometry => ({
    areaM2: t.areaM2,
    uValue: t.areaM2 > 0 ? t.uArea / t.areaM2 : null,
  });

  return {
    wall: toGeometry(totals.wall),
    roof: toGeometry(totals.roof),
    floor: toGeometry(totals.floor),
    window: toGeometry(totals.window),
  };
}

/** Sum the building's surface areas (m²) by envelope element. */
export function surfaceAreasFromBui(bui: BuildingPayload): {
  wallM2: number;
  roofM2: number;
  floorM2: number;
  windowM2: number;
} {
  const elements = envelopeElementsFromBui(bui);
  return {
    wallM2: elements.wall.areaM2,
    roofM2: elements.roof.areaM2,
    floorM2: elements.floor.areaM2,
    windowM2: elements.window.areaM2,
  };
}

function calculateTotalWallArea(bui: BuildingPayload): number {
  return surfaceAreasFromBui(bui).wallM2;
}

export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
