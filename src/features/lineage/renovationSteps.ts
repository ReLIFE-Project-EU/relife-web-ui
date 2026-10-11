import { computeCarrierAnnualCostEur } from "../../services/carrierSavingsService";
import type { AuditPayloads } from "../../types/auditEvents";
import type { DeliveredEnergyCarrierBreakdown } from "../../types/energy";
import type { AuditEvent } from "../../utils/auditLogger";
import { formatFixed } from "../../utils/formatters";
import {
  QUANTITY,
  conceptRow,
  latest,
  quantityRow,
  table,
} from "./lineageModel";
import type { LineageStep } from "./lineageModel";

const MONTHS_PER_YEAR = 12;

export interface ScenarioEvents {
  label: string;
  /** The unrenovated building: the scenario with no measures. */
  isBaseline: boolean;
  events: AuditEvent[];
}

/** Scenario columns from the last evaluation, in start order (current first). */
export function scenarioColumns(events: AuditEvent[]): ScenarioEvents[] {
  let start = -1;
  for (let i = events.length - 1; i >= 0 && start === -1; i--) {
    if (events[i].event === "renovation.evaluate.start") start = i;
  }
  if (start === -1) return [];

  const byScenario = new Map<string, ScenarioEvents>();
  for (const event of events.slice(start)) {
    if (event.scenarioId === undefined) continue;
    if (event.event === "renovation.scenario.start") {
      const data = event.data as AuditPayloads["renovation.scenario.start"];
      byScenario.set(event.scenarioId, {
        label: data.packageLabel,
        isBaseline: data.measureIds.length === 0,
        events: [],
      });
    }
    byScenario.get(event.scenarioId)?.events.push(event);
  }
  return [...byScenario.values()];
}

/** Each scenario's latest payload of one event, undefined where absent. */
export function perScenario<E extends keyof AuditPayloads>(
  scenarios: ScenarioEvents[],
  name: E,
): (AuditPayloads[E] | undefined)[] {
  return scenarios.map((s) => latest(s.events, name));
}

export function packagesStep(scenarios: ScenarioEvents[]): LineageStep | null {
  const params = perScenario(scenarios, "renovation.ecm.params").map(
    (p) => p?.ecmParams,
  );
  const step = table(
    scenarios.map((s) => s.label),
    [
      quantityRow(
        "Wall U target",
        QUANTITY.uValue,
        params.map((p) => p?.u_wall),
      ),
      quantityRow(
        "Roof U target",
        QUANTITY.uValue,
        params.map((p) => p?.u_roof),
      ),
      quantityRow(
        "Floor U target",
        QUANTITY.uValue,
        params.map((p) => p?.u_slab),
      ),
      quantityRow(
        "Window U target",
        QUANTITY.uValue,
        params.map((p) => p?.u_window),
      ),
      quantityRow(
        "Heat pump COP",
        QUANTITY.ratio,
        params.map((p) => p?.heat_pump_cop),
      ),
      {
        label: "Condensing boiler",
        values: params.map((p) =>
          p?.uni_generation_mode === "condensing_boiler" ? "Yes" : undefined,
        ),
      },
      quantityRow(
        "PV",
        QUANTITY.power,
        params.map((p) => p?.pv_kwp),
      ),
    ],
  );
  return step.rows.length === 0
    ? null
    : { title: "Packages", actor: "web-ui", tables: [step] };
}

export function energyCostStep(
  scenarios: ScenarioEvents[],
): LineageStep | null {
  const savings = perScenario(scenarios, "financial.savings.computed");
  const tariffs = savings.find((s) => s !== undefined);
  if (!tariffs) return null;

  const gas = tariffs.gasTariffEurPerKwh;
  const reference = tariffs.electricityReferencePriceEurPerKwh;
  const rates = {
    gasTariffEurPerKwh: gas,
    electricityReferencePriceEurPerKwh: reference,
  };
  const cost = (breakdown: DeliveredEnergyCarrierBreakdown | undefined) =>
    breakdown && computeCarrierAnnualCostEur(breakdown, rates);
  const price = (value: number) =>
    `${formatFixed(value, QUANTITY.tariff.decimals)} ${QUANTITY.tariff.unit}`;
  // Without a carrier split the service logs placeholder zeros, not results.
  const priced = savings.map((s) => (s?.canUseCarrierPricing ? s : undefined));

  return {
    title: "Energy cost",
    actor: "web-ui",
    tables: [
      table(
        scenarios.map((s) => s.label),
        [
          quantityRow(
            `Annual cost, gas × ${price(gas)} + grid × ${price(reference)}`,
            QUANTITY.moneyPerYear,
            scenarios.map((s, i) =>
              s.isBaseline
                ? cost(tariffs.baselineCarrierBreakdown)
                : cost(savings[i]?.scenarioCarrierBreakdown),
            ),
          ),
          quantityRow(
            "Saving vs current",
            QUANTITY.moneyPerYear,
            priced.map((s) => s?.annualSavingsEur),
          ),
          quantityRow(
            `Sent as electricity, saving ÷ ${price(reference)}`,
            QUANTITY.energy,
            priced.map((s) => s?.electricityEquivalentKwh),
          ),
        ],
      ),
    ],
  };
}

export function appraisalStep(
  scenarios: ScenarioEvents[],
  events: AuditEvent[],
): LineageStep | null {
  const savings = perScenario(scenarios, "financial.savings.computed");
  const ends = perScenario(scenarios, "financial.scenario.end").map((end) =>
    end?.kind === "current" ? undefined : end,
  );
  if (ends.every((end) => end === undefined)) return null;

  const lifetime = latest(events, "financial.run.start")?.projectLifetime;
  const loan = (s: (typeof savings)[number]) =>
    s && s.loanTerm > 0 ? s : undefined;

  return {
    title: "Financial appraisal",
    actor: "financial",
    caption: `P50 net cash flow averaged over years 1 to ${lifetime}, after maintenance and loan payments.`,
    tables: [
      table(
        scenarios.map((s) => s.label),
        [
          quantityRow(
            "Renovation cost",
            QUANTITY.money,
            savings.map((s) => s?.renovationCost),
          ),
          conceptRow(
            "upfront-subsidy",
            savings.map((s) => s?.subsidyAmount),
            QUANTITY.money,
          ),
          conceptRow(
            "investment",
            savings.map((s) => s?.effectiveCost),
          ),
          quantityRow(
            "Investment shown in results",
            QUANTITY.money,
            ends.map((end) => end?.capitalExpenditure),
          ),
          conceptRow(
            "annual-maintenance-cost",
            ends.map((end) => end?.annualMaintenanceCost),
          ),
          conceptRow(
            "renovation-loan",
            savings.map((s) => loan(s)?.loanAmount),
            QUANTITY.money,
          ),
          quantityRow(
            "Loan term",
            QUANTITY.years,
            savings.map((s) => loan(s)?.loanTerm),
          ),
          conceptRow(
            "monthly-cash-benefit",
            ends.map((end) => end?.monthlyAvgSavings),
            QUANTITY.cents,
          ),
          quantityRow(
            `Yearly savings, monthly × ${MONTHS_PER_YEAR}`,
            { ...QUANTITY.moneyPerYear, ...QUANTITY.cents },
            ends.map((end) =>
              end?.monthlyAvgSavings === undefined
                ? undefined
                : end.monthlyAvgSavings * MONTHS_PER_YEAR,
            ),
          ),
          {
            label: "Not appraised",
            values: perScenario(scenarios, "financial.risk.skipped").map(
              (skipped) => skipped?.reason,
            ),
          },
        ],
      ),
    ],
  };
}
