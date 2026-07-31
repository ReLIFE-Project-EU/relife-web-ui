/**
 * Technical sheet dataset types.
 *
 * Models the eight-section technical sheet structure defined by D3.2
 * (see `D32_WEB_UI_GUIDANCE.md`): description, application, generic
 * advantages/disadvantages, technical information, embodied carbon,
 * installation data, maintenance data, labour/material cost.
 *
 * The dataset is a faithful record of the source documents, not a curated LCA
 * database. Values are transcribed verbatim; suspect ones carry a
 * `DataQualityFlag`. See `README.md` in this directory for provenance, unit
 * conventions and the data-quality register.
 */

import type { MeasureCategory } from "../../services/types";
import type { RenovationMeasureId } from "../../types/renovation";

// ─────────────────────────────────────────────────────────────────────────────
// Primitives
// ─────────────────────────────────────────────────────────────────────────────

/** An inclusive `min`–`max` interval, used wherever a sheet gives a range. */
export interface NumericRange {
  min: number;
  max: number;
}

/**
 * The reference quantity an embodied-carbon value is expressed against.
 *
 * Sheets mix these freely, and the PV sheet mixes two within a single table, so
 * the unit travels on every entry rather than on the sheet.
 */
export type FunctionalUnit = "per-m2" | "per-unit" | "per-wp";

/** Caveats a consumer must weigh before comparing values across sheets. */
export type DataQualityFlag =
  /** No country-level breakdown exists; the value is a European average. */
  | "european-average"
  /** Derived from a single measured point by assuming linearity. */
  | "linearly-extrapolated"
  /** The whole table rests on one measurement from the source. */
  | "single-source-datapoint"
  /** Values are identical to another sheet's, suggesting a source copy-paste. */
  | "suspected-duplicate"
  /** The `.docx` and `.pdf` renderings disagree on this value. */
  | "source-version-mismatch";

// ─────────────────────────────────────────────────────────────────────────────
// Sheet identity
// ─────────────────────────────────────────────────────────────────────────────

export type TechnicalSheetId =
  | "eps-insulation"
  | "xps-insulation"
  | "mineral-wool-insulation"
  | "aluminium-window"
  | "pvc-window"
  | "wood-window"
  | "air-to-air-heat-pump"
  | "air-to-water-heat-pump"
  | "condensing-boiler"
  | "photovoltaic-system"
  | "solar-thermal-system";

// ─────────────────────────────────────────────────────────────────────────────
// Section shapes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * One row of a sheet's "Technical information" table.
 *
 * Every field is optional because the tables key on different dimensions:
 * thickness for insulation, glazing for windows, capacity for heating systems,
 * panel type for PV, household size for solar thermal.
 */
export interface TechnicalRow {
  /** Insulation panel thickness. */
  thicknessMm?: number;
  /** Window glazing configuration. */
  glazing?: "double" | "triple";
  /** Nominal or banded capacity of a heating/cooling system. */
  capacityKw?: number | NumericRange;
  /** PV cell technology. */
  panelType?: "monocrystalline" | "polycrystalline";
  /** Occupancy a solar thermal system is sized for. */
  householdSizePersons?: NumericRange;
  /** Served floor area. HVAC sheets only — not the same as `collectorAreaM2`. */
  typicalFloorAreaM2?: NumericRange;
  /**
   * Solar collector aperture area. The solar thermal sheet labels this column
   * "Typical Area (m²)", the same wording HVAC sheets use for served floor
   * area; the two must not be conflated.
   */
  collectorAreaM2?: NumericRange;
  /** Hot water storage tank capacity. */
  storageCapacityL?: NumericRange;
  /** Thermal resistance (R-value) in m²·K/W. */
  thermalResistanceM2KW?: number;
  /** Seasonal coefficient of performance, heating mode. */
  scop?: NumericRange;
  /** Seasonal energy efficiency ratio, cooling mode. */
  seer?: NumericRange;
  /**
   * Module/generation efficiency as a 0–1 fraction. Sources are inconsistent
   * (PV gives percentages, the boiler gives fractions); both are normalized
   * here to a fraction.
   */
  efficiency?: number | NumericRange;
}

/** One row of a sheet's "Embodied Carbon" table. */
export interface EmbodiedCarbonEntry {
  /** Row label as the source presents it. */
  label: string;
  thicknessMm?: number;
  glazing?: "double" | "triple";
  capacityKw?: number | NumericRange;
  /** Embodied carbon in kgCO₂e per `functionalUnit`. */
  kgCO2e: number;
  functionalUnit: FunctionalUnit;
  dataQuality?: readonly DataQualityFlag[];
}

/** A definition of an efficiency metric, quoted from the source sheet. */
export interface EfficiencyMetric {
  key: "scop" | "seer";
  name: string;
  definition: string;
  typicalRange: NumericRange;
}

export interface InstallationTime {
  min: number;
  max: number;
  unit: "hours" | "days";
  /** What the time is measured per, e.g. "per unit", "per 100 m²". */
  basis: string;
}

/** Expected service life, scoped where a sheet distinguishes components. */
export interface LifespanEntry {
  /** Component the lifespan applies to; absent when it covers the whole system. */
  scope?: string;
  years: NumericRange;
}

export interface CostEntry {
  /** What is being priced, e.g. "Wall insulation with EPS boards". */
  scope: string;
  min: number;
  max: number;
  currency: "EUR";
  unit: "per-m2" | "total";
  note?: string;
}

/**
 * Where a sheet's values came from.
 *
 * Both source renderings are recorded because the dataset was transcribed by
 * reconciling them against each other; neither alone is authoritative.
 */
export interface SheetProvenance {
  docxFile: string;
  pdfFile: string;
  /** ISO date of the extraction. */
  extractedOn: string;
  /** Set where the two renderings disagreed, describing the resolution. */
  sourceVersionNotes?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sheet
// ─────────────────────────────────────────────────────────────────────────────

export interface TechnicalSheet {
  id: TechnicalSheetId;
  /** Sheet title as the source document gives it. */
  name: string;
  category: MeasureCategory;
  /**
   * Renovation measures this sheet informs. Many-to-many: three insulation
   * materials each serve three insulation measures, three window materials
   * share one measure, and the air-to-air heat pump has no matching measure.
   */
  relatedMeasureIds: readonly RenovationMeasureId[];
  description: string;
  /** Application/component bullets. Empty where the source section is blank. */
  application: readonly string[];
  advantages: readonly string[];
  disadvantages: readonly string[];
  /** Present only on sheets that define SCOP/SEER. */
  efficiencyMetrics?: readonly EfficiencyMetric[];
  technicalInformation: {
    /** Provenance note printed above the table in the source. */
    note?: string;
    rows: readonly TechnicalRow[];
  };
  embodiedCarbon: {
    /** Methodology note printed above the table in the source. */
    note?: string;
    entries: readonly EmbodiedCarbonEntry[];
    /** Flags applying to the whole table. */
    dataQuality: readonly DataQualityFlag[];
  };
  installation: {
    time?: InstallationTime;
    workConditions?: string;
    method?: string;
  };
  maintenance: {
    tasks: readonly string[];
    frequency?: string;
    expectedLifespanYears?: readonly LifespanEntry[];
    /** The source has the section heading but no content beneath it. */
    missingInSource?: boolean;
  };
  cost: {
    /** Qualifier printed above the figures, e.g. "Prices vary by country.". */
    note?: string;
    entries: readonly CostEntry[];
    /** The source has the section heading but no content beneath it. */
    missingInSource?: boolean;
  };
  provenance: SheetProvenance;
}
