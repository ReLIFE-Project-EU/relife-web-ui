import { describe, test, expect } from "vitest";

import {
  getEPCClass,
  estimateAnnualHvacEnergyCost,
  transformColumnarToRowFormat,
  calculateAnnualTotals,
  extractUniTotals,
} from "../../../src/services/energyUtils";

import type {
  HourlyBuildingRecord,
  HourlyBuildingColumnar,
  UNI11300Results,
} from "../../../src/types/forecasting";

// ─────────────────────────────────────────────────────────────────────────────
// getEPCClass
// ─────────────────────────────────────────────────────────────────────────────

describe("getEPCClass", () => {
  test("returns A+ at the inclusive upper bound (30 kWh/m²/yr)", () => {
    expect(getEPCClass(30)).toBe("A+");
  });

  test("transitions to A just above the A+ threshold", () => {
    expect(getEPCClass(30.01)).toBe("A");
  });

  test("returns A at its inclusive upper bound (50 kWh/m²/yr)", () => {
    expect(getEPCClass(50)).toBe("A");
  });

  test("returns G for values above all thresholds (500 kWh/m²/yr)", () => {
    expect(getEPCClass(500)).toBe("G");
  });

  test("returns A+ for the minimum value (0 kWh/m²/yr)", () => {
    expect(getEPCClass(0)).toBe("A+");
  });

  test("returns correct class at every threshold boundary", () => {
    expect(getEPCClass(90)).toBe("B");
    expect(getEPCClass(150)).toBe("C");
    expect(getEPCClass(230)).toBe("D");
    expect(getEPCClass(330)).toBe("E");
    expect(getEPCClass(450)).toBe("F");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// calculateAnnualTotals
// ─────────────────────────────────────────────────────────────────────────────

describe("calculateAnnualTotals", () => {
  test("sums separate Q_H/Q_C over 8760 hourly records (Wh → kWh)", () => {
    const hourlyData: HourlyBuildingRecord[] = Array.from(
      { length: 8760 },
      (_, i) => ({
        timestamp: `h${i}`,
        Q_H: 100,
        Q_C: 50,
      }),
    );

    const result = calculateAnnualTotals(hourlyData);

    expect(result.Q_H_total).toBeCloseTo(876, 1);
    expect(result.Q_C_total).toBeCloseTo(438, 1);
    expect(result.Q_HC_total).toBeCloseTo(1314, 1);
  });

  test("splits signed Q_HC into heating (+) and cooling (−)", () => {
    // 4380 heating hours at +100 Wh, 4380 cooling hours at −50 Wh
    const hourlyData: HourlyBuildingRecord[] = [
      ...Array.from(
        { length: 4380 },
        (_, i): HourlyBuildingRecord => ({
          timestamp: `h${i}`,
          Q_HC: 100,
        }),
      ),
      ...Array.from(
        { length: 4380 },
        (_, i): HourlyBuildingRecord => ({
          timestamp: `c${i}`,
          Q_HC: -50,
        }),
      ),
    ];

    const result = calculateAnnualTotals(hourlyData);

    expect(result.Q_H_total).toBeCloseTo(438, 1);
    expect(result.Q_C_total).toBeCloseTo(219, 1);
    expect(result.Q_HC_total).toBeCloseTo(657, 1);
  });

  test("returns zeros for empty input", () => {
    const result = calculateAnnualTotals([]);

    expect(result.Q_H_total).toBe(0);
    expect(result.Q_C_total).toBe(0);
    expect(result.Q_HC_total).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// transformColumnarToRowFormat
// ─────────────────────────────────────────────────────────────────────────────

describe("transformColumnarToRowFormat", () => {
  test("transposes two-column columnar data into row records", () => {
    const columnar: HourlyBuildingColumnar = { Q_H: [1, 2], Q_C: [3, 4] };
    const rows = transformColumnarToRowFormat(columnar);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ Q_H: 1, Q_C: 3 });
    expect(rows[1]).toMatchObject({ Q_H: 2, Q_C: 4 });
  });

  test("transposes single-column columnar data", () => {
    const columnar: HourlyBuildingColumnar = { Q_HC: [5, 6, 7] };
    const rows = transformColumnarToRowFormat(columnar);

    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ Q_HC: 5 });
    expect(rows[1]).toMatchObject({ Q_HC: 6 });
    expect(rows[2]).toMatchObject({ Q_HC: 7 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// estimateAnnualHvacEnergyCost
// ─────────────────────────────────────────────────────────────────────────────

describe("estimateAnnualHvacEnergyCost", () => {
  test("uses default price (0.25 EUR/kWh)", () => {
    expect(estimateAnnualHvacEnergyCost(1000)).toBeCloseTo(250, 2);
  });

  test("uses custom price when provided", () => {
    expect(estimateAnnualHvacEnergyCost(1000, 0.3)).toBeCloseTo(300, 2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// extractUniTotals
// ─────────────────────────────────────────────────────────────────────────────

describe("extractUniTotals", () => {
  test("projects delivered and primary totals from backend UNI results", () => {
    const uniResults: UNI11300Results = {
      summary: {
        E_delivered_thermal_kWh: 1000,
        E_delivered_electric_total_kWh: 250,
        EP_total_kWh: 1800,
      },
    };

    expect(extractUniTotals(uniResults)).toEqual({
      deliveredTotal: 1250,
      primaryEnergy: 1800,
    });
  });

  test("rejects heat-pump-adjusted results by default", () => {
    const uniResults: UNI11300Results = {
      heat_pump_applied: true,
      summary: {
        E_delivered_electric_total_kWh: 900,
        EP_total_kWh: 1800,
      },
    };

    expect(extractUniTotals(uniResults)).toBeUndefined();
  });

  test("allows heat-pump-adjusted results when explicitly enabled", () => {
    const uniResults: UNI11300Results = {
      heat_pump_applied: true,
      summary: {
        E_delivered_thermal_kWh: 5000,
        E_delivered_electric_total_kWh: 900,
        EP_total_kWh: 1800,
        heat_pump_cop: 3.2,
      },
    };

    expect(extractUniTotals(uniResults, { allowHeatPump: true })).toEqual({
      deliveredTotal: 900,
      primaryEnergy: 1800,
      heatPumpCop: 3.2,
    });
  });
});
