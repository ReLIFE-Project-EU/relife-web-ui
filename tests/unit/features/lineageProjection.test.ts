import { describe, expect, test } from "vitest";
import { projectLineage } from "../../../src/features/lineage/projectLineage";
import type { AuditPayloads } from "../../../src/types/auditEvents";
import type { AuditEvent } from "../../../src/utils/auditLogger";

function event<E extends keyof AuditPayloads>(
  name: E,
  data: AuditPayloads[E],
  scenarioId?: string,
): AuditEvent {
  return {
    ts: "2026-10-09T00:00:00.000Z",
    level: "debug",
    category: "pipeline",
    event: name,
    scope: "hra",
    runId: "hra-run",
    scenarioId,
    data,
  };
}

const scaled = {
  hvacTotal: 25429,
  deliveredTotal: undefined,
  carrierBreakdown: undefined,
};

describe("projectLineage", () => {
  // The modified path logs the reference building and the simulated one; the
  // lineage must explain the simulated one whatever the emit order.
  test("energy profile uses the simulated building over its reference", () => {
    const summary = (basis: "archetype" | "custom", archetypeArea: number) =>
      event("energy.simulation.summary", {
        basis,
        archetypeArea,
        userArea: 100,
        areaScaleFactor: 100 / archetypeArea,
        annualTotalsRaw: { Q_HC_total: 25429, deliveredTotal: undefined },
        scaled,
        uniSummary: undefined,
      });

    const { energyProfile } = projectLineage([
      summary("custom", 120),
      summary("archetype", 165.4),
    ]);

    const areaRow = energyProfile
      .find((step) => step.title === "Scaled to floor area")
      ?.tables[0].rows.find((row) => row.label === "Simulated floor area (m²)");
    expect(areaRow?.values).toEqual([120]);
  });

  // Going back and re-evaluating appends to the same run; stale packages must
  // not show up as columns, and a package missing its energy must not hide
  // the others.
  test("renovation columns come from the latest evaluation only", () => {
    const start = (id: string, label: string) =>
      event(
        "renovation.scenario.start",
        { packageLabel: label, measureIds: [] },
        id,
      );
    const scaling = (id: string) =>
      event(
        "renovation.ecm.scaling",
        {
          userArea: 100,
          archetypeFloorArea: 100,
          areaScaleFactor: 1,
          raw: { hvacTotal: 25429, deliveredTotal: undefined },
          scaled: { ...scaled, pvSelfConsumption: undefined },
          uniSummary: undefined,
        },
        id,
      );

    const { renovation } = projectLineage([
      event("renovation.evaluate.start", { packageIds: ["old"] }),
      start("current", "Current Status"),
      start("old", "Old package"),
      scaling("current"),
      scaling("old"),
      event("renovation.evaluate.start", { packageIds: ["windows"] }),
      start("current", "Current Status"),
      start("windows", "Windows"),
      scaling("current"),
    ]);

    const simulated = renovation.find(
      (step) => step.title === "Simulated building",
    );
    expect(simulated?.tables[0].columns).toEqual(["Current Status", "Windows"]);
  });
});
