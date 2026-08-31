import type { RenovationMeasureId } from "../types/renovation";

export type ConceptId =
  | "annual-building-thermal-needs"
  | "system-energy-consumption"
  | "estimated-epc"
  | "scenario-epc-comparison-note"
  | "energy-intensity"
  | "pv-generation"
  | "pv-self-consumption"
  | "pv-grid-export"
  | "pv-self-consumption-rate"
  | "operational-co2-emissions"
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
      "Approximate energy class from modeled primary energy per floor area (UNI EP_total), shown for comparison.",
    caveat: "This is not an official Energy Performance Certificate.",
    professionalDetail:
      "Letter bands map primary-energy intensity (kWh/m²/year, the EU EPgl,nren basis) to approximate classes via resolveEpcRatingIntensity. Falls back to delivered energy, then to thermal needs, when primary energy is unavailable (e.g. heat-pump baselines without UNI data); in that fallback the class is rougher and does not fully reflect the heating fuel.",
  },
  "scenario-epc-comparison-note": {
    id: "scenario-epc-comparison-note",
    label: "Estimated EPC in scenario comparison",
    description:
      "Some columns include a heating-system upgrade and/or solar (PV). The estimated class is derived from modeled primary energy per m² (UNI EP_total). Heating-system upgrades change that primary-energy figure, so they can move the class. Solar (PV) self-consumption lowers delivered energy and running costs, but is not netted out of the primary-energy figure the class is based on — so a PV package can save money and grid electricity without changing the estimated class. This is not an official Energy Performance Certificate.",
  },
  "energy-intensity": {
    id: "energy-intensity",
    label: "Energy intensity",
    description:
      "Annual energy result divided by building floor area for easier comparison across buildings.",
    unit: "kWh/m²/year",
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
  "operational-co2-emissions": {
    id: "operational-co2-emissions",
    label: "CO₂ emissions",
    description:
      "The greenhouse gases released each year to produce the energy your heating and cooling use.",
    unit: "t CO₂e/year",
    caveat:
      "Hot water, lighting, and appliances are not counted, and neither is the carbon released in making and installing the renovation materials themselves. Figures are based on how electricity and gas are typically produced in your country, or on a European average when figures for your country aren't available.",
    professionalDetail:
      "Per-carrier calculation from the delivered-energy split: natural gas and net grid electricity at the Forecasting service's country factors (kgCO₂eq/kWh), plus self-consumed PV at the solar_pv lifecycle factor. Grid import is already net of PV self-consumption; grid export is not credited.",
  },
  "embodied-carbon": {
    id: "embodied-carbon",
    label: "Material carbon",
    description:
      "The greenhouse gases released to make and deliver the materials and equipment a renovation installs. Unlike the emissions from running your home, this is a one-off amount, paid when the work is done.",
    unit: "t CO₂e",
    caveat:
      "An estimate from European average figures, not a quote for the products you would actually buy. It assumes EPS boards for insulation and PVC frames for windows, with the panel thickness and glazing worked out from the energy performance the renovation is modelled to reach. Solar panel inverters are not counted, and neither is installation, transport to site, maintenance or disposal.",
    professionalDetail:
      "Embodied carbon (kgCO₂e) from the ReLIFE technical sheets, aggregated per package. Envelope measures take the panel thickness or glazing that meets the ECM engine's element U-value targets against the archetype's area-weighted baseline U, extrapolating linearly past the sheet's thickest row; heating capacity and PV array size come from the same floor-area heuristics used for CAPEX. Figures are European averages with no country breakdown, module boundary or EPD references. The PV inverter row (1040 kgCO₂e per 3 kW unit) is excluded as an implausible outlier against published EPDs.",
  },
  "whole-life-carbon": {
    id: "whole-life-carbon",
    label: "Lifetime carbon",
    description:
      "Material carbon and yearly emissions in one figure: the one-off carbon of the materials, plus each year's heating and cooling emissions added up over the period the renovation is appraised for. It shows what a renovation costs in carbon alongside what it goes on to emit.",
    unit: "t CO₂e",
    caveat:
      "This is a total, not a saving, so every option shows a positive number and the lower one is better. The period is the project lifetime behind the financial results, 20 years unless you change it, not the life of the building. It inherits the limits of both halves: only the manufacture of the materials is counted, with nothing for transport, installation, maintenance, replacements or disposal, and only heating and cooling on the running side, leaving out hot water, lighting and appliances. Electricity and gas are assumed to stay as carbon-intensive as they are today, so a grid that cleans up over time would bring the real figure down.",
    professionalDetail:
      "Material carbon (kgCO₂e) plus annual operational emissions × 1000 × project lifetime, held per building in kgCO₂e and aggregated in tonnes across the stock for RSE. The horizon is the Financial service's project_lifetime (RSE: financialAssumptions.projectLifetimeYears), an appraisal period rather than a service life. Module coverage is partial and asymmetric: product stage only on the material side, from the ReLIFE technical sheets, plus operational energy on the other, restricted to HVAC end uses because the carrier split derives from delivered heating and cooling energy. Transport, installation, maintenance, replacement and end-of-life are absent, as is any discounting of future emissions or grid-decarbonization trajectory. Undefined whenever the material figure, the annual emissions or the horizon is missing, so a gap never reads as a smaller total.",
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
    description:
      "Recurring yearly cost to operate and maintain the renovated systems.",
    unit: "EUR/year",
    professionalDetail:
      "Also referred to as annual O&M (operation and maintenance) cost in professional financial outputs.",
  },
  "own-funds": {
    id: "own-funds",
    label: "Own funds",
    description:
      "Paying for the renovation outright, without borrowing. Any subsidy is applied first, and the rest is paid at the start of the project.",
    professionalDetail:
      "Sent to the Financial service as the `equity` scheme. It carries no amount of its own: the modeled outflow at year 0 is the whole post-subsidy CAPEX.",
  },
  "renovation-loan": {
    id: "renovation-loan",
    label: "Loan",
    description:
      "Borrowing part of the renovation cost and repaying it over a fixed number of years. Any subsidy is applied first, and the loan covers a share of what is left.",
    caveat:
      "The interest rate is not something you enter. The Financial service models it from market conditions, testing a range of rates rather than assuming a single one.",
    professionalDetail:
      "Sent as the `bank_loan` scheme with `loan_amount` and `term_years`. The service samples the rate stochastically (roughly 2.5-5.5%) and amortises the principal straight-line, so year 0 shows only the equity remainder.",
  },
  "upfront-subsidy": {
    id: "upfront-subsidy",
    label: "Subsidy",
    description:
      "A grant or public contribution that lowers the renovation cost at the start, entered either as a share of the cost or as a fixed amount.",
    caveat:
      "The subsidy is subtracted from the renovation cost before anything else is worked out, so every financial result shown is based on what you actually pay, not on the full cost.",
    professionalDetail:
      "The Financial service has no subsidy field, so the grant is netted off `capex` client-side. NPV, IRR, ROI, PBP and DPP are therefore all computed on the net investment.",
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
    caveat:
      "This is a modeled probability from simulating uncertain energy prices, inflation and interest rates — not a guarantee that the renovation will be profitable.",
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
    caveat:
      "The exact method depends on the tool. HRA/PRA use the Technical service MCDA/TOPSIS workflow; RSE uses a browser-side normalized weighted score with interim MVP weights.",
    professionalDetail:
      "For HRA/PRA the score comes from the Technical service MCDA/TOPSIS workflow. For RSE it is computed by normalizing metrics across the compared packages and applying goal-specific interim weights.",
  },
  "rse-ranking-method": {
    id: "rse-ranking-method",
    label: "How this ranking is calculated",
    description:
      "Each renovation package is compared with the others for every measure, like payback period, energy saved, or CO2 reduced. For each measure, the best package gets a score of 1 and the others score in proportion to it, counting up from zero. For example, if three packages save 2,000, 5,000, and 8,000 kWh per year, they would get scores of 0.25, 0.625, and 1—a package that saves nearly as much as the best keeps nearly the same score. A package that loses money scores 0 on that measure, because breaking even is the bottom of the scale. Then, these scores are weighted according to the chosen goal (financial, energy, or emissions), added up, and the package with the highest total ranks first.",
    caveat:
      "The weights are planning assumptions chosen to reflect the selected goal. They are not fixed rules and may be refined in future updates. Scores are measured against the best package in the current comparison, so adding or removing a package can change them — they show how the options shown compare, not how good a package is in absolute terms.",
  },
  mcda: {
    id: "mcda",
    label: "MCDA",
    description:
      "Professional multi-criteria method used behind the recommendation ranking.",
    caveat:
      "The environmental criterion counts both sides of the carbon picture: the one-off carbon of the renovation materials, and the emissions your home still produces over the period analysed. Material carbon separates options that perform similarly rather than counting against the deeper ones. Read it alongside the energy and CO₂ figures.",
    professionalDetail:
      "Multi-Criteria Decision Analysis combines energy, renewable-integration, sustainability, comfort and financial criteria using persona weights. The sustainability pillar sends both of its KPIs: embodied carbon from the ReLIFE technical sheets, and GWP as lifetime carbon (material carbon plus operational emissions across the project lifetime). Both share one normalization scale, from zero to the largest lifetime figure among the alternatives, because material carbon is a component of that total and independent min/max normalization would give a term worth a few percent of it equal weight. When operational emissions are unavailable the GWP KPI is neutralized for that run: it then contributes an identical constant to every alternative and drops out of the TOPSIS distances.",
  },
  "rse-energy-saved-per-eur": {
    id: "rse-energy-saved-per-eur",
    label: "Primary energy saved per euro",
    description:
      "Annual primary energy savings (UNI EP_total) divided by total upfront investment (CAPEX, excluding maintenance). Carrier-neutral so envelope and fuel-switch packages compare fairly.",
    unit: "kWh/€",
  },
  "rse-total-energy-savings": {
    id: "rse-total-energy-savings",
    label: "Total annual primary energy savings",
    description:
      "Aggregate primary energy savings (UNI EP_total) across the entire building stock for one renovation package.",
    unit: "kWh/year",
    caveat:
      "Modeled estimate: a representative archetype simulation scaled by the number of buildings, not a measured stock total.",
  },
  "rse-co2-reduced-per-eur": {
    id: "rse-co2-reduced-per-eur",
    label: "CO₂ reduced per euro",
    description:
      "Annual CO₂ reduction divided by total upfront investment (CAPEX, excluding maintenance). A higher value means more emissions are avoided for each euro invested.",
    unit: "kg CO₂e/€",
  },
  "rse-total-co2-reduction": {
    id: "rse-total-co2-reduction",
    label: "Total annual CO₂ reduction",
    description:
      "Aggregate CO₂ emissions reduction across the entire building stock for one renovation package.",
    unit: "t CO₂e/year",
    caveat:
      "Modeled estimate: a representative archetype simulation scaled by the number of buildings, not a measured stock total.",
  },
  "rse-renovatable-buildings": {
    id: "rse-renovatable-buildings",
    label: "Renovatable buildings",
    description:
      "Number of buildings that can be renovated within the specified budget when using a given package.",
    unit: "buildings",
    caveat:
      "Computed with proportional stock scaling, not by selecting cheapest archetypes first. The budget is treated as covering the owner's share only: any subsidy is assumed to be funded from outside it, so a subsidy makes the budget reach further. If the subsidy would instead come out of this same budget, the figure is optimistic.",
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
