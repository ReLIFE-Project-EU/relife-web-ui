import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { parseCSV } from "../../../src/features/portfolio-advisor/services/csvParser";

describe("csvParser", () => {
  test("accepts construction periods with an en dash and normalizes them", () => {
    const csv = `building_name,lat,lng,category,country,floor_area,construction_period,number_of_floors,property_type
Building A,48.8566,2.3522,Single Family House,France,120,1946–1969,2,detached`;

    const result = parseCSV(csv);

    expect(result.errors).toEqual([]);
    expect(result.buildings).toHaveLength(1);
    expect(result.buildings[0].constructionPeriod).toBe("1946-1969");
  });

  test("reports missing required columns including construction_period or construction_year", () => {
    const csv = `building_name,lat,lng,category,country,floor_area,number_of_floors,property_type
B,1,1,x,y,100,2,detached`;

    const result = parseCSV(csv);

    expect(result.buildings).toHaveLength(0);
    expect(result.errors.some((e) => e.includes("construction_period"))).toBe(
      true,
    );
  });

  test("accepts construction_year instead of construction_period", () => {
    const csv = `building_name,lat,lng,category,country,floor_area,construction_year,number_of_floors,property_type
B,48.8,2.3,Single Family House,France,120,1960,2,detached`;

    const result = parseCSV(csv);

    expect(result.errors).toEqual([]);
    expect(result.buildings).toHaveLength(1);
    expect(result.buildings[0].constructionPeriod).toBe("1945-1970");
  });

  test("parses semicolon-delimited measures", () => {
    const csv = `building_name,lat,lng,category,country,floor_area,construction_period,number_of_floors,property_type,measures
B,48.8,2.3,Single Family House,France,120,1971-1990,2,detached,wall-insulation; windows ;PV`;

    const result = parseCSV(csv);

    expect(result.errors).toEqual([]);
    expect(result.buildings[0].selectedMeasures).toEqual([
      "wall-insulation",
      "windows",
      "pv",
    ]);
  });

  test("parses the shipped portfolio_example.csv without errors", () => {
    const text = readFileSync(
      join(process.cwd(), "public/portfolio_example.csv"),
      "utf-8",
    );
    const result = parseCSV(text);

    expect(result.errors).toEqual([]);
    expect(result.buildings.length).toBeGreaterThanOrEqual(4);
    expect(result.buildings.every((b) => b.validationStatus === "valid")).toBe(
      true,
    );
  });
});
