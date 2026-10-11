/**
 * Payload contracts for the audit events the lineage view reads
 * (src/features/lineage). `auditLog` checks every emit of these events against
 * the map; other events stay untyped. Payloads list only the fields readers
 * use, so emitters may log more.
 */

import type { ArchetypeMatchStrategy } from "../services/archetypeMatching";
import type { BuildingPayload } from "./archetype";
import type { DeliveredEnergyCarrierBreakdown } from "./energy";
import type { ECMApplicationParams, UNI11300Summary } from "./forecasting";
import type { RiskSkippedReason } from "./renovation";

type Open<T> = T & Record<string, unknown>;

export type AuditPayloads = {
  "energy.estimate.start": Open<{
    country: string;
    buildingType: string;
    constructionPeriod: string;
    floorArea: number | null;
    numberOfFloors: number | null;
    modificationKeys: string[];
  }>;
  "energy.archetype.resolved": Open<{
    archetype: { name: string; category: string; country: string };
    matchStrategy: ArchetypeMatchStrategy;
  }>;
  "energy.archetype.details": {
    catalogueBui: BuildingPayload;
    modifiedBui: BuildingPayload | undefined;
    uni11300Config: unknown;
  };
  "energy.simulation.summary": Open<{
    basis: "archetype" | "custom";
    archetypeArea: number;
    userArea: number;
    areaScaleFactor: number;
    annualTotalsRaw: Open<{
      Q_HC_total: number;
      deliveredTotal: number | undefined;
    }>;
    scaled: Open<{
      hvacTotal: number;
      deliveredTotal: number | undefined;
      carrierBreakdown: DeliveredEnergyCarrierBreakdown | undefined;
    }>;
    uniSummary: UNI11300Summary | undefined;
  }>;
  "renovation.evaluate.start": Open<{ packageIds: string[] }>;
  "renovation.scenario.start": Open<{
    packageLabel: string;
    measureIds: string[];
  }>;
  "renovation.ecm.params": { ecmParams: ECMApplicationParams };
  "renovation.ecm.scaling": Open<{
    userArea: number;
    archetypeFloorArea: number;
    areaScaleFactor: number;
    raw: Open<{ hvacTotal: number; deliveredTotal: number | undefined }>;
    scaled: Open<{
      hvacTotal: number;
      deliveredTotal: number | undefined;
      carrierBreakdown: DeliveredEnergyCarrierBreakdown | undefined;
      pvSelfConsumption: number | undefined;
    }>;
    uniSummary: UNI11300Summary | undefined;
  }>;
  "financial.run.start": Open<{ projectLifetime: number }>;
  "financial.savings.computed": Open<{
    canUseCarrierPricing: boolean;
    baselineCarrierBreakdown: DeliveredEnergyCarrierBreakdown | undefined;
    scenarioCarrierBreakdown: DeliveredEnergyCarrierBreakdown | undefined;
    annualSavingsEur: number;
    electricityEquivalentKwh: number;
    gasTariffEurPerKwh: number;
    electricityReferencePriceEurPerKwh: number;
    renovationCost: number;
    subsidyAmount: number;
    effectiveCost: number;
    loanAmount: number;
    loanTerm: number;
  }>;
  "financial.risk.skipped": Open<{ reason: RiskSkippedReason | undefined }>;
  "financial.scenario.end":
    | Open<{ kind: "current" }>
    | Open<{
        kind?: undefined;
        capitalExpenditure: number;
        annualMaintenanceCost: number | undefined;
        monthlyAvgSavings: number | undefined;
      }>;
};
