/**
 * Renovation Measures Data
 * Defines the 8 individual renovation measures available in the application.
 *
 * Users can multi-select from these measures to build their renovation plan.
 *
 * NOTE: Cost estimates and energy savings are NOT defined here.
 * Current service responsibilities:
 * - CAPEX/costs: Retrieved from ReLIFE Database or Financial API
 * - Energy savings: Calculated by Forecasting API through building simulation
 *
 * The frontend only stores the measure definitions for display purposes.
 */

import type { MeasureCategoryInfo, RenovationMeasure } from "../../types";

// ─────────────────────────────────────────────────────────────────────────────
// Measure Categories
// ─────────────────────────────────────────────────────────────────────────────

export const MEASURE_CATEGORIES: MeasureCategoryInfo[] = [
  {
    id: "envelope",
    label: "Building envelope",
  },
  {
    id: "systems",
    label: "Heating & cooling systems",
  },
  {
    id: "renewable",
    label: "Renewable energy",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Building Envelope Measures
// ─────────────────────────────────────────────────────────────────────────────

const ENVELOPE_MEASURES: RenovationMeasure[] = [
  {
    id: "wall-insulation",
    name: "Wall insulation",
    description: "Insulation added to the outside or inside of the walls.",
    technicalDescription: "Targets a wall U-value of 0.25 W/m²K.",
    category: "envelope",
    isSupported: true,
  },
  {
    id: "roof-insulation",
    name: "Roof insulation",
    description: "Insulation in the roof or attic.",
    technicalDescription: "Targets a roof U-value of 0.20 W/m²K.",
    category: "envelope",
    isSupported: true,
  },
  {
    id: "floor-insulation",
    name: "Floor insulation",
    description: "Insulation of the ground floor or basement ceiling.",
    technicalDescription: "Sets the slab-to-ground U-value to 0.25 W/m²K.",
    category: "envelope",
    isSupported: true,
  },
  {
    id: "windows",
    name: "Windows",
    description: "New double- or triple-glazed windows.",
    technicalDescription: "Targets a window U-value of 1.4 W/m²K.",
    category: "envelope",
    isSupported: true,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Heating & Cooling System Measures
// ─────────────────────────────────────────────────────────────────────────────

const SYSTEM_MEASURES: RenovationMeasure[] = [
  {
    id: "air-water-heat-pump",
    name: "Air-water heat pump",
    description:
      "Electric heat pump that takes heat from outdoor air to heat water for space heating.",
    category: "systems",
    isSupported: true,
  },
  {
    id: "condensing-boiler",
    name: "Condensing boiler",
    description:
      "Gas boiler that recovers heat from exhaust gases, reaching 90–98% efficiency.",
    category: "systems",
    isSupported: true,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Renewable Energy Measures
// ─────────────────────────────────────────────────────────────────────────────

const RENEWABLE_MEASURES: RenovationMeasure[] = [
  {
    id: "pv",
    name: "PV panels",
    description: "Solar panels that generate electricity.",
    category: "renewable",
    isSupported: true,
  },
  {
    id: "solar-thermal",
    name: "Solar thermal panels",
    description: "Solar collectors that heat water.",
    category: "renewable",
    isSupported: false,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Combined Exports
// ─────────────────────────────────────────────────────────────────────────────

/**
 * All renovation measures organized by category
 */
export const RENOVATION_MEASURES: RenovationMeasure[] = [
  ...ENVELOPE_MEASURES,
  ...SYSTEM_MEASURES,
  ...RENEWABLE_MEASURES,
];
