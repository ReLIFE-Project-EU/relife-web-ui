import type { RenovationMeasureId } from "../types/renovation";

export type ConceptId =
  | "annual-building-thermal-needs"
  | "system-energy-consumption"
  | "estimated-epc"
  | "scenario-epc-comparison-note"
  | "energy-intensity"
  | "estimated-thermal-needs-cost"
  | "pv-generation"
  | "pv-self-consumption"
  | "pv-grid-export"
  | "pv-self-consumption-rate"
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
      "The heat the building's envelope needs each year to stay at a comfortable indoor temperature, before any heating or cooling system is involved.",
    unit: "kWh thermal/year",
    caveat:
      "This is a property of the envelope itself: the same envelope produces the same thermal needs whether you use a gas boiler, a heat pump, or solar PV. To see what energy the system actually pulls from suppliers, look at System energy consumption.",
    professionalDetail:
      "Sum of hourly Q_H + Q_C ideal loads from the pybuildingenergy ISO 13790 / 5R1C simulation, expressed in kWh thermal at the building's setpoint.",
  },
  "system-energy-consumption": {
    id: "system-energy-consumption",
    label: "System energy consumption",
    description:
      "Energy actually pulled from external suppliers (gas, electricity, district heat) by the heating and cooling system to meet the building's thermal needs.",
    unit: "kWh delivered/year",
    caveat:
      "Differs from Annual building thermal needs because of system efficiency: a gas boiler at η≈0.9 burns ~110 kWh of gas per 100 kWh of heat, while a heat pump at COP≈3 uses ~33 kWh of electricity for the same heat. Covers HVAC end uses only — domestic hot water, lighting, and appliances are not included. Shown only when the simulation returns delivered energy.",
    professionalDetail:
      "Computed by extractUniTotals as deliveredThermal + E_delivered_electric_total_kWh from the UNI/TS 11300 summary; deliveredThermal is forced to 0 when a heat pump is detected (heat_pump_applied) to avoid double-counting electric input. Used as the energy-savings basis for Financial API calculations when comparable before-and-after values are available.",
  },
  "estimated-epc": {
    id: "estimated-epc",
    label: "Estimated EPC",
    description:
      "Approximate energy class from modeled annual building thermal needs per floor area, shown for comparison.",
    caveat: "This is not an official Energy Performance Certificate.",
    professionalDetail:
      "Letter bands map modeled thermal needs intensity (kWh/m²/year) to approximate classes; they do not fully represent heating fuel or primary energy the way many official schemes do.",
  },
  "scenario-epc-comparison-note": {
    id: "scenario-epc-comparison-note",
    label: "Estimated EPC in scenario comparison",
    description:
      "Some columns include a heating-system upgrade and/or solar (PV). The estimated class is still derived from modeled annual thermal needs per m². System and PV benefits often appear in delivered energy, costs, or generation rows even when this letter moves little. This is not an official Energy Performance Certificate.",
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
    description:
      "Flat-tariff price tag for Annual building thermal needs, computed in the frontend at a fixed rate of 0.25 EUR/kWh thermal.",
    unit: "EUR/year",
    caveat:
      "Not a utility bill: it does not account for heating-system efficiency, fuel mix, or PV self-consumption, and it is computed from thermal needs rather than delivered energy. The Financial Service uses a separate Monte Carlo electricity tariff for its own calculations, so figures shown here will not match the financial step.",
    professionalDetail:
      "Frontend-only estimate from estimateAnnualHvacEnergyCost() in energyUtils.ts, intentionally country-agnostic and fuel-agnostic so all pricing assumptions live in one place.",
  },
  "pv-generation": {
    id: "pv-generation",
    label: "PV generation",
    description:
      "Solar electricity produced on-site by the PV array over a full year, modelled with PVGIS climate data.",
    unit: "kWh/year",
  },
  "pv-self-consumption": {
    id: "pv-self-consumption",
    label: "PV self-consumption",
    description:
      "Share of the PV generation used directly by the building rather than exported, before any battery is considered.",
    unit: "kWh/year",
    professionalDetail:
      "Hourly minimum of PV generation and on-site electric load, summed over the year.",
  },
  "pv-grid-export": {
    id: "pv-grid-export",
    label: "PV grid export",
    description:
      "PV generation surplus pushed back to the grid after on-site consumption (and battery charging, when modelled).",
    unit: "kWh/year",
  },
  "pv-self-consumption-rate": {
    id: "pv-self-consumption-rate",
    label: "PV self-consumption rate",
    description:
      "Fraction of PV generation that is consumed on-site rather than exported.",
    unit: "%",
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
