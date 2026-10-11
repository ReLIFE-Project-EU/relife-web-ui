/** Lineage view model and the trace helpers its step builders share. */

import { relifeConcepts } from "../../constants/relifeConcepts";
import type { ConceptId } from "../../constants/relifeConcepts";
import type { AuditPayloads } from "../../types/auditEvents";
import type { AuditEvent } from "../../utils/auditLogger";

export type LineageActor = "input" | "web-ui" | "forecasting" | "financial";
export type LineageValue = number | string | null | undefined;

export interface LineageRow {
  label: string;
  values: LineageValue[];
  conceptId?: ConceptId;
  decimals?: number;
}

export interface LineageTable {
  /** Empty for single-value tables, which render without a header. */
  columns: string[];
  rows: LineageRow[];
}

export interface LineageStep {
  title: string;
  actor: LineageActor;
  caption?: string;
  tables: LineageTable[];
}

export interface BuildingLineage {
  energyProfile: LineageStep[];
  renovation: LineageStep[];
}

export interface Quantity {
  unit?: string;
  decimals?: number;
}

/** Unit and display precision per kind of value; whole numbers by default. */
export const QUANTITY = {
  energy: { unit: "kWh/year" },
  intensity: { unit: relifeConcepts["energy-intensity"].unit },
  area: { unit: "m²", decimals: 1 },
  uValue: { unit: "W/m²K", decimals: 3 },
  ratio: { decimals: 2 },
  factor: { decimals: 3 },
  power: { unit: "kWp", decimals: 1 },
  temperature: { unit: "°C" },
  years: { unit: "years" },
  money: { unit: "EUR" },
  moneyPerYear: { unit: "EUR/year" },
  cents: { decimals: 2 },
  tariff: { unit: "EUR/kWh", decimals: 3 },
} satisfies Record<string, Quantity>;

function withUnit(label: string, unit: string | undefined): string {
  return unit ? `${label} (${unit})` : label;
}

export function quantityRow(
  label: string,
  quantity: Quantity,
  values: LineageValue[],
): LineageRow {
  return {
    label: withUnit(label, quantity.unit),
    decimals: quantity.decimals,
    values,
  };
}

/** Row labelled from the shared concept registry, in its unit by default. */
export function conceptRow(
  conceptId: ConceptId,
  values: LineageValue[],
  quantity: Quantity = {},
): LineageRow {
  const { label, unit } = relifeConcepts[conceptId];
  return {
    ...quantityRow(label, { unit, ...quantity }, values),
    conceptId,
  };
}

export function latest<E extends keyof AuditPayloads>(
  events: AuditEvent[],
  name: E,
): AuditPayloads[E] | undefined {
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].event === name) return events[i].data as AuditPayloads[E];
  }
  return undefined;
}

/** Drops rows with no value in any column. */
export function table(columns: string[], rows: LineageRow[]): LineageTable {
  return {
    columns,
    rows: rows.filter((row) =>
      row.values.some((value) => value !== null && value !== undefined),
    ),
  };
}
