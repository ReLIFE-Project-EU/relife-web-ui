import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { parseCSV } from "../../../src/features/portfolio-advisor/services/csvParser";

describe("csvParser", () => {
  test("accepts construction periods with an en dash and normalizes them", () => {
    const csv = `building_name,lat,lng,category,country,floor_area,construction_period,number_of_floors
Building A,48.8566,2.3522,Single Family House,France,120,1946–1969,2`;

    const result = parseCSV(csv);

    expect(result.errors).toEqual([]);
    expect(result.buildings).toHaveLength(1);
    expect(result.buildings[0].constructionPeriod).toBe("1946-1969");
  });

  test("reports missing required columns including construction_period or construction_year", () => {
    const csv = `building_name,lat,lng,category,country,floor_area,number_of_floors
B,1,1,x,y,100,2`;

    const result = parseCSV(csv);

    expect(result.buildings).toHaveLength(0);
    expect(result.errors.some((e) => e.includes("construction_period"))).toBe(
      true,
    );
  });

  test("accepts construction_year instead of construction_period", () => {
    const csv = `building_name,lat,lng,category,country,floor_area,construction_year,number_of_floors
B,48.8,2.3,Single Family House,France,120,1960,2`;

    const result = parseCSV(csv);

    expect(result.errors).toEqual([]);
    expect(result.buildings).toHaveLength(1);
    expect(result.buildings[0].constructionPeriod).toBe("1945-1970");
  });

  test("parses semicolon-delimited measures", () => {
    const csv = `building_name,lat,lng,category,country,floor_area,construction_period,number_of_floors,measures
B,48.8,2.3,Single Family House,France,120,1971-1990,2,wall-insulation; windows ;PV`;

    const result = parseCSV(csv);

    expect(result.errors).toEqual([]);
    expect(result.buildings[0].selectedMeasures).toEqual([
      "wall-insulation",
      "windows",
      "pv",
    ]);
  });

  test("accepts catalogue-native construction periods", () => {
    const csv = `building_name,lat,lng,category,country,floor_area,construction_period,number_of_floors
A,48.2,16.4,Single Family House,Austria,120,0-1945,2
B,48.2,16.4,Apartment buildings,Austria,4200,2011-now,8`;

    const result = parseCSV(csv);

    expect(result.errors).toEqual([]);
    expect(result.buildings).toHaveLength(2);
    expect(result.buildings[0].constructionPeriod).toBe("pre-1945");
    expect(result.buildings[1].constructionPeriod).toBe("2011-present");
  });

  test("resolves the legacy Apartment category to Apartment buildings", () => {
    const csv = `building_name,lat,lng,category,country,floor_area,construction_period,number_of_floors
B,48.8,2.3,Apartment,France,120,1971-1990,2`;

    const result = parseCSV(csv);

    expect(result.errors).toEqual([]);
    expect(result.buildings[0].category).toBe("Apartment buildings");
    expect(result.buildings[0].propertyType).toBe("Apartment buildings");
  });

  test("rejects invalid category values", () => {
    const csv = `building_name,lat,lng,category,country,floor_area,construction_period,number_of_floors
B,48.8,2.3,Unknown,France,120,1971-1990,2`;

    const result = parseCSV(csv);

    expect(result.buildings).toHaveLength(0);
    expect(result.errors.some((e) => e.includes("category"))).toBe(true);
  });

  test("normalizes category casing and whitespace to canonical form", () => {
    const csv = `building_name,lat,lng,category,country,floor_area,construction_period,number_of_floors
B,48.8,2.3,  multi  family   house  ,France,120,1971-1990,2`;

    const result = parseCSV(csv);

    expect(result.errors).toEqual([]);
    expect(result.buildings[0].category).toBe("Multi family House");
    expect(result.buildings[0].propertyType).toBe("Multi family House");
  });

  test("derives propertyType from category", () => {
    const csv = `building_name,lat,lng,category,country,floor_area,construction_period,number_of_floors
B,48.8,2.3,Multi family House,France,120,1971-1990,2`;

    const result = parseCSV(csv);

    expect(result.errors).toEqual([]);
    expect(result.buildings[0].propertyType).toBe("Multi family House");
  });

  test("parses quoted decimal-comma numerics as EU-locale decimals", () => {
    const csv = `building_name,lat,lng,category,country,floor_area,construction_period,number_of_floors
B,"48,8566","2,3522",Single Family House,France,"85,5",1971-1990,2`;

    const result = parseCSV(csv);

    expect(result.errors).toEqual([]);
    expect(result.buildings[0].lat).toBeCloseTo(48.8566, 6);
    expect(result.buildings[0].lng).toBeCloseTo(2.3522, 6);
    expect(result.buildings[0].floorArea).toBeCloseTo(85.5, 6);
  });

  test("rejects numeric cells with trailing garbage instead of truncating", () => {
    const csv = `building_name,lat,lng,category,country,floor_area,construction_year,number_of_floors
B,48.8,2.3,Single Family House,France,85abc,1995abc,2`;

    const result = parseCSV(csv);

    expect(result.buildings).toHaveLength(0);
    expect(result.errors.some((e) => e.includes("floor_area"))).toBe(true);
    expect(result.errors.some((e) => e.includes("construction_year"))).toBe(
      true,
    );
  });

  test("rejects fractional years instead of truncating them", () => {
    const csv = `building_name,lat,lng,category,country,floor_area,construction_year,number_of_floors
B,48.8,2.3,Single Family House,France,120,1995.9,2`;

    const result = parseCSV(csv);

    expect(result.buildings).toHaveLength(0);
    expect(result.errors.some((e) => e.includes("construction_year"))).toBe(
      true,
    );
  });

  test("rejects non-integer floor counts and floor numbers", () => {
    const csv = `building_name,lat,lng,category,country,floor_area,construction_period,number_of_floors,floor_number
B,48.8,2.3,Single Family House,France,120,1971-1990,2.5,1st`;

    const result = parseCSV(csv);

    expect(result.buildings).toHaveLength(0);
    expect(result.errors.some((e) => e.includes("number_of_floors"))).toBe(
      true,
    );
    expect(result.errors.some((e) => e.includes("floor_number"))).toBe(true);
  });

  test("rejects invalid optional cost overrides instead of truncating", () => {
    const csv = `building_name,lat,lng,category,country,floor_area,construction_period,number_of_floors,capex,annual_maintenance_cost
B,48.8,2.3,Single Family House,France,120,1971-1990,2,"10,000.50",300EUR`;

    const result = parseCSV(csv);

    expect(result.buildings).toHaveLength(0);
    expect(result.errors.some((e) => e.includes("capex"))).toBe(true);
    expect(
      result.errors.some((e) => e.includes("annual_maintenance_cost")),
    ).toBe(true);
  });

  test("parses the shipped portfolio_example.csv without errors", () => {
    const text = readFileSync(
      join(process.cwd(), "public/portfolio_example.csv"),
      "utf-8",
    );
    const result = parseCSV(text);

    expect(result.errors).toEqual([]);
    expect(result.buildings.length).toBeGreaterThanOrEqual(3);
    expect(result.buildings.every((b) => b.validationStatus === "valid")).toBe(
      true,
    );
  });
});
