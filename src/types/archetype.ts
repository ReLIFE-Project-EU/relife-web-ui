/**
 * Archetype-related types for building selection and modification
 */

import type { ArchetypeInfo } from "./forecasting";

// ============================================================================
// Archetype Details (from POST /building?archetype=true)
// ============================================================================

/**
 * Thermal properties summary from archetype
 */
export interface ArchetypeThermalProperties {
  wallUValue: number; // W/m²K
  roofUValue: number; // W/m²K
  windowUValue: number; // W/m²K
}

/**
 * Temperature setpoints from archetype
 */
export interface ArchetypeSetpoints {
  heatingSetpoint: number; // °C
  heatingSetback: number; // °C
  coolingSetpoint: number; // °C
  coolingSetback: number; // °C
}

/**
 * High-level summary of archetype for UI display
 */
export interface ArchetypeDetails extends ArchetypeInfo {
  floorArea: number; // m²
  numberOfFloors: number;
  buildingHeight: number; // m
  totalWindowArea: number; // m²
  thermalProperties: ArchetypeThermalProperties;
  setpoints: ArchetypeSetpoints;
  location: {
    lat: number;
    lng: number;
  };
  // Full BUI and System payloads for modification
  bui: BuildingPayload;
  system: SystemPayload;
}

/**
 * Building payload structure (simplified - actual structure is complex)
 */
export interface BuildingPayload {
  building: {
    name: string;
    latitude: number;
    longitude: number;
    net_floor_area: number;
    n_floors: number;
    height: number;
    exposed_perimeter: number;
    wall_thickness: number;
    building_type_class: string;
    construction_class: string;
    [key: string]: unknown;
  };
  building_surface: BuildingSurface[];
  building_parameters: {
    temperature_setpoints: {
      heating_setpoint: number;
      heating_setback: number;
      cooling_setpoint: number;
      cooling_setback: number;
      units: string;
    };
    system_capacities: {
      heating_capacity: number;
      cooling_capacity: number;
      units: string;
    };
    airflow_rates: {
      infiltration_rate: number;
      units: string;
    };
    internal_gains: InternalGain[];
    [key: string]: unknown;
  };
  units: Record<string, string>;
}

/**
 * Building surface (wall, roof, window, etc.)
 */
export interface BuildingSurface {
  name: string;
  type: "opaque" | "transparent";
  area: number;
  u_value: number;
  sky_view_factor: number;
  orientation: {
    azimuth: number; // 0=N, 90=E, 180=S, 270=W
    tilt: number; // 0=horizontal, 90=vertical
  };
  // Opaque-specific
  solar_absorptance?: number;
  thermal_capacity?: number;
  // Transparent-specific
  g_value?: number;
  height?: number;
  width?: number;
  parapet?: number;
  shading?: boolean;
  shading_type?: string;
  [key: string]: unknown;
}

/**
 * Internal gain profile
 */
export interface InternalGain {
  name: string;
  full_load: number;
  weekday: number[];
  weekend: number[];
}

/**
 * HVAC system payload structure (simplified)
 */
export interface SystemPayload {
  emitter_type: string;
  nominal_power: number;
  emission_efficiency: number;
  distribution_loss_coeff: number;
  efficiency_model: Record<string, unknown>;
  [key: string]: unknown;
}

// ============================================================================
// Building Modifications (Option C - Modified Archetype)
// ============================================================================

/**
 * User-modifiable building parameters (high-level, user-friendly)
 */
export interface BuildingModifications {
  // Geometry
  floorArea?: number; // m²
  numberOfFloors?: number;
  buildingHeight?: number; // m

  // Windows
  totalWindowArea?: number; // m²
  windowDistribution?: {
    north: number; // percentage 0-100
    south: number; // percentage 0-100
    east: number; // percentage 0-100
    west: number; // percentage 0-100
  };

  // Thermal properties
  wallUValue?: number; // W/m²K
  roofUValue?: number; // W/m²K
  windowUValue?: number; // W/m²K

  // Setpoints
  heatingSetpoint?: number; // °C
  coolingSetpoint?: number; // °C

  // Occupancy
  numberOfOccupants?: number; // Scales internal gains
}

/**
 * Validation result for modifications
 */
export interface ModificationValidation {
  isValid: boolean;
  errors: {
    field: keyof BuildingModifications;
    message: string;
  }[];
}

// ============================================================================
// Validation Constraints
// ============================================================================

export const MODIFICATION_CONSTRAINTS = {
  floorArea: {
    min: 10,
    max: 1000,
    unit: "m²",
  },
  numberOfFloors: {
    min: 1,
    max: 20,
  },
  buildingHeight: {
    min: 2,
    max: 60,
    unit: "m",
  },
  totalWindowArea: {
    min: 0,
    max: 400, // Will be validated against wall area
    unit: "m²",
  },
  windowDistribution: {
    // Each direction 0-100%, total should be ~100% (allow some tolerance)
    min: 0,
    max: 100,
    unit: "%",
  },
  uValues: {
    min: 0.1,
    max: 5.0,
    unit: "W/m²K",
  },
  heatingSetpoint: {
    min: 15,
    max: 22,
    unit: "°C",
  },
  coolingSetpoint: {
    min: 24,
    max: 30,
    unit: "°C",
  },
  numberOfOccupants: {
    min: 1,
    max: 20,
  },
} as const;
