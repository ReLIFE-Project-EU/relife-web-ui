import type { RenovationMeasureId } from "../types/renovation";

export const HEATING_SYSTEM_CONFLICT_MESSAGE =
  "Choose only one heating system.";

export const analysisLoadingCopy = {
  titles: {
    home: "Home energy profile",
    renovation: "Renovation comparison",
    recommendations: "Renovation recommendations",
    portfolio: "Portfolio analysis",
    strategy: "Strategy comparison",
    analysis: "Analysis",
  },
  stages: {
    preparing: {
      active: "Preparing analysis",
      waiting: "Waiting for analysis results",
    },
    baseline: {
      active: "Estimating energy use",
      waiting: "Waiting for energy results",
    },
    energy: {
      active: "Comparing energy use",
      waiting: "Waiting for energy results",
    },
    financial: {
      active: "Calculating financial outcomes",
      waiting: "Waiting for financial results",
    },
    ranking: {
      active: "Ranking renovation options",
      waiting: "Waiting for recommendations",
    },
    buildings: {
      active: "Processing buildings",
      waiting: "Waiting for building results",
    },
    portfolio: {
      active: "Preparing portfolio",
      waiting: "Waiting for portfolio data",
    },
    cache: {
      active: "Loading energy results",
      waiting: "Waiting for energy results",
    },
  },
  buildings: (completed: number, total: number) =>
    `${completed} of ${total} buildings processed`,
  elapsed: (seconds: number) =>
    `Elapsed ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`,
};

export type ConceptId =
  | "gas-tariff"
  | "electricity-tariff"
  | "modeled-property"
  | "total-floor-area"
  | "apartment-floor-area"
  | "annual-building-thermal-needs"
  | "system-energy-consumption"
  | "recovered-loss-fraction"
  | "auxiliary-electricity-fraction"
  | "primary-energy"
  | "energy-intensity"
  | "pv-generation"
  | "pv-self-consumption"
  | "pv-grid-export"
  | "operational-co2-emissions"
  | "thermal-health-impact"
  | "embodied-carbon"
  | "whole-life-carbon"
  | "investment"
  | "annual-maintenance-cost"
  | "own-funds"
  | "renovation-loan"
  | "upfront-subsidy"
  | "npv"
  | "irr"
  | "roi"
  | "payback-period"
  | "discounted-payback-period"
  | "arv"
  | "monthly-cash-benefit"
  | "success-probability"
  | "priority-profile"
  | "ranking-score"
  | "mcda"
  | "rse-energy-saved-per-eur"
  | "rse-total-energy-savings"
  | "rse-co2-reduced-per-eur"
  | "rse-total-co2-reduction"
  | "rse-renovatable-buildings";

export interface ReLifeConcept {
  id: ConceptId;
  label: string;
  /** Standard abbreviation, used in table headers and compact rows. */
  shortLabel?: string;
  description: string;
  unit?: string;
  caveat?: string;
}

export type MeasureEffectKind =
  | "lowers"
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
}

export interface MeasureEffectProfile {
  measureId: RenovationMeasureId;
  affects: MeasureEffectStatement[];
  doesNotAffect: MeasureEffectStatement[];
}

/** Qualifier word for a figure calculated from a concept, e.g. a sum. */
export type ConceptPrefix =
  | "Total"
  | "Portfolio"
  | "Annual"
  | "Reduction in"
  | "Total reduction in"
  | "Uplift in";

/** One-line label for a calculated figure, e.g. "Total net present value". */
export function prefixedConceptLabel(
  conceptId: ConceptId,
  prefix?: ConceptPrefix,
): string {
  const label = relifeConcepts[conceptId].label;
  if (!prefix) return label;
  // Lowercase the leading word, but keep acronyms such as "CO₂" as written.
  const lead =
    label.charAt(1) === label.charAt(1).toLowerCase()
      ? label.charAt(0).toLowerCase() + label.slice(1)
      : label;
  return `${prefix} ${lead}`;
}

/** The label for table headers and compact rows: the abbreviation when there is one. */
export function compactConceptLabel(conceptId: ConceptId): string {
  const concept = relifeConcepts[conceptId];
  return concept.shortLabel ?? concept.label;
}

export const relifeConcepts: Record<ConceptId, ReLifeConcept> = {
  "electricity-tariff": {
    id: "electricity-tariff",
    label: "Electricity tariff",
    description: "First-year grid electricity price.",
    unit: "€/kWh",
  },
  "gas-tariff": {
    id: "gas-tariff",
    label: "Gas tariff",
    description: "Natural gas price per gross kWh.",
    unit: "€/kWh",
  },
  "modeled-property": {
    id: "modeled-property",
    label: "Properties",
    unit: "properties",
    description:
      "One Apartment, or one whole Single-Family or Multi-Family House.",
  },
  "total-floor-area": {
    id: "total-floor-area",
    label: "Total floor area (m²)",
    description: "All floors added together. For an apartment, the flat alone.",
  },
  "apartment-floor-area": {
    id: "apartment-floor-area",
    label: "Apartment floor area (m²)",
    description: "Floor area of the flat.",
  },
  "annual-building-thermal-needs": {
    id: "annual-building-thermal-needs",
    label: "Annual building thermal needs",
    description:
      "Heat that must be added or removed each year to keep rooms at the set temperatures.",
    unit: "kWh thermal/year",
    caveat: "Before equipment efficiency and solar electricity.",
  },
  "system-energy-consumption": {
    id: "system-energy-consumption",
    label: "System energy consumption",
    description:
      "Energy supplied for heating and cooling each year, after system efficiency and on-site solar electricity.",
    unit: "kWh delivered/year",
    caveat: "Hot water, lighting and appliances are not included.",
  },
  "recovered-loss-fraction": {
    id: "recovered-loss-fraction",
    label: "Heat recovery share",
    description:
      "Share of the heat released by equipment and pipes that stays inside the building. 0.8 means 80%.",
  },
  "auxiliary-electricity-fraction": {
    id: "auxiliary-electricity-fraction",
    label: "Extra electricity factor",
    description:
      "Electricity used by pumps and fans, as a share of the energy that part of the system handles. 0.005 means 0.5%.",
  },
  "primary-energy": {
    id: "primary-energy",
    label: "Primary energy",
    description:
      "Energy needed to supply heating and cooling, including the energy used to produce and deliver it.",
    unit: "kWh primary/year",
    caveat: "Hot water, lighting and appliances are not included.",
  },
  "energy-intensity": {
    id: "energy-intensity",
    label: "Energy intensity",
    description: "Annual energy per square metre of floor area.",
    unit: "kWh/m²/year",
  },
  "pv-generation": {
    id: "pv-generation",
    label: "PV generation",
    description: "Solar electricity the panels generate in a year.",
    unit: "kWh/year",
  },
  "pv-self-consumption": {
    id: "pv-self-consumption",
    label: "PV self-consumption",
    description:
      "Solar electricity used on site for heating and cooling in a year.",
    unit: "kWh/year",
  },
  "pv-grid-export": {
    id: "pv-grid-export",
    label: "PV grid export",
    description:
      "Solar electricity sent to the grid after covering heating and cooling.",
    unit: "kWh/year",
  },
  "operational-co2-emissions": {
    id: "operational-co2-emissions",
    label: "CO₂ emissions",
    description:
      "Greenhouse gases released each year to produce the energy used for heating and cooling.",
    unit: "t CO₂e/year",
    caveat:
      "Hot water, lighting, appliances and renovation materials are not included.",
  },
  "thermal-health-impact": {
    id: "thermal-health-impact",
    label: "Health impact from indoor temperature",
    unit: "healthy-life days lost per person/year",
    description:
      "Days of healthy life lost per person each year because rooms are too cold or too hot.",
    caveat: "An average across a population, not a forecast for one resident.",
  },
  "embodied-carbon": {
    id: "embodied-carbon",
    label: "Material carbon",
    description:
      "One-off greenhouse gas emissions from the materials and equipment installed.",
    unit: "t CO₂e",
    caveat: "Based on standard materials, not specific products.",
  },
  "whole-life-carbon": {
    id: "whole-life-carbon",
    label: "Lifetime carbon",
    description:
      "Material emissions plus heating and cooling emissions over the project lifetime.",
    unit: "t CO₂e",
    caveat: "A total, not a saving.",
  },
  investment: {
    id: "investment",
    label: "Investment",
    description: "Upfront renovation cost.",
    unit: "EUR",
  },
  "annual-maintenance-cost": {
    id: "annual-maintenance-cost",
    label: "Annual maintenance cost",
    description: "Yearly cost to run and maintain the renovated systems.",
    unit: "EUR/year",
  },
  "own-funds": {
    id: "own-funds",
    label: "Own funds",
    description: "Pay for the renovation without borrowing.",
  },
  "renovation-loan": {
    id: "renovation-loan",
    label: "Loan",
    description:
      "Borrow part of the cost and repay it over a fixed number of years.",
    caveat: "The interest rate is simulated, not a lender's offer.",
  },
  "upfront-subsidy": {
    id: "upfront-subsidy",
    label: "Subsidy",
    description: "A grant that lowers the upfront cost.",
  },
  npv: {
    id: "npv",
    label: "Net present value",
    shortLabel: "NPV",
    description: "Savings and income minus all costs, in today's money.",
    unit: "EUR",
    caveat: "Positive means the renovation earns more than it costs.",
  },
  irr: {
    id: "irr",
    label: "Internal rate of return",
    shortLabel: "IRR",
    description: "Yearly percentage return on the money invested.",
    unit: "%",
  },
  roi: {
    id: "roi",
    label: "Return on investment",
    shortLabel: "ROI",
    description:
      "Profit over the project lifetime as a percentage of the money invested.",
    unit: "%",
  },
  "payback-period": {
    id: "payback-period",
    label: "Payback period",
    description:
      "Years until savings and income, after running costs, cover the upfront cost.",
    unit: "years",
    caveat: "Money saved in later years counts the same as money saved today.",
  },
  "discounted-payback-period": {
    id: "discounted-payback-period",
    label: "Discounted payback period",
    shortLabel: "DPP",
    description:
      "Years until savings and income, after running costs and in today's money, cover the upfront cost.",
    unit: "years",
  },
  arv: {
    id: "arv",
    label: "After renovation value",
    description: "Estimated market value of the property after renovation.",
    unit: "EUR",
  },
  "monthly-cash-benefit": {
    id: "monthly-cash-benefit",
    label: "Monthly cash benefit",
    description:
      "Average money saved or earned each month, after maintenance and loan payments.",
    unit: "EUR/month",
    caveat: "The upfront cost is not included.",
  },
  "success-probability": {
    id: "success-probability",
    label: "Success probability",
    description:
      "Share of simulated outcomes with a positive net present value.",
    unit: "%",
  },
  "priority-profile": {
    id: "priority-profile",
    label: "Priority profile",
    description:
      "How much weight cost, health, energy, renewables and the environment get in the ranking.",
  },
  "ranking-score": {
    id: "ranking-score",
    label: "Ranking score",
    description:
      "How well a package fits the selected priorities, relative to the other packages.",
    unit: "%",
  },
  mcda: {
    id: "mcda",
    label: "Package ranking",
    description:
      "Scores each package on cost, health, energy, renewables and the environment, weighted by your priorities.",
  },
  "rse-energy-saved-per-eur": {
    id: "rse-energy-saved-per-eur",
    label: "Primary energy saved per euro",
    description:
      "Annual primary energy savings per euro of upfront cost after subsidy.",
    unit: "kWh/€",
  },
  "rse-total-energy-savings": {
    id: "rse-total-energy-savings",
    label: "Total annual primary energy savings",
    description: "Annual primary energy savings across all properties.",
    unit: "kWh/year",
  },
  "rse-co2-reduced-per-eur": {
    id: "rse-co2-reduced-per-eur",
    label: "CO₂ reduced per euro",
    description:
      "Annual emissions reduction per euro of upfront cost after subsidy.",
    unit: "kg CO₂e/€",
  },
  "rse-total-co2-reduction": {
    id: "rse-total-co2-reduction",
    label: "Total annual CO₂ reduction",
    description:
      "Annual heating and cooling emissions reduction across all properties.",
    unit: "t CO₂e/year",
  },
  "rse-renovatable-buildings": {
    id: "rse-renovatable-buildings",
    label: "Renovatable properties",
    description: "Properties the budget covers with this package.",
    unit: "properties",
    caveat:
      "Keeps the same mix of properties instead of picking the cheapest first. Subsidies come from outside the budget.",
  },
};

const envelopeMeasureEffect = (
  measureId: RenovationMeasureId,
): MeasureEffectProfile => ({
  measureId,
  affects: [
    {
      kind: "lowers",
      conceptId: "annual-building-thermal-needs",
      label: "Lowers thermal needs",
    },
    {
      kind: "indirectly-lowers",
      conceptId: "system-energy-consumption",
      label: "Indirectly lowers system energy",
    },
  ],
  doesNotAffect: [],
});

const systemMeasureEffect = (
  measureId: RenovationMeasureId,
): MeasureEffectProfile => ({
  measureId,
  affects: [
    {
      kind: "lowers",
      conceptId: "system-energy-consumption",
      label: "Lowers system energy",
    },
  ],
  doesNotAffect: [
    {
      kind: "does-not-lower",
      conceptId: "annual-building-thermal-needs",
      label: "Does not lower thermal needs",
    },
  ],
});

export const measureEffectProfiles: Record<
  RenovationMeasureId,
  MeasureEffectProfile
> = {
  "wall-insulation": envelopeMeasureEffect("wall-insulation"),
  "roof-insulation": envelopeMeasureEffect("roof-insulation"),
  "floor-insulation": envelopeMeasureEffect("floor-insulation"),
  windows: envelopeMeasureEffect("windows"),
  "air-water-heat-pump": systemMeasureEffect("air-water-heat-pump"),
  "condensing-boiler": systemMeasureEffect("condensing-boiler"),
  pv: {
    measureId: "pv",
    affects: [
      {
        kind: "generates",
        label: "Generates electricity",
      },
      {
        kind: "reduces-grid-use",
        conceptId: "system-energy-consumption",
        label: "Reduces grid electricity",
      },
    ],
    doesNotAffect: [
      {
        kind: "does-not-lower",
        conceptId: "annual-building-thermal-needs",
        label: "Does not lower thermal needs",
      },
    ],
  },
  "solar-thermal": {
    measureId: "solar-thermal",
    affects: [],
    doesNotAffect: [
      {
        kind: "not-analyzed",
        label: "Not analyzed",
      },
    ],
  },
};

export const supportedRenovationMeasureIds = Object.keys(
  measureEffectProfiles,
) as RenovationMeasureId[];

export const financialMetricConceptIds = {
  NPV: "npv",
  PBP: "payback-period",
  DPP: "discounted-payback-period",
  IRR: "irr",
  ROI: "roi",
} as const satisfies Record<string, ConceptId>;
