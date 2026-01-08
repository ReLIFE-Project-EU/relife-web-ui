/**
 * Mock Renovation Service
 * Provides renovation packages, cost calculations, and scenario evaluation.
 *
 * NOTE: In production, this would integrate with the technical service API
 * for retrieving packages and calculating improvements.
 */

import type {
  BuildingInfo,
  EstimationResult,
  PackageId,
  RenovationScenario,
  ScenarioId,
} from "../../context/types";
import type {
  IRenovationService,
  RenovationIntervention,
  RenovationPackage,
} from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// Renovation Packages Data
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// EPC Improvement Mapping
// ─────────────────────────────────────────────────────────────────────────────

const EPC_ORDER = ["G", "F", "E", "D", "C", "B", "A", "A+"];

function improveEPC(currentEPC: string, improvement: number): string {
  const currentIndex = EPC_ORDER.indexOf(currentEPC);
  if (currentIndex === -1) return currentEPC;

  // Each 1.0 improvement = 1 class improvement
  const newIndex = Math.min(
    currentIndex + Math.round(improvement),
    EPC_ORDER.length - 1,
  );
  return EPC_ORDER[newIndex];
}

// ─────────────────────────────────────────────────────────────────────────────
// Service Implementation
// ─────────────────────────────────────────────────────────────────────────────

export class MockRenovationService implements IRenovationService {
  getPackages(): RenovationPackage[] {
    return RENOVATION_PACKAGES;
  }

  getPackage(packageId: PackageId): RenovationPackage | undefined {
    return RENOVATION_PACKAGES.find((p) => p.id === packageId);
  }

  calculateCost(
    packageId: PackageId,
    selectedInterventionIds: string[],
    floorArea: number,
  ): number {
    const pkg = this.getPackage(packageId);
    if (!pkg) return 0;

    const selectedInterventions = pkg.interventions.filter((i) =>
      selectedInterventionIds.includes(i.id),
    );

    const costPerSqm = selectedInterventions.reduce(
      (sum, i) => sum + i.costPerSqm,
      0,
    );
    return costPerSqm * floorArea;
  }

  getDefaultInterventions(packageId: PackageId): string[] {
    const pkg = this.getPackage(packageId);
    if (!pkg) return [];

    return pkg.interventions.filter((i) => i.defaultSelected).map((i) => i.id);
  }

  async evaluateScenarios(
    _building: BuildingInfo, // Used for future integration with backend
    estimation: EstimationResult,
    selectedPackages: PackageId[],
    interventions: Record<PackageId, string[]>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _costs: Record<PackageId, number>, // Used by financial service, not in this calculation
  ): Promise<RenovationScenario[]> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 600));

    const scenarios: RenovationScenario[] = [];

    // Current scenario (baseline)
    const currentScenario: RenovationScenario = {
      id: "current",
      label: "Current Status",
      epcClass: estimation.estimatedEPC,
      annualEnergyNeeds: estimation.annualEnergyNeeds,
      annualEnergyCost: estimation.annualEnergyCost,
      heatingCoolingNeeds: estimation.heatingCoolingNeeds,
      flexibilityIndex: estimation.flexibilityIndex,
      comfortIndex: estimation.comfortIndex,
      measures: [],
    };
    scenarios.push(currentScenario);

    // Map package IDs to scenario IDs
    const packageToScenario: Record<PackageId, ScenarioId> = {
      soft: "mild",
      regular: "regular",
      deep: "deep",
    };

    // Generate scenarios for selected packages
    for (const packageId of selectedPackages) {
      const pkg = this.getPackage(packageId);
      if (!pkg) continue;

      const selectedInterventionIds = interventions[packageId] || [];
      const selectedInterventions = pkg.interventions.filter((i) =>
        selectedInterventionIds.includes(i.id),
      );

      // Calculate improvements
      const totalEnergySavings = selectedInterventions.reduce(
        (sum, i) => sum + i.energySavingsPercent,
        0,
      );
      const totalEPCImprovement = selectedInterventions.reduce(
        (sum, i) => sum + i.epcImpact,
        0,
      );

      // Apply improvements
      const savingsMultiplier = 1 - totalEnergySavings / 100;
      const newEnergyNeeds = Math.round(
        estimation.annualEnergyNeeds * savingsMultiplier,
      );
      const newEnergyCost = Math.round(
        estimation.annualEnergyCost * savingsMultiplier,
      );
      const newHeatingCooling = Math.round(
        estimation.heatingCoolingNeeds * savingsMultiplier,
      );

      // Comfort and flexibility improvements
      const comfortImprovement = Math.min(30, totalEnergySavings * 0.5);
      const flexibilityImprovement = Math.min(25, totalEnergySavings * 0.4);

      const scenario: RenovationScenario = {
        id: packageToScenario[packageId],
        label: pkg.name.replace(" Package", ""),
        epcClass: improveEPC(estimation.estimatedEPC, totalEPCImprovement),
        annualEnergyNeeds: newEnergyNeeds,
        annualEnergyCost: newEnergyCost,
        heatingCoolingNeeds: newHeatingCooling,
        flexibilityIndex: Math.min(
          100,
          estimation.flexibilityIndex + flexibilityImprovement,
        ),
        comfortIndex: Math.min(
          100,
          estimation.comfortIndex + comfortImprovement,
        ),
        measures: selectedInterventions.map((i) => i.name),
      };

      scenarios.push(scenario);
    }

    // Sort scenarios by improvement level
    const scenarioOrder: ScenarioId[] = ["current", "mild", "regular", "deep"];
    scenarios.sort(
      (a, b) => scenarioOrder.indexOf(a.id) - scenarioOrder.indexOf(b.id),
    );

    return scenarios;
  }
}

// Export singleton instance
export const mockRenovationService: IRenovationService =
  new MockRenovationService();
