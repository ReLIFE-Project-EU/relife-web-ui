import { relifeConcepts } from "../../constants/relifeConcepts";
import type { ConceptId } from "../../constants/relifeConcepts";
import type { ArchetypeMatchStrategy } from "../../services/archetypeMatching";
import type { BuildingModifications } from "../../types/archetype";
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
import type { LineageRow, LineageStep, LineageValue } from "./lineageModel";

const INPUTS_CAPTION =
  "What you entered. Country, building type and construction period pick the reference building.";
const CATALOGUE_CAPTION =
  "The catalogue building that matches your inputs. The simulation runs on this building.";
const SIMULATED_COLUMN = "As simulated";
const MODIFIED_CAPTION = `The catalogue building that matches your inputs, next to the same building with your changes. The simulation runs on the ${SIMULATED_COLUMN} column.`;
const SIMULATED_CAPTION =
  "Hourly simulation over one year (ISO 52016), plus heating and cooling system losses (UNI/TS 11300). Results are for the simulated floor area. The next step scales them to yours.";
const SIMULATED_PACKAGES_NOTE =
  "Current Status comes from the same simulation as the energy profile.";
const SCALED_CAPTION =
  "Multiplies every simulated result by the scale factor. These are the energy figures shown in the results.";
const SCALED_PV_NOTE =
  "Grid electricity and system energy consumption exclude the PV electricity the building uses itself.";
const SCALE_FACTOR_CALCULATION =
  "Scale factor = Floor area ÷ Simulated floor area";

const MATCH_STRATEGY_LABELS: Record<ArchetypeMatchStrategy, string> = {
  "user-selected": "You picked it",
  "exact-full": "Same country, type and construction period",
  "exact-category-period-mismatch":
    "Same country and type, different construction period",
  "other-country": "Another country, same type and construction period",
  "selected-not-found": "Your pick is not in the catalogue",
};

const MODIFICATION_LABELS: Record<keyof BuildingModifications, string> = {
  floorArea: "Floor area",
  numberOfFloors: "Floors",
  floorHeight: "Floor height",
  totalWindowArea: "Window area",
  windowDistribution: "Window distribution",
  wallUValue: "Wall U-value",
  roofUValue: "Roof U-value",
  windowUValue: "Window U-value",
  heatingSetpoint: "Heating setpoint",
  coolingSetpoint: "Cooling setpoint",
  numberOfOccupants: "Occupants",
};

/** Profile: the building as it is; packages: one column per renovation package. */
export type EnergyStepContext = "profile" | "packages";

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

/** Concept row per m² of simulated floor area, keeping the concept tooltip. */
function perAreaRow(conceptId: ConceptId, values: LineageValue[]): LineageRow {
  return {
    ...quantityRow(
      `${relifeConcepts[conceptId].label} per m²`,
      QUANTITY.intensity,
      values,
    ),
    conceptId,
  };
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
  context: EnergyStepContext,
): LineageStep {
  return {
    title: "Simulated building",
    actor: "forecasting",
    caption:
      context === "packages"
        ? `${SIMULATED_CAPTION} ${SIMULATED_PACKAGES_NOTE}`
        : SIMULATED_CAPTION,
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
        perAreaRow(
          "annual-building-thermal-needs",
          energy.map((e) => perArea(e?.thermalNeed, e?.simulatedArea)),
        ),
        perAreaRow(
          "system-energy-consumption",
          energy.map((e) => perArea(e?.delivered, e?.simulatedArea)),
        ),
      ]),
    ],
  };
}

export function scaledStep(
  columns: string[],
  energy: EnergyColumns,
  context: EnergyStepContext,
): LineageStep {
  const hasPv = energy.some((e) => e?.scaled.pvSelfConsumption !== undefined);
  // Only the package costs read the carrier split; the profile ends here.
  const feedsCost = context === "packages";
  return {
    title: "Scaled to your floor area",
    actor: "web-ui",
    caption: hasPv ? `${SCALED_CAPTION} ${SCALED_PV_NOTE}` : SCALED_CAPTION,
    calculations: [SCALE_FACTOR_CALCULATION],
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
          "Scale factor",
          QUANTITY.factor,
          energy.map((e) => e?.areaScaleFactor),
        ),
        conceptRow(
          "annual-building-thermal-needs",
          energy.map((e) => e?.scaled.hvacTotal),
        ),
        {
          ...quantityRow(
            "Gas",
            QUANTITY.energy,
            energy.map((e) => e?.scaled.carrierBreakdown?.naturalGasKwh),
          ),
          emphasis: feedsCost,
        },
        {
          ...quantityRow(
            "Grid electricity",
            QUANTITY.energy,
            energy.map((e) => e?.scaled.carrierBreakdown?.gridElectricityKwh),
          ),
          emphasis: feedsCost,
        },
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
    title: "Your inputs",
    actor: "input",
    caption: INPUTS_CAPTION,
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
            label: "Fields you changed",
            values: [
              inputs.modificationKeys
                .map((key) => MODIFICATION_LABELS[key])
                .join(", ") || "None",
            ],
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
  const fraction = (stage: string, conceptId: ConceptId, key: string) => {
    const row = conceptRow(
      conceptId,
      [numberField(heating, key), numberField(cooling, key)],
      { decimals: 3 },
    );
    return { ...row, label: `${stage} ${row.label.toLowerCase()}` };
  };

  return {
    title: "Reference building",
    actor: "forecasting",
    caption: modifiedBui ? MODIFIED_CAPTION : CATALOGUE_CAPTION,
    tables: [
      table(
        [],
        [
          { label: "Archetype", values: [resolved.archetype.name] },
          {
            label: "How the archetype was chosen",
            values: [MATCH_STRATEGY_LABELS[resolved.matchStrategy]],
          },
          {
            label: "Location (lat, lon)",
            values: [
              `${catalogueBui.building.latitude}, ${catalogueBui.building.longitude}`,
            ],
          },
        ],
        "Archetype",
      ),
      table(
        modifiedBui ? ["Catalogue", SIMULATED_COLUMN] : [],
        [
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
            setpoints.map(
              (s) => `${s.heating_setpoint} / ${s.heating_setback}`,
            ),
          ),
          quantityRow(
            "Cooling setpoint / setback",
            QUANTITY.temperature,
            setpoints.map(
              (s) => `${s.cooling_setpoint} / ${s.cooling_setback}`,
            ),
          ),
          ...envelopeRows("Walls", "wall"),
          ...envelopeRows("Roof", "roof"),
          ...envelopeRows("Ground floor", "floor"),
          ...envelopeRows("Windows", "window"),
        ],
        "Geometry and envelope",
      ),
      table(
        ["Heating", "Cooling"],
        [
          efficiency("Emission η", "eta_emission", "eta_emission"),
          efficiency("Distribution η", "eta_distribution", "eta_distribution"),
          efficiency("Storage η", "eta_storage", "eta_storage"),
          efficiency("Generation η / COP", "eta_generation", "cop_generation"),
          fraction("Emission", "recovered-loss-fraction", "f_recov_emission"),
          fraction(
            "Distribution",
            "recovered-loss-fraction",
            "f_recov_distribution",
          ),
          fraction("Storage", "recovered-loss-fraction", "f_recov_storage"),
          fraction(
            "Emission",
            "auxiliary-electricity-fraction",
            "aux_emission_fraction",
          ),
          fraction(
            "Distribution",
            "auxiliary-electricity-fraction",
            "aux_distribution_fraction",
          ),
          fraction(
            "Storage",
            "auxiliary-electricity-fraction",
            "aux_storage_fraction",
          ),
          fraction(
            "Generation",
            "auxiliary-electricity-fraction",
            "aux_generation_fraction",
          ),
        ],
        "Heating and cooling systems",
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
