import type { RenovationMeasureId } from "../types/renovation";

export const HEATING_SYSTEM_CONFLICT_MESSAGE =
  "Choose only one heating system.";

export type ConceptId =
  | "gas-tariff"
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
  | "pv-self-consumption-rate"
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
  | "break-even-year"
  | "priority-profile"
  | "ranking-score"
  | "rse-ranking-method"
  | "mcda"
  | "rse-energy-saved-per-eur"
  | "rse-total-energy-savings"
  | "rse-co2-reduced-per-eur"
  | "rse-total-co2-reduction"
  | "rse-renovatable-buildings";

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

const STOCK_SCALING_CAVEAT =
  "Estimated by multiplying representative building results by the number of properties. Apartment results are first scaled to one flat by floor area; Single-Family and Multi-Family Houses use whole-building results.";

export const relifeConcepts: Record<ConceptId, ReLifeConcept> = {
  "gas-tariff": {
    id: "gas-tariff",
    label: "Gas tariff",
    description:
      "Price per gross kWh of natural gas used to value carrier savings.",
    unit: "€/kWh",
  },
  "modeled-property": {
    id: "modeled-property",
    label: "Properties",
    unit: "properties",
    description:
      "One property is one Apartment or one whole Single-Family or Multi-Family House. A Multi-Family House represents the owner renovating the entire residential building, including all family units.",
  },
  "total-floor-area": {
    id: "total-floor-area",
    label: "Total floor area (m²)",
    description:
      "Floor area of all floors added together. For an apartment, the floor area of the flat.",
  },
  "apartment-floor-area": {
    id: "apartment-floor-area",
    label: "Apartment floor area (m²)",
    description:
      "Floor area of the individual flat within the reference building.",
    caveat:
      "The flat's share of the reference building's simulated energy use is estimated by floor area.",
  },
  "annual-building-thermal-needs": {
    id: "annual-building-thermal-needs",
    label: "Annual building thermal needs",
    description:
      "Heat that must be added or removed each year to keep rooms at the temperatures used in the calculation.",
    unit: "kWh thermal/year",
    caveat:
      "These are heating and cooling needs before accounting for equipment efficiency or solar electricity.",
    professionalDetail:
      "Needs depend on the building, weather, airflow, heat from people and appliances, and temperature settings.",
  },
  "system-energy-consumption": {
    id: "system-energy-consumption",
    label: "System energy consumption",
    description:
      "Energy supplied for heating and cooling each year, after accounting for system efficiency and solar electricity used on site.",
    unit: "kWh delivered/year",
    caveat: "Hot water, lighting and appliances are not included.",
    professionalDetail:
      "Energy savings are used in the financial analysis when comparable before-and-after results are available.",
  },
  "recovered-loss-fraction": {
    id: "recovered-loss-fraction",
    label: "Heat recovery share",
    description:
      "How much heat released by equipment or pipes is counted as heat inside the building. For example, 0.8 means 80%. This heat reduces heating needs but adds to cooling needs.",
  },
  "auxiliary-electricity-fraction": {
    id: "auxiliary-electricity-fraction",
    label: "Extra electricity factor",
    description:
      "Estimates electricity used by supporting equipment, such as pumps and fans. For example, 0.005 means 0.5% of the energy amount for that part of the system.",
  },
  "primary-energy": {
    id: "primary-energy",
    label: "Primary energy",
    description:
      "Energy needed to supply the building's heating and cooling, including energy used to produce and deliver that energy.",
    unit: "kWh primary/year",
    caveat:
      "Hot water, lighting and appliances are not included. This is not a whole-building energy certificate result.",
  },
  "energy-intensity": {
    id: "energy-intensity",
    label: "Energy intensity",
    description:
      "Annual energy use or need per square metre of floor area, for comparison across buildings.",
    unit: "kWh/m²/year",
  },
  "pv-generation": {
    id: "pv-generation",
    label: "PV generation",
    description: "Solar electricity generated by the panels over a full year.",
    unit: "kWh/year",
  },
  "pv-self-consumption": {
    id: "pv-self-consumption",
    label: "PV self-consumption",
    description:
      "Solar electricity used on site for heating and cooling over a full year.",
    unit: "kWh/year",
    professionalDetail:
      "Only electricity used at the same time it is generated counts as self-consumption.",
  },
  "pv-grid-export": {
    id: "pv-grid-export",
    label: "PV grid export",
    description:
      "Solar electricity left to send to the grid after meeting the heating and cooling needs in the calculation.",
    unit: "kWh/year",
  },
  "pv-self-consumption-rate": {
    id: "pv-self-consumption-rate",
    label: "PV self-consumption rate",
    description:
      "Percentage of the solar electricity generated that is used on site for heating and cooling.",
    unit: "%",
  },
  "operational-co2-emissions": {
    id: "operational-co2-emissions",
    label: "CO₂ emissions",
    description:
      "The greenhouse gases released each year to produce the energy your heating and cooling use.",
    unit: "t CO₂e/year",
    caveat:
      "Hot water, lighting, appliances and renovation materials are not included.",
    professionalDetail:
      "The estimate accounts for the greenhouse gases released by each energy source, including solar electricity used in the building. Sending electricity to the grid does not reduce this estimate.",
  },
  "thermal-health-impact": {
    id: "thermal-health-impact",
    label: "Health impact from indoor temperature",
    unit: "healthy-life days lost per person/year",
    description:
      "Estimated days of healthy life lost per person each year due to indoor temperatures that are too cold or too hot.",
    professionalDetail:
      "The model assumes health harm from daily average indoor temperatures below 20 °C or above 26 °C. Results are converted from disability-adjusted life years (DALYs): one DALY is one year of healthy life lost through illness or early death.",
    caveat:
      "The number is an average across a population, rather than a forecast for one resident.",
  },
  "embodied-carbon": {
    id: "embodied-carbon",
    label: "Material carbon",
    description:
      "Estimated one-off greenhouse gas emissions associated with the materials and equipment installed in the renovation.",
    unit: "t CO₂e",
    caveat:
      "Uses standard material choices, not the specific products you would buy. It does not include every stage from making materials to disposing of them.",
    professionalDetail:
      "The estimate assumes polystyrene (EPS) insulation and PVC window frames. Heating equipment and solar panels use the same sizes as the cost estimate; solar panel size follows the simulated roof and is scaled to the home like its energy output. Solar inverters, installation, maintenance, replacements and disposal are not counted.",
  },
  "whole-life-carbon": {
    id: "whole-life-carbon",
    label: "Lifetime carbon",
    description:
      "Estimated material emissions plus heating and cooling emissions over the analysis period.",
    unit: "t CO₂e",
    caveat:
      "Uses the same number of years as the financial results and assumes the same emissions every year. This is a total, not a saving. It does not include every stage from making materials to disposing of them.",
    professionalDetail:
      "Annual heating and cooling emissions are multiplied by the number of years, then added to material emissions. The calculation does not allow for energy supplies becoming cleaner in future.",
  },
  investment: {
    id: "investment",
    label: "Investment",
    description: "Upfront renovation cost used in the financial calculation.",
    unit: "EUR",
    professionalDetail:
      "Also referred to as CAPEX or capital expenditure in professional financial outputs.",
  },
  "annual-maintenance-cost": {
    id: "annual-maintenance-cost",
    label: "Annual maintenance cost",
    description: "Yearly cost to run and maintain the renovated systems.",
    unit: "EUR/year",
    professionalDetail:
      "Also referred to as annual O&M (operation and maintenance) cost in professional financial outputs.",
  },
  "own-funds": {
    id: "own-funds",
    label: "Own funds",
    description:
      "Paying for the renovation with your own money, without borrowing. Any subsidy is applied first, and the rest is paid at the start of the project.",
  },
  "renovation-loan": {
    id: "renovation-loan",
    label: "Loan",
    description:
      "Borrowing part of the renovation cost and repaying it over a fixed number of years. Any subsidy is applied first, and the loan covers a share of what is left.",
    caveat:
      "The calculation tries different possible interest rates. These are estimates, not rates offered by a lender.",
    professionalDetail:
      "The amount not covered by the subsidy or loan is paid at the start.",
  },
  "upfront-subsidy": {
    id: "upfront-subsidy",
    label: "Subsidy",
    description:
      "A grant or public contribution that lowers the renovation cost at the start, entered either as a share of the cost or as a fixed amount.",
    caveat:
      "The grant is subtracted from the renovation cost before calculating how much you borrow and how much you could earn or save.",
  },
  npv: {
    id: "npv",
    label: "Net Present Value",
    description:
      "Expected savings and income minus costs, including the initial payment, expressed in today's money.",
    unit: "EUR",
    caveat:
      "A positive value means expected savings and income are worth more than the costs, taking account of when money is paid and received.",
  },
  irr: {
    id: "irr",
    label: "Internal Rate of Return",
    description:
      "Estimated yearly percentage return on the money invested, based on when money is paid and received.",
    unit: "%",
  },
  roi: {
    id: "roi",
    label: "Return on Investment",
    description:
      "Profit over the years included in the calculation, after subtracting costs, as a percentage of the money invested.",
    unit: "%",
  },
  "payback-period": {
    id: "payback-period",
    label: "Payback Period",
    description:
      "Estimated years until savings and income, after ongoing costs, cover the money paid at the start.",
    unit: "years",
    caveat:
      "This treats money saved in later years as worth the same as money saved today.",
  },
  "discounted-payback-period": {
    id: "discounted-payback-period",
    label: "Discounted Payback Period",
    description:
      "Estimated years until savings and income, after ongoing costs and adjusted to today's money, cover the money paid at the start.",
    unit: "years",
    professionalDetail:
      "This treats money saved in later years as worth less than money saved today.",
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
      "Average money saved or earned each month after maintenance and loan payments, over the years included in the calculation. The money paid at the start is not included.",
    unit: "EUR/month",
    caveat:
      "Use this as a comparison estimate, not as a monthly bill forecast.",
  },
  "success-probability": {
    id: "success-probability",
    label: "Success Probability",
    description:
      "Percentage of simulated results where savings and income are worth more than the costs in today's money. This means a positive Net Present Value.",
    unit: "%",
    caveat:
      "The result depends on the simulation assumptions and does not guarantee a profit.",
    professionalDetail:
      "Simulations test different energy prices, inflation and interest rates.",
  },
  "break-even-year": {
    id: "break-even-year",
    label: "Break-even Year",
    description:
      "First year when total savings and income so far cover total costs so far.",
    unit: "year",
  },
  "priority-profile": {
    id: "priority-profile",
    label: "Priority profile",
    description:
      "Your priorities for balancing cost, health, energy, renewable energy and environmental outcomes.",
    professionalDetail:
      "Higher priorities carry more weight when comparing renovation packages.",
  },
  "ranking-score": {
    id: "ranking-score",
    label: "Ranking score",
    description:
      "How well a package matches the selected priority profile compared with the other packages.",
    unit: "%",
    caveat:
      "Scores depend on the packages compared and the ranking method used by each tool.",
    professionalDetail:
      "A higher score indicates a better match to the selected priorities.",
  },
  "rse-ranking-method": {
    id: "rse-ranking-method",
    label: "How this ranking is calculated",
    description:
      "Packages are compared on results such as payback, energy savings and emissions reductions. The selected goal determines how much each result counts; the highest combined score ranks first.",
    caveat:
      "Scores are relative to the packages shown. Adding or removing packages can change the ranking.",
  },
  mcda: {
    id: "mcda",
    label: "MCDA",
    description:
      "Multi-Criteria Decision Analysis compares renovation packages across several outcomes using your selected priorities.",
    caveat:
      "The environmental assessment includes both material emissions and heating and cooling emissions over the analysis period.",
    professionalDetail:
      "The comparison combines energy, renewable energy, environmental, health and financial results. Scores depend on the packages being compared. If heating and cooling emissions are unavailable, they are left out of the score.",
  },
  "rse-energy-saved-per-eur": {
    id: "rse-energy-saved-per-eur",
    label: "Primary energy saved per euro",
    description:
      "Annual primary energy savings for each euro of upfront renovation cost after subsidy. Maintenance costs are excluded.",
    unit: "kWh/€",
  },
  "rse-total-energy-savings": {
    id: "rse-total-energy-savings",
    label: "Total annual primary energy savings",
    description:
      "Estimated annual primary energy savings across all selected properties for one renovation package.",
    unit: "kWh/year",
    caveat: STOCK_SCALING_CAVEAT,
  },
  "rse-co2-reduced-per-eur": {
    id: "rse-co2-reduced-per-eur",
    label: "CO₂ reduced per euro",
    description:
      "Annual emissions reduction for each euro of upfront renovation cost after subsidy. Maintenance costs are excluded.",
    unit: "kg CO₂e/€",
  },
  "rse-total-co2-reduction": {
    id: "rse-total-co2-reduction",
    label: "Total annual CO₂ reduction",
    description:
      "Estimated annual heating and cooling emissions reduction across all selected properties for one renovation package.",
    unit: "t CO₂e/year",
    caveat: STOCK_SCALING_CAVEAT,
  },
  "rse-renovatable-buildings": {
    id: "rse-renovatable-buildings",
    label: "Renovatable properties",
    description:
      "Number of properties that can be renovated within the specified budget when using a given package.",
    unit: "properties",
    caveat:
      "Assumes the same mix of properties is renovated, rather than choosing the cheapest first. Subsidies are assumed to come from outside the renovation budget; if they come from the same budget, fewer properties can be renovated.",
  },
};

const envelopeMeasureEffect = (
  measureId: RenovationMeasureId,
  surface: string,
): MeasureEffectProfile => ({
  measureId,
  summary: `${surface} improvement can reduce the building's heating and cooling needs.`,
  affects: [
    {
      kind: "lowers",
      conceptId: "annual-building-thermal-needs",
      label: "Can lower thermal needs",
      description:
        "Reducing heat loss or heat gain can lower the heating or cooling needed to maintain indoor temperatures.",
    },
    {
      kind: "indirectly-lowers",
      conceptId: "system-energy-consumption",
      label: "Can indirectly lower system energy",
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
  summary: `${system} changes how much electricity or fuel is used to provide the heating the building needs.`,
  affects: [
    {
      kind: "lowers",
      conceptId: "system-energy-consumption",
      label: "Can lower system energy",
      description:
        "A more efficient system can use less electricity or fuel to provide the same amount of heating.",
    },
  ],
  doesNotAffect: [
    {
      kind: "does-not-lower",
      conceptId: "annual-building-thermal-needs",
      label: "Does not lower thermal needs",
      description:
        "Changing equipment efficiency does not change the modeled amount of heat that must be added or removed.",
    },
  ],
  professionalDetail:
    "Savings on energy costs can be estimated when energy use before and after renovation can be compared.",
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
          "Solar electricity used on site can reduce grid electricity needed for heating and cooling.",
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
      "Solar panel results depend on roof size, the direction panels face, shade, weather and how much of the electricity is used in the building.",
  },
  "solar-thermal": {
    measureId: "solar-thermal",
    summary: "This tool does not currently assess solar thermal systems.",
    affects: [],
    doesNotAffect: [
      {
        kind: "not-analyzed",
        label: "Not currently analyzed",
        description:
          "Solar thermal is excluded from the simulation and ranking.",
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
  MonthlyAvgSavings: "monthly-cash-benefit",
  SuccessRate: "success-probability",
  CAPEX: "investment",
  ARV: "arv",
  BreakEven: "break-even-year",
  EnergyReduction: "annual-building-thermal-needs",
} as const satisfies Record<string, ConceptId>;
