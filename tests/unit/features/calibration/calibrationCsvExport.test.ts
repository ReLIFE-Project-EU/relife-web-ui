import { expect, test } from "vitest";
import type { CalibrationResults } from "../../../../src/features/calibration/hooks/useCalibration";
import { buildCalibrationCsv } from "../../../../src/features/calibration/services/calibrationCsvExport";

const timestamp = new Date("2026-10-09T09:00:00Z");
const results: CalibrationResults = {
  costs: {
    "Austria:wall-insulation": {
      status: "success",
      value: { capex: 12345.6789, euroPerM2: 123.456789 },
    },
  },
  buildings: {
    "AT_SFH_1946-1969": { status: "error", message: "No archetype" },
  },
  energy: {
    "IT_SFH_1946-1969": {
      status: "success",
      value: { heating: 50.12345, cooling: 0, primary: 60 },
    },
    "AT_SFH_1946-1969": { status: "error", message: "No simulation" },
  },
};

test("cost CSV includes quantities and unrounded prices", () => {
  const csv = buildCalibrationCsv("costs", results, timestamp);
  expect(csv.split("\r\n")).toHaveLength(22);
  expect(csv).toContain(
    "100,m²,12345.6789,123.456789,success,,2026-10-09T09:00:00.000Z",
  );
});

test("building CSV identifies cases and unavailable inputs", () => {
  const csv = buildCalibrationCsv("buildings", results, timestamp);
  expect(csv.split("\r\n")).toHaveLength(7);
  expect(csv).toContain("Floor area (m²)");
  expect(csv).toContain("AT_SFH_1946-1969");
  expect(csv).toContain("error,No archetype");
});

test("energy CSV preserves zeros, leaves missing values empty, and includes failures", () => {
  const csv = buildCalibrationCsv("energy", results, timestamp);
  expect(csv.split("\r\n")).toHaveLength(7);
  expect(csv).toContain(",50.12345,0,,60,success,,");
  expect(csv).toContain("error,No simulation");
});
