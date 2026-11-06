import { relifeConcepts } from "../../constants/relifeConcepts";
import {
  NATURAL_GAS_NET_PER_GROSS_KWH,
  computeCarrierAnnualCostEur,
} from "../../services/carrierSavingsService";
import {
  savingsAvailabilityLabel,
  skipReasonAvailability,
} from "../../services/savingsState";
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

const PACKAGES_CAPTION =
  "Targets each package sets. A dash means the package leaves that part as it is.";
const ANNUAL_COST_LABEL = "Annual energy cost";
const RENOVATION_COST_LABEL = "Renovation cost";
const YEARLY_SAVINGS_LABEL = "Yearly savings";
const ELECTRICITY_SAVINGS_LABEL = "Savings as electricity";

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
    : {
        title: "Packages",
        actor: "web-ui",
        caption: PACKAGES_CAPTION,
        tables: [step],
      };
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
  const current =
    scenarios.find((s) => s.isBaseline)?.label ?? "the current building";
  const saving = `Saving vs ${current}`;

  return {
    title: "Energy cost",
    actor: "web-ui",
    caption: `Prices gas and grid electricity at your tariffs and compares each package with ${current}.`,
    calculations: [
      `${ANNUAL_COST_LABEL} = Gas ÷ ${NATURAL_GAS_NET_PER_GROSS_KWH} × ${price(gas)} + Grid electricity × ${price(reference)}. The simulation gives gas in net kWh, gas is billed per gross kWh, and one gross kWh holds ${NATURAL_GAS_NET_PER_GROSS_KWH} net kWh.`,
      `${ELECTRICITY_SAVINGS_LABEL} = ${saving} ÷ ${price(reference)}. The financial model takes savings as kWh of electricity at a single price.`,
    ],
    tables: [
      table(
        scenarios.map((s) => s.label),
        [
          quantityRow(
            ANNUAL_COST_LABEL,
            QUANTITY.moneyPerYear,
            scenarios.map((s, i) =>
              s.isBaseline
                ? cost(tariffs.baselineCarrierBreakdown)
                : cost(savings[i]?.scenarioCarrierBreakdown),
            ),
          ),
          quantityRow(
            saving,
            QUANTITY.moneyPerYear,
            priced.map((s) => s?.annualSavingsEur),
          ),
          {
            ...quantityRow(
              `${ELECTRICITY_SAVINGS_LABEL} for the financial model`,
              QUANTITY.energy,
              priced.map((s) => s?.electricityEquivalentKwh),
            ),
            emphasis: true,
          },
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
  const ends = perScenario(scenarios, "financial.scenario.end");
  if (ends.every((end) => end === undefined)) return null;

  const lifetime = latest(events, "financial.run.start")?.projectLifetime;
  const loan = (s: (typeof savings)[number]) =>
    s && s.loanTerm > 0 ? s : undefined;
  const cashBenefit = relifeConcepts["monthly-cash-benefit"].label;

  return {
    title: "Financial appraisal",
    actor: "financial",
    caption: `The Financial service simulates cash flows over ${lifetime} years and reports the median (P50) outcome.`,
    calculations: [
      `${relifeConcepts.investment.label} = ${RENOVATION_COST_LABEL} − ${relifeConcepts["upfront-subsidy"].label}`,
      `${cashBenefit} = net cash flow after maintenance and loan payments, averaged over years 1 to ${lifetime}`,
      `${YEARLY_SAVINGS_LABEL} = ${cashBenefit} × ${MONTHS_PER_YEAR}`,
    ],
    tables: [
      table(
        scenarios.map((s) => s.label),
        [
          quantityRow(
            RENOVATION_COST_LABEL,
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
            YEARLY_SAVINGS_LABEL,
            { ...QUANTITY.moneyPerYear, ...QUANTITY.cents },
            ends.map((end) =>
              end?.monthlyAvgSavings === undefined
                ? undefined
                : end.monthlyAvgSavings * MONTHS_PER_YEAR,
            ),
          ),
          {
            label: "Why not appraised",
            values: perScenario(scenarios, "financial.risk.skipped").map(
              (skipped) =>
                skipped &&
                savingsAvailabilityLabel[
                  skipReasonAvailability(skipped.reason)
                ],
            ),
          },
        ],
      ),
    ],
  };
}
