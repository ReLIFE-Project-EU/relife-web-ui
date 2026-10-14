import type { AuditPayloads } from "../../types/auditEvents";
import type { DeliveredEnergyCarrierBreakdown } from "../../types/energy";
import type { UNI11300Summary } from "../../types/forecasting";
import {
  envelopeElementsFromBui,
  type EnvelopeElement,
} from "../../utils/archetypeModifier";
import type { AuditEvent } from "../../utils/auditLogger";
import {
  QUANTITY,
  conceptRow,
  latest,
  quantityRow,
  table,
} from "./lineageModel";
import type { LineageStep } from "./lineageModel";

const SIMULATED_CAPTION =
  "ISO 52016 hourly simulation with UNI/TS 11300 system losses.";
const SCALED_CAPTION =
  "Factor = floor area ÷ simulated floor area. With PV, grid electricity and delivered energy are net of PV self-consumption.";
const CATALOGUE_CAPTION = "Declared catalogue values.";
const MODIFIED_CAPTION =
  "Declared catalogue values next to the modified building that was simulated.";

function field(source: unknown, key: string): unknown {
  return typeof source === "object" && source !== null
    ? (source as Record<string, unknown>)[key]
    : undefined;
}

function numberField(source: unknown, key: string): number | undefined {
  const value = field(source, key);
  return typeof value === "number" ? value : undefined;
}

function perArea(
  value: number | undefined,
  area: number | undefined,
): number | undefined {
  return value === undefined || area === undefined ? undefined : value / area;
}

// ── Energy steps shared by the energy profile and the renovation table ──────

export interface EnergyColumn {
  simulatedArea: number;
  userArea: number;
  areaScaleFactor: number;
  thermalNeed: number;
  /** Raw delivered energy as the app computed it, before area scaling. */
  delivered: number | undefined;
  uni: UNI11300Summary | undefined;
  scaled: {
    hvacTotal: number;
    deliveredTotal: number | undefined;
    carrierBreakdown: DeliveredEnergyCarrierBreakdown | undefined;
    pvSelfConsumption?: number;
  };
}

function fromSimulationSummary(
  data: AuditPayloads["energy.simulation.summary"],
): EnergyColumn {
  return {
    simulatedArea: data.archetypeArea,
    userArea: data.userArea,
    areaScaleFactor: data.areaScaleFactor,
    thermalNeed: data.annualTotalsRaw.Q_HC_total,
    delivered: data.annualTotalsRaw.deliveredTotal,
    uni: data.uniSummary,
    scaled: data.scaled,
  };
}

export function fromEcmScaling(
  data: AuditPayloads["renovation.ecm.scaling"],
): EnergyColumn {
  return {
    simulatedArea: data.archetypeFloorArea,
    userArea: data.userArea,
    areaScaleFactor: data.areaScaleFactor,
    thermalNeed: data.raw.hvacTotal,
    delivered: data.raw.deliveredTotal,
    uni: data.uniSummary,
    scaled: data.scaled,
  };
}

/** A column is undefined when its scenario has no logged energy. */
type EnergyColumns = (EnergyColumn | undefined)[];

export function simulatedStep(
  columns: string[],
  energy: EnergyColumns,
): LineageStep {
  return {
    title: "Simulated building",
    actor: "forecasting",
    caption: SIMULATED_CAPTION,
    tables: [
      table(columns, [
        quantityRow(
          "Heating need",
          QUANTITY.energy,
          energy.map((e) => e?.uni?.Q_ideal_heat_kWh),
        ),
        quantityRow(
          "Cooling need",
          QUANTITY.energy,
          energy.map((e) => e?.uni?.Q_ideal_cool_kWh),
        ),
        conceptRow(
          "annual-building-thermal-needs",
          energy.map((e) => e?.thermalNeed),
        ),
        quantityRow(
          "Heating fuel",
          QUANTITY.energy,
          energy.map((e) => e?.uni?.E_delivered_thermal_kWh),
        ),
        quantityRow(
          "Heating electricity",
          QUANTITY.energy,
          energy.map((e) => e?.uni?.E_delivered_electric_heat_kWh),
        ),
        quantityRow(
          "Cooling electricity",
          QUANTITY.energy,
          energy.map((e) => e?.uni?.E_delivered_electric_cool_kWh),
        ),
        conceptRow(
          "system-energy-consumption",
          energy.map((e) => e?.delivered),
        ),
        conceptRow(
          "annual-building-thermal-needs",
          energy.map((e) => perArea(e?.thermalNeed, e?.simulatedArea)),
          QUANTITY.intensity,
        ),
        conceptRow(
          "system-energy-consumption",
          energy.map((e) => perArea(e?.delivered, e?.simulatedArea)),
          QUANTITY.intensity,
        ),
      ]),
    ],
  };
}

export function scaledStep(
  columns: string[],
  energy: EnergyColumns,
): LineageStep {
  return {
    title: "Scaled to floor area",
    actor: "web-ui",
    caption: SCALED_CAPTION,
    tables: [
      table(columns, [
        quantityRow(
          "Simulated floor area",
          QUANTITY.area,
          energy.map((e) => e?.simulatedArea),
        ),
        quantityRow(
          "Floor area",
          QUANTITY.area,
          energy.map((e) => e?.userArea),
        ),
        quantityRow(
          "Factor",
          QUANTITY.factor,
          energy.map((e) => e?.areaScaleFactor),
        ),
        conceptRow(
          "annual-building-thermal-needs",
          energy.map((e) => e?.scaled.hvacTotal),
        ),
        quantityRow(
          "Gas",
          QUANTITY.energy,
          energy.map((e) => e?.scaled.carrierBreakdown?.naturalGasKwh),
        ),
        quantityRow(
          "Grid electricity",
          QUANTITY.energy,
          energy.map((e) => e?.scaled.carrierBreakdown?.gridElectricityKwh),
        ),
        conceptRow(
          "pv-self-consumption",
          energy.map((e) => e?.scaled.pvSelfConsumption),
        ),
        conceptRow(
          "system-energy-consumption",
          energy.map((e) => e?.scaled.deliveredTotal),
        ),
      ]),
    ],
  };
}

// ── Energy profile ──────────────────────────────────────────────────────────

export function inputsStep(events: AuditEvent[]): LineageStep | null {
  const inputs = latest(events, "energy.estimate.start");
  if (!inputs) return null;
  return {
    title: "Inputs",
    actor: "input",
    tables: [
      table(
        [],
        [
          { label: "Country", values: [inputs.country] },
          { label: "Building type", values: [inputs.buildingType] },
          { label: "Construction period", values: [inputs.constructionPeriod] },
          quantityRow("Floor area", QUANTITY.area, [inputs.floorArea]),
          { label: "Floors", values: [inputs.numberOfFloors] },
          {
            label: "Changed fields",
            values: [inputs.modificationKeys.join(", ") || "None"],
          },
        ],
      ),
    ],
  };
}

export function referenceStep(events: AuditEvent[]): LineageStep | null {
  const resolved = latest(events, "energy.archetype.resolved");
  const details = latest(events, "energy.archetype.details");
  if (!resolved || !details) return null;

  const { catalogueBui, modifiedBui } = details;
  const buildings = modifiedBui ? [catalogueBui, modifiedBui] : [catalogueBui];
  const envelopes = buildings.map(envelopeElementsFromBui);
  const setpoints = buildings.map(
    (bui) => bui.building_parameters.temperature_setpoints,
  );
  const envelopeRows = (label: string, element: EnvelopeElement) => [
    quantityRow(
      `${label} area`,
      QUANTITY.area,
      envelopes.map((envelope) => envelope[element].areaM2),
    ),
    quantityRow(
      `${label} U-value`,
      QUANTITY.uValue,
      envelopes.map((envelope) => envelope[element].uValue),
    ),
  ];
  const heating = field(details.uni11300Config, "heating_params");
  const cooling = field(details.uni11300Config, "cooling_params");
  const efficiency = (label: string, heatingKey: string, coolingKey: string) =>
    quantityRow(label, QUANTITY.ratio, [
      numberField(heating, heatingKey),
      numberField(cooling, coolingKey),
    ]);

  return {
    title: "Reference building",
    actor: "forecasting",
    caption: modifiedBui ? MODIFIED_CAPTION : CATALOGUE_CAPTION,
    tables: [
      table(
        [],
        [
          { label: "Archetype", values: [resolved.archetype.name] },
          { label: "Match", values: [resolved.matchStrategy] },
          {
            label: "Location (lat, lon)",
            values: [
              `${catalogueBui.building.latitude}, ${catalogueBui.building.longitude}`,
            ],
          },
        ],
      ),
      table(modifiedBui ? ["Catalogue", "As simulated"] : [], [
        quantityRow(
          "Floor area",
          QUANTITY.area,
          buildings.map((bui) => bui.building.net_floor_area),
        ),
        {
          label: "Floors",
          values: buildings.map((bui) => bui.building.n_floors),
        },
        quantityRow(
          "Heating setpoint / setback",
          QUANTITY.temperature,
          setpoints.map((s) => `${s.heating_setpoint} / ${s.heating_setback}`),
        ),
        quantityRow(
          "Cooling setpoint / setback",
          QUANTITY.temperature,
          setpoints.map((s) => `${s.cooling_setpoint} / ${s.cooling_setback}`),
        ),
        ...envelopeRows("Walls", "wall"),
        ...envelopeRows("Roof", "roof"),
        ...envelopeRows("Ground floor", "floor"),
        ...envelopeRows("Windows", "window"),
      ]),
      table(
        ["Heating", "Cooling"],
        [
          efficiency("Emission η", "eta_emission", "eta_emission"),
          efficiency("Distribution η", "eta_distribution", "eta_distribution"),
          efficiency("Storage η", "eta_storage", "eta_storage"),
          efficiency("Generation η / COP", "eta_generation", "cop_generation"),
        ],
      ),
    ],
  };
}

/** Prefers the simulated (custom) building over its unmodified reference. */
export function energyProfileColumn(
  events: AuditEvent[],
): EnergyColumn | undefined {
  let fallback: AuditPayloads["energy.simulation.summary"] | undefined;
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].event !== "energy.simulation.summary") continue;
    const data = events[i].data as AuditPayloads["energy.simulation.summary"];
    if (data.basis === "custom") return fromSimulationSummary(data);
    fallback ??= data;
  }
  return fallback && fromSimulationSummary(fallback);
}
