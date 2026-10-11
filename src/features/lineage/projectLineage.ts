/**
 * Turns one run's audit trace into the lineage view's steps. The lineage
 * modules are the only readers of audit event names; they show logged values
 * and add no estimates.
 */

import type { AuditEvent } from "../../utils/auditLogger";
import {
  energyProfileColumn,
  fromEcmScaling,
  inputsStep,
  referenceStep,
  scaledStep,
  simulatedStep,
} from "./energySteps";
import type { BuildingLineage, LineageStep } from "./lineageModel";
import {
  appraisalStep,
  energyCostStep,
  packagesStep,
  perScenario,
  scenarioColumns,
} from "./renovationSteps";

function compact(steps: (LineageStep | null)[]): LineageStep[] {
  return steps.filter((step): step is LineageStep => step !== null);
}

export function projectLineage(events: AuditEvent[]): BuildingLineage {
  const profile = energyProfileColumn(events);
  const scenarios = scenarioColumns(events);
  const renovationEnergy = perScenario(scenarios, "renovation.ecm.scaling").map(
    (scaling) => scaling && fromEcmScaling(scaling),
  );
  const hasRenovationEnergy = renovationEnergy.some(Boolean);
  const labels = scenarios.map((s) => s.label);

  return {
    energyProfile: compact([
      inputsStep(events),
      referenceStep(events),
      profile ? simulatedStep([], [profile]) : null,
      profile ? scaledStep([], [profile]) : null,
    ]),
    renovation: compact([
      packagesStep(scenarios),
      hasRenovationEnergy ? simulatedStep(labels, renovationEnergy) : null,
      hasRenovationEnergy ? scaledStep(labels, renovationEnergy) : null,
      energyCostStep(scenarios),
      appraisalStep(scenarios, events),
    ]),
  };
}
