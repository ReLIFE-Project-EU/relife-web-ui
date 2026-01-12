import type { RenovationIntervention, RenovationPackage } from "../../types";

const SOFT_INTERVENTIONS: RenovationIntervention[] = [
  {
    id: "wall-insulation-l2",
    name: "Wall Insulation - Level 2",
    description: "External wall insulation (6-8cm EPS/mineral wool)",
    costPerSqm: 80,
    energySavingsPercent: 15,
    epcImpact: 0.5,
    defaultSelected: true,
  },
  {
    id: "fenestration-l1",
    name: "Fenestration - Level 1",
    description: "Window sealing, weather stripping, draft-proofing",
    costPerSqm: 30,
    energySavingsPercent: 5,
    epcImpact: 0.2,
    defaultSelected: true,
  },
];

const REGULAR_INTERVENTIONS: RenovationIntervention[] = [
  {
    id: "wall-insulation-l2-r",
    name: "Wall Insulation - Level 2",
    description: "External wall insulation (6-8cm EPS/mineral wool)",
    costPerSqm: 80,
    energySavingsPercent: 15,
    epcImpact: 0.5,
    defaultSelected: true,
  },
  {
    id: "fenestration-l2",
    name: "Fenestration - Level 2",
    description: "Double/triple glazed window replacement",
    costPerSqm: 120,
    energySavingsPercent: 12,
    epcImpact: 0.4,
    defaultSelected: true,
  },
  {
    id: "ahu-replacement",
    name: "AHU Replacement",
    description: "Air handling unit replacement with heat recovery",
    costPerSqm: 60,
    energySavingsPercent: 8,
    epcImpact: 0.3,
    defaultSelected: false,
  },
];

const DEEP_INTERVENTIONS: RenovationIntervention[] = [
  {
    id: "wall-insulation-l3",
    name: "Wall Insulation - Level 3",
    description: "Full external insulation system (12-16cm)",
    costPerSqm: 120,
    energySavingsPercent: 25,
    epcImpact: 0.8,
    defaultSelected: true,
  },
  {
    id: "fenestration-l3",
    name: "Fenestration - Level 3",
    description: "High-performance triple glazed windows",
    costPerSqm: 180,
    energySavingsPercent: 18,
    epcImpact: 0.6,
    defaultSelected: true,
  },
  {
    id: "hvac-replacement",
    name: "Heating & Cooling Equipment Replacement",
    description: "Heat pump installation, full system upgrade",
    costPerSqm: 200,
    energySavingsPercent: 35,
    epcImpact: 1.0,
    defaultSelected: true,
  },
];

export const RENOVATION_PACKAGES: RenovationPackage[] = [
  {
    id: "soft",
    name: "Soft Renovation Package",
    description:
      "Basic improvements with minimal disruption (up to 200 EUR/m²)",
    maxCostPerSqm: 200,
    defaultCostPerSqm: 180,
    interventions: SOFT_INTERVENTIONS,
  },
  {
    id: "regular",
    name: "Regular Renovation Package",
    description: "Comprehensive improvements (up to 400 EUR/m²)",
    maxCostPerSqm: 400,
    defaultCostPerSqm: 320,
    interventions: REGULAR_INTERVENTIONS,
  },
  {
    id: "deep",
    name: "Deep Renovation Package",
    description: "Complete building transformation (up to 800 EUR/m²)",
    maxCostPerSqm: 800,
    defaultCostPerSqm: 700,
    interventions: DEEP_INTERVENTIONS,
  },
];
