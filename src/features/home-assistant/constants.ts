/**
 * Home Renovation Assistant UI Constants
 *
 * Centralised constants for UI validation, ranges, and defaults.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Building Input Constraints
// ─────────────────────────────────────────────────────────────────────────────

export const BUILDING_AREA_MIN = 10;
export const BUILDING_AREA_MAX = 1000;

export const CONSTRUCTION_YEAR_MIN = 1800;
export const CONSTRUCTION_YEAR_MAX = new Date().getFullYear();

export const BUILDING_FLOORS_MIN = 1;
export const BUILDING_FLOORS_MAX = 100;

export const PROJECT_LIFETIME_MIN = 1;
export const PROJECT_LIFETIME_MAX = 30;
export const PROJECT_LIFETIME_DEFAULT = 20;

export const PROJECT_LIFETIME_MARKS = [
  { value: 5, label: "5y" },
  { value: 10, label: "10y" },
  { value: 15, label: "15y" },
  { value: 20, label: "20y" },
  { value: 25, label: "25y" },
  { value: 30, label: "30y" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Coordinate Constraints
// ─────────────────────────────────────────────────────────────────────────────

export const LATITUDE_MIN = -90;
export const LATITUDE_MAX = 90;

export const LONGITUDE_MIN = -180;
export const LONGITUDE_MAX = 180;

export const COORDINATE_DECIMAL_SCALE = 4;
