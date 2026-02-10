import type { MCDAPersona } from "../../types";

export const MCDA_PERSONAS: MCDAPersona[] = [
  {
    id: "environmentally-conscious",
    name: "Environmentally Conscious",
    description: "Prioritizes sustainability and renewable energy integration",
    weights: {
      sustainability: 0.333,
      resIntegration: 0.267,
      energyEfficiency: 0.2,
      userComfort: 0.133,
      financial: 0.067,
    },
  },
  {
    id: "comfort-driven",
    name: "Comfort-Driven",
    description: "Prioritizes indoor comfort and energy efficiency",
    weights: {
      userComfort: 0.333,
      energyEfficiency: 0.267,
      financial: 0.2,
      sustainability: 0.133,
      resIntegration: 0.067,
    },
  },
  {
    id: "cost-optimization",
    name: "Cost-Optimization Oriented",
    description: "Prioritizes financial returns and cost savings",
    weights: {
      financial: 0.333,
      energyEfficiency: 0.267,
      resIntegration: 0.2,
      userComfort: 0.133,
      sustainability: 0.067,
    },
  },
];
