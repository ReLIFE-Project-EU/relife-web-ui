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
import type { IRenovationService, RenovationPackage } from "../types";
import {
  MOCK_COMFORT_IMPROVEMENT_FACTOR,
  MOCK_DELAY_RENOVATION,
  MOCK_FLEXIBILITY_IMPROVEMENT_FACTOR,
  MOCK_MAX_COMFORT_IMPROVEMENT,
  MOCK_MAX_FLEXIBILITY_IMPROVEMENT,
} from "./constants";
import { RENOVATION_PACKAGES } from "./data/renovationPackages";

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
    await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_RENOVATION));

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
      const comfortImprovement = Math.min(
        MOCK_MAX_COMFORT_IMPROVEMENT,
        totalEnergySavings * MOCK_COMFORT_IMPROVEMENT_FACTOR,
      );
      const flexibilityImprovement = Math.min(
        MOCK_MAX_FLEXIBILITY_IMPROVEMENT,
        totalEnergySavings * MOCK_FLEXIBILITY_IMPROVEMENT_FACTOR,
      );

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
