/**
 * Utility functions to modify archetype JSON payloads
 * These functions apply user-friendly modifications while preserving complex technical parameters
 */

import type {
  ArchetypeDetails,
  BuildingModifications,
  BuildingPayload,
  ModificationValidation,
  SystemPayload,
} from "../types/archetype";

// Re-export for convenience
export { MODIFICATION_CONSTRAINTS } from "../types/archetype";

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
  const CONSTRAINTS = {
    floorArea: { min: 10, max: 1000 },
    numberOfFloors: { min: 1, max: 20 },
    uValues: { min: 0.1, max: 5.0 },
    heatingSetpoint: { min: 15, max: 22 },
    coolingSetpoint: { min: 24, max: 30 },
  };

  if (modifications.floorArea !== undefined) {
    if (
      modifications.floorArea < CONSTRAINTS.floorArea.min ||
      modifications.floorArea > CONSTRAINTS.floorArea.max
    ) {
      errors.push({
        field: "floorArea",
        message: `Floor area must be between ${CONSTRAINTS.floorArea.min}-${CONSTRAINTS.floorArea.max} m²`,
      });
    }
  }

  if (modifications.numberOfFloors !== undefined) {
    if (
      modifications.numberOfFloors < CONSTRAINTS.numberOfFloors.min ||
      modifications.numberOfFloors > CONSTRAINTS.numberOfFloors.max
    ) {
      errors.push({
        field: "numberOfFloors",
        message: `Number of floors must be between ${CONSTRAINTS.numberOfFloors.min}-${CONSTRAINTS.numberOfFloors.max}`,
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

  if (modifications.wallUValue !== undefined) {
    if (
      modifications.wallUValue < CONSTRAINTS.uValues.min ||
      modifications.wallUValue > CONSTRAINTS.uValues.max
    ) {
      errors.push({
        field: "wallUValue",
        message: `Wall U-value must be between ${CONSTRAINTS.uValues.min}-${CONSTRAINTS.uValues.max} W/m²K`,
      });
    }
  }

  if (modifications.roofUValue !== undefined) {
    if (
      modifications.roofUValue < CONSTRAINTS.uValues.min ||
      modifications.roofUValue > CONSTRAINTS.uValues.max
    ) {
      errors.push({
        field: "roofUValue",
        message: `Roof U-value must be between ${CONSTRAINTS.uValues.min}-${CONSTRAINTS.uValues.max} W/m²K`,
      });
    }
  }

  if (modifications.windowUValue !== undefined) {
    if (
      modifications.windowUValue < CONSTRAINTS.uValues.min ||
      modifications.windowUValue > CONSTRAINTS.uValues.max
    ) {
      errors.push({
        field: "windowUValue",
        message: `Window U-value must be between ${CONSTRAINTS.uValues.min}-${CONSTRAINTS.uValues.max} W/m²K`,
      });
    }
  }

  if (modifications.heatingSetpoint !== undefined) {
    if (
      modifications.heatingSetpoint < CONSTRAINTS.heatingSetpoint.min ||
      modifications.heatingSetpoint > CONSTRAINTS.heatingSetpoint.max
    ) {
      errors.push({
        field: "heatingSetpoint",
        message: `Heating setpoint must be between ${CONSTRAINTS.heatingSetpoint.min}-${CONSTRAINTS.heatingSetpoint.max} °C`,
      });
    }
  }

  if (modifications.coolingSetpoint !== undefined) {
    if (
      modifications.coolingSetpoint < CONSTRAINTS.coolingSetpoint.min ||
      modifications.coolingSetpoint > CONSTRAINTS.coolingSetpoint.max
    ) {
      errors.push({
        field: "coolingSetpoint",
        message: `Cooling setpoint must be between ${CONSTRAINTS.coolingSetpoint.min}-${CONSTRAINTS.coolingSetpoint.max} °C`,
      });
    }

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
  const modified = JSON.parse(JSON.stringify(bui)) as BuildingPayload;

  modified.building.net_floor_area = newFloorArea;
  modified.building_surface = modified.building_surface.map((surface) => ({
    ...surface,
    area: surface.area * scaleFactor,
  }));
  modified.building.exposed_perimeter =
    modified.building.exposed_perimeter * Math.sqrt(scaleFactor);

  return modified;
}

export function applyThermalModification(
  bui: BuildingPayload,
  wallU?: number,
  roofU?: number,
  windowU?: number,
): BuildingPayload {
  const modified = JSON.parse(JSON.stringify(bui)) as BuildingPayload;

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
  const modified = JSON.parse(JSON.stringify(bui)) as BuildingPayload;

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
  let modifiedBui = JSON.parse(
    JSON.stringify(archetypeDetails.bui),
  ) as BuildingPayload;

  if (modifications.floorArea !== undefined) {
    modifiedBui = applyFloorAreaModification(
      modifiedBui,
      modifications.floorArea,
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

  const modifiedSystem = JSON.parse(
    JSON.stringify(archetypeDetails.system),
  ) as SystemPayload;

  return {
    bui: modifiedBui,
    system: modifiedSystem,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function calculateTotalWallArea(bui: BuildingPayload): number {
  return bui.building_surface
    .filter((s) => {
      const name = s.name.toLowerCase();
      return (
        s.type === "opaque" &&
        !name.includes("roof") &&
        !name.includes("slab") &&
        !name.includes("ground")
      );
    })
    .reduce((sum, surface) => sum + surface.area, 0);
}

export function extractConstructionPeriod(
  archetypeName: string,
): string | null {
  const match = archetypeName.match(/(\d{4})_(\d{4})/);
  return match ? `${match[1]}-${match[2]}` : null;
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
