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
});
