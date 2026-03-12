/**
 * Renovation Measures Data
 * Defines the 8 individual renovation measures as specified in D3.2 requirements.
 *
 * Users can multi-select from these measures to build their renovation plan.
 *
 * NOTE: Cost estimates and energy savings are NOT defined here.
 * Per D3.2 design document:
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
    label: "Building Envelope",
    description: "Insulation and window improvements to reduce heat loss",
  },
  {
    id: "systems",
    label: "Heating & Cooling Systems",
    description: "Efficient heating and cooling equipment upgrades",
  },
  {
    id: "renewable",
    label: "Renewable Energy",
    description: "Solar energy generation systems",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Building Envelope Measures
// ─────────────────────────────────────────────────────────────────────────────

const ENVELOPE_MEASURES: RenovationMeasure[] = [
  {
    id: "wall-insulation",
    name: "Wall Insulation",
    description:
      "External or internal wall insulation to reduce heat transfer through walls. Typically involves adding insulation material (EPS, mineral wool, or similar) to exterior or interior wall surfaces.",
    technicalDescription:
      "The simulation targets a wall U-value of 0.25 W/m²K for opaque vertical surfaces. This directly reduces transmission heat losses and lowers the building's annual heating load. The lower the U-value, the less heat escapes through the walls.",
    category: "envelope",
    isSupported: true,
  },
  {
    id: "roof-insulation",
    name: "Roof Insulation",
    description:
      "Insulation of roof or attic space to prevent heat loss through the roof. Can be applied above, below, or between rafters depending on roof type.",
    technicalDescription:
      "The simulation targets a roof U-value of 0.20 W/m²K for opaque horizontal surfaces. Roof insulation typically delivers strong savings in older buildings, since heat rises and escapes most readily through the top of the structure.",
    category: "envelope",
    isSupported: true,
  },
  {
    id: "floor-insulation",
    name: "Floor Insulation",
    description:
      "Insulation of ground floor or basement ceiling to reduce heat loss to the ground. Particularly effective in buildings with unheated basements or crawl spaces.",
    technicalDescription:
      "The simulation sets the slab-to-ground U-value to 0.25 W/m²K. Savings depend on floor area and the temperature gap between the interior and the unheated ground space below.",
    category: "envelope",
    isSupported: true,
  },
  {
    id: "windows",
    name: "Windows",
    description:
      "Replacement of existing windows with high-performance double or triple glazed units. Improves thermal insulation and reduces drafts while allowing natural light.",
    technicalDescription:
      "The simulation targets a window U-value of 1.4 W/m²K for transparent vertical surfaces — equivalent to high-performance double glazing. This cuts heat loss through glass while preserving daylight and solar gains.",
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
    name: "Air-Water Heat Pump",
    description:
      "High-efficiency heat pump that extracts heat from outdoor air and transfers it to water for space heating and domestic hot water. Can also provide cooling in summer.",
    technicalDescription:
      "The simulation replaces the building's primary heat source with a heat pump using a COP of 3.2. When this measure is combined with envelope improvements, the reduced heating demand makes the heat pump operate even more efficiently.",
    category: "systems",
    isSupported: true,
  },
  {
    id: "condensing-boiler",
    name: "Condensing Boiler",
    description:
      "Modern high-efficiency gas boiler that recovers heat from exhaust gases. Achieves efficiency ratings of 90-98%, significantly higher than traditional boilers.",
    category: "systems",
    isSupported: false,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Renewable Energy Measures
// ─────────────────────────────────────────────────────────────────────────────

const RENEWABLE_MEASURES: RenovationMeasure[] = [
  {
    id: "pv",
    name: "PV Panels",
    description:
      "Photovoltaic solar panels for electricity generation. Reduces reliance on grid electricity and can provide income through feed-in tariffs or self-consumption savings.",
    category: "renewable",
    isSupported: false,
  },
  {
    id: "solar-thermal",
    name: "Solar Thermal Panels",
    description:
      "Solar collectors that heat water directly using sunlight. Primarily used for domestic hot water production, can cover 50-70% of annual hot water needs.",
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
