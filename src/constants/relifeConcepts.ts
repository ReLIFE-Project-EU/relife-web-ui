import type { RenovationMeasureId } from "../types/renovation";

export type ConceptId =
  | "annual-building-thermal-needs"
  | "system-energy-consumption"
  | "estimated-epc"
  | "energy-intensity"
  | "estimated-thermal-needs-cost"
  | "comfort-index"
  | "flexibility-index"
  | "investment"
  | "npv"
  | "irr"
  | "roi"
  | "payback-period"
  | "discounted-payback-period"
  | "arv"
  | "monthly-cash-benefit"
  | "success-probability"
  | "break-even-year"
  | "priority-profile"
  | "ranking-score"
  | "mcda";

export interface ReLifeConcept {
  id: ConceptId;
  label: string;
  description: string;
  unit?: string;
  caveat?: string;
  professionalDetail?: string;
}

export type MeasureEffectKind =
  | "lowers"
  | "may-improve"
  | "indirectly-lowers"
  | "does-not-lower"
  | "generates"
  | "reduces-grid-use"
  | "excluded"
  | "not-analyzed";

export interface MeasureEffectStatement {
  kind: MeasureEffectKind;
  conceptId?: ConceptId;
  label: string;
  description: string;
}

export interface MeasureEffectProfile {
  measureId: RenovationMeasureId;
  summary: string;
  affects: MeasureEffectStatement[];
  doesNotAffect: MeasureEffectStatement[];
  caveat?: string;
  professionalDetail?: string;
}

export const relifeConcepts: Record<ConceptId, ReLifeConcept> = {
  "annual-building-thermal-needs": {
    id: "annual-building-thermal-needs",
    label: "Annual building thermal needs",
    description:
      "Heating and cooling the building needs over a year to stay comfortable.",
    unit: "kWh/year",
    caveat:
      "This is not HVAC fuel or electricity use. Actual system consumption depends on the heating and cooling system.",
    professionalDetail:
      "Derived from the building simulation thermal loads, typically Q_H plus Q_C for the modeled year.",
  },
  "system-energy-consumption": {
    id: "system-energy-consumption",
    label: "System energy consumption",
    description:
      "Electricity or fuel the heating and cooling system uses to meet the building's thermal needs.",
    unit: "kWh/year",
    caveat:
      "This is shown only when the system simulation returns delivered energy.",
    professionalDetail:
      "Used as the energy-savings basis for Financial API calculations when comparable before and after values are available.",
  },
  "estimated-epc": {
    id: "estimated-epc",
    label: "Estimated EPC",
    description:
      "Approximate energy class from the simulation result, shown for comparison.",
    caveat: "This is not an official Energy Performance Certificate.",
    professionalDetail:
      "Computed from modeled energy intensity with approximate class thresholds; country-specific certification rules may differ.",
  },
  "energy-intensity": {
    id: "energy-intensity",
    label: "Energy intensity",
    description:
      "Annual energy result divided by building floor area for easier comparison across buildings.",
    unit: "kWh/m²/year",
  },
  "estimated-thermal-needs-cost": {
    id: "estimated-thermal-needs-cost",
    label: "Estimated cost of thermal needs",
    description: "Flat-tariff estimate based on annual building thermal needs.",
    unit: "EUR/year",
    caveat: "This is not a utility bill and is not the Financial API result.",
  },
  "comfort-index": {
    id: "comfort-index",
    label: "Comfort index",
    description: "Modeled indoor thermal comfort level on a 0 to 100 scale.",
    unit: "0-100",
  },
  "flexibility-index": {
    id: "flexibility-index",
    label: "Flexibility index",
    description:
      "Estimated potential to shift or adapt energy demand on a 0 to 100 scale.",
    unit: "0-100",
  },
  investment: {
    id: "investment",
    label: "Investment",
    description: "Upfront renovation cost used in the financial calculation.",
    unit: "EUR",
    professionalDetail:
      "Also referred to as CAPEX or capital expenditure in professional financial outputs.",
  },
  npv: {
    id: "npv",
    label: "Net Present Value",
    description:
      "Today's value of expected future cash flows after subtracting investment costs.",
    unit: "EUR",
    caveat: "A positive value means the modeled cash flows exceed costs.",
  },
  irr: {
    id: "irr",
    label: "Internal Rate of Return",
    description:
      "Annual return rate implied by the modeled renovation cash flows.",
    unit: "%",
  },
  roi: {
    id: "roi",
    label: "Return on Investment",
    description:
      "Total return compared with the initial investment over the project period.",
    unit: "%",
  },
  "payback-period": {
    id: "payback-period",
    label: "Payback Period",
    description:
      "Years until modeled benefits recover the renovation investment.",
    unit: "years",
    caveat:
      "Shorter is better; this simple view does not always include discounting.",
  },
  "discounted-payback-period": {
    id: "discounted-payback-period",
    label: "Discounted Payback Period",
    description:
      "Years until discounted modeled benefits recover the renovation investment.",
    unit: "years",
    professionalDetail: "This adjusts payback for the time value of money.",
  },
  arv: {
    id: "arv",
    label: "After Renovation Value",
    description: "Estimated market value of the property after renovation.",
    unit: "EUR",
  },
  "monthly-cash-benefit": {
    id: "monthly-cash-benefit",
    label: "Monthly Cash Benefit",
    description:
      "Average monthly financial benefit across the modeled project lifetime.",
    unit: "EUR/month",
    caveat:
      "Use this as a comparison estimate, not as a monthly bill forecast.",
  },
  "success-probability": {
    id: "success-probability",
    label: "Success Probability",
    description:
      "Share of financial simulations where the renovation is profitable.",
    unit: "%",
    professionalDetail:
      "Computed from Monte Carlo risk assessment outputs when available.",
  },
  "break-even-year": {
    id: "break-even-year",
    label: "Break-even Year",
    description:
      "First year when cumulative modeled benefits exceed cumulative costs.",
    unit: "year",
  },
  "priority-profile": {
    id: "priority-profile",
    label: "Priority profile",
    description:
      "Your preference profile for balancing cost, comfort, and environmental outcomes.",
    professionalDetail:
      "Maps to the MCDA persona weights used by the Technical Service.",
  },
  "ranking-score": {
    id: "ranking-score",
    label: "Ranking score",
    description:
      "How well a package matches the selected priority profile compared with the other packages.",
    unit: "%",
    professionalDetail:
      "Normalized recommendation ranking score from the MCDA/TOPSIS workflow.",
  },
  mcda: {
    id: "mcda",
    label: "MCDA",
    description:
      "Professional multi-criteria method used behind the recommendation ranking.",
    professionalDetail:
      "Multi-Criteria Decision Analysis combines technical, financial, comfort, sustainability, and energy criteria using persona weights.",
  },
};

const envelopeMeasureEffect = (
  measureId: RenovationMeasureId,
  surface: string,
): MeasureEffectProfile => ({
  measureId,
  summary: `${surface} improvement lowers the building thermal needs in the simulation.`,
  affects: [
    {
      kind: "lowers",
      conceptId: "annual-building-thermal-needs",
      label: "Lowers thermal needs",
      description:
        "The building loses or gains less heat, so it needs less heating and cooling to stay comfortable.",
    },
    {
      kind: "may-improve",
      conceptId: "estimated-epc",
      label: "May improve estimated EPC",
      description:
        "Lower modeled energy intensity can move the estimated EPC class upward.",
    },
    {
      kind: "indirectly-lowers",
      conceptId: "system-energy-consumption",
      label: "Indirectly lowers system energy",
      description:
        "The system has less heating or cooling work to deliver, so its energy use can fall too.",
    },
  ],
  doesNotAffect: [],
});

const systemMeasureEffect = (
  measureId: RenovationMeasureId,
  system: string,
): MeasureEffectProfile => ({
  measureId,
  summary: `${system} changes how efficiently comfort is delivered, not how much heating or cooling the building needs.`,
  affects: [
    {
      kind: "lowers",
      conceptId: "system-energy-consumption",
      label: "Can lower system energy",
      description:
        "A more efficient system can use less electricity or fuel to meet the same thermal needs.",
    },
    {
      kind: "excluded",
      conceptId: "ranking-score",
      label: "Excluded from HRA ranking",
      description:
        "Current HRA recommendation ranking uses envelope scenarios only.",
    },
  ],
  doesNotAffect: [
    {
      kind: "does-not-lower",
      conceptId: "annual-building-thermal-needs",
      label: "Does not lower thermal needs",
      description:
        "The building fabric still needs the same modeled heating and cooling to stay comfortable.",
    },
  ],
  professionalDetail:
    "Financial savings can still be calculated from delivered-energy changes when comparable system simulation outputs are available.",
});

export const measureEffectProfiles: Record<
  RenovationMeasureId,
  MeasureEffectProfile
> = {
  "wall-insulation": envelopeMeasureEffect(
    "wall-insulation",
    "Wall insulation",
  ),
  "roof-insulation": envelopeMeasureEffect(
    "roof-insulation",
    "Roof insulation",
  ),
  "floor-insulation": envelopeMeasureEffect(
    "floor-insulation",
    "Floor insulation",
  ),
  windows: envelopeMeasureEffect("windows", "Window replacement"),
  "air-water-heat-pump": systemMeasureEffect(
    "air-water-heat-pump",
    "An air-water heat pump",
  ),
  "condensing-boiler": systemMeasureEffect(
    "condensing-boiler",
    "A condensing boiler",
  ),
  pv: {
    measureId: "pv",
    summary:
      "PV panels generate electricity. They do not change the building's heating and cooling needs.",
    affects: [
      {
        kind: "generates",
        label: "Generates electricity",
        description:
          "PV panels produce electricity that can be used by the building or exported.",
      },
      {
        kind: "reduces-grid-use",
        conceptId: "system-energy-consumption",
        label: "Can reduce grid electricity",
        description:
          "Self-consumed PV can offset grid electricity use, especially when paired with electric systems.",
      },
      {
        kind: "excluded",
        conceptId: "ranking-score",
        label: "Excluded from HRA ranking",
        description:
          "Current HRA recommendation ranking uses envelope scenarios only.",
      },
    ],
    doesNotAffect: [
      {
        kind: "does-not-lower",
        conceptId: "annual-building-thermal-needs",
        label: "Does not lower thermal needs",
        description:
          "PV changes electricity supply, not the heat the building needs to stay comfortable.",
      },
    ],
    caveat:
      "PV performance depends on roof area, orientation, shading, weather, and self-consumption.",
  },
  "solar-thermal": {
    measureId: "solar-thermal",
    summary: "Solar thermal is not currently analyzed in this UI workflow.",
    affects: [],
    doesNotAffect: [
      {
        kind: "not-analyzed",
        label: "Not currently analyzed",
        description:
          "Solar thermal is listed for roadmap completeness but excluded from the current simulation and ranking flow.",
      },
    ],
  },
};

export const supportedRenovationMeasureIds = Object.keys(
  measureEffectProfiles,
) as RenovationMeasureId[];

export const hraResultMetricConceptIds = [
  "estimated-epc",
  "annual-building-thermal-needs",
  "estimated-thermal-needs-cost",
  "system-energy-consumption",
  "flexibility-index",
  "comfort-index",
  "investment",
  "npv",
  "payback-period",
  "monthly-cash-benefit",
  "irr",
  "roi",
  "discounted-payback-period",
  "break-even-year",
  "success-probability",
  "priority-profile",
  "ranking-score",
] as const satisfies readonly ConceptId[];

export const praResultMetricConceptIds = [
  "estimated-epc",
  "annual-building-thermal-needs",
  "system-energy-consumption",
  "investment",
  "npv",
  "roi",
  "payback-period",
  "estimated-thermal-needs-cost",
] as const satisfies readonly ConceptId[];

export const financialMetricConceptIds = {
  NPV: "npv",
  PBP: "payback-period",
  DPP: "discounted-payback-period",
  IRR: "irr",
  ROI: "roi",
  MonthlyAvgSavings: "monthly-cash-benefit",
  SuccessRate: "success-probability",
  CAPEX: "investment",
  ARV: "arv",
  BreakEven: "break-even-year",
  EnergyReduction: "annual-building-thermal-needs",
  EPCClass: "estimated-epc",
} as const satisfies Record<string, ConceptId>;
