import { expect, test } from "vitest";
import { pickGasReference } from "../../../src/services/gasTariffService";

test("reference gas price skips half-years awaiting review or rejected", () => {
  const reference = pickGasReference(
    [
      { geo: "ES", period: "2026-S2", value: 0.8 },
      { geo: "ES", period: "2026-S1", value: 0.7 },
      { geo: "ES", period: "2025-S2", value: 0.0955 },
      { geo: "ES", period: "2025-S1", value: 0.08 },
      { geo: "ES", period: "2024-S2", value: 0.06 },
    ],
    [
      { geo: "ES", period: "2026-S2", status: "open" },
      { geo: "ES", period: "2026-S1", status: "rejected" },
      { geo: "ES", period: "2025-S2", status: "accepted" },
    ],
    ["Spain"],
  );

  expect(reference.eurPerKwh).toBeCloseTo(0.08775, 6);
  expect(reference.periods).toEqual(["2025-S1", "2025-S2"]);
  expect(reference.geo).toBe("ES");
});

test("reference gas price uses the EU average for buildings in several countries", () => {
  const reference = pickGasReference(
    [
      { geo: "ES", period: "2026-S1", value: 0.0787 },
      { geo: "EU27_2020", period: "2026-S1", value: 0.1103 },
      { geo: "EU27_2020", period: "2025-S2", value: 0.1228 },
    ],
    [],
    ["Spain", "IT"],
  );

  expect(reference.eurPerKwh).toBeCloseTo(0.11655, 6);
  expect(reference.geo).toBe("EU27_2020");
  expect(reference.fallback).toBe("multiple-countries");
});

test("reference gas price uses the EU average for a country with no price", () => {
  const reference = pickGasReference(
    [
      { geo: "CY", period: "2026-S1", value: null },
      { geo: "EU27_2020", period: "2026-S1", value: 0.1103 },
      { geo: "EU27_2020", period: "2025-S2", value: 0.1228 },
    ],
    [],
    ["Cyprus"],
  );

  expect(reference.eurPerKwh).toBeCloseTo(0.11655, 6);
  expect(reference.geo).toBe("EU27_2020");
  expect(reference.countryName).toBe("Cyprus");
  expect(reference.fallback).toBe("no-country-price");
});
