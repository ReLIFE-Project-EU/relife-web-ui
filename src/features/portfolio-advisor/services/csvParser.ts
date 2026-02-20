/**
 * CSV Parser for Portfolio Building Data
 *
 * Parses CSV text into PRABuilding arrays with validation.
 * No external library needed - uses native string splitting.
 */

import { CSV_REQUIRED_COLUMNS } from "../constants";
import type { PRABuilding } from "../context/types";

export interface CSVParseResult {
  buildings: PRABuilding[];
  errors: string[];
}

/**
 * Parse CSV text into an array of PRABuilding objects.
 * Validates required columns and data types.
 */
export function parseCSV(text: string): CSVParseResult {
  const errors: string[] = [];
  const buildings: PRABuilding[] = [];

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    errors.push("CSV must contain a header row and at least one data row.");
    return { buildings, errors };
  }

  // Parse header
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

  // Validate required columns
  const missingColumns = CSV_REQUIRED_COLUMNS.filter(
    (col) => !headers.includes(col),
  );
  if (missingColumns.length > 0) {
    errors.push(`Missing required columns: ${missingColumns.join(", ")}`);
    return { buildings, errors };
  }

  // Column indices
  const colIndex = (name: string): number => headers.indexOf(name);

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const rowNum = i + 1;
    const values = parseCSVLine(lines[i]);

    if (values.length !== headers.length) {
      errors.push(
        `Row ${rowNum}: Expected ${headers.length} columns but found ${values.length}.`,
      );
      continue;
    }

    const rowErrors: string[] = [];

    // Parse required fields
    const name = values[colIndex("building_name")]?.trim();
    if (!name) rowErrors.push(`Row ${rowNum}: building_name is empty.`);

    const lat = parseFloat(values[colIndex("lat")]);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      rowErrors.push(`Row ${rowNum}: lat must be a number between -90 and 90.`);
    }

    const lng = parseFloat(values[colIndex("lng")]);
    if (isNaN(lng) || lng < -180 || lng > 180) {
      rowErrors.push(
        `Row ${rowNum}: lng must be a number between -180 and 180.`,
      );
    }

    const category = values[colIndex("category")]?.trim();
    if (!category) rowErrors.push(`Row ${rowNum}: category is empty.`);

    const country = values[colIndex("country")]?.trim();
    if (!country) rowErrors.push(`Row ${rowNum}: country is empty.`);

    const floorArea = parseFloat(values[colIndex("floor_area")]);
    if (isNaN(floorArea) || floorArea <= 0) {
      rowErrors.push(`Row ${rowNum}: floor_area must be a positive number.`);
    }

    const constructionYear = parseInt(
      values[colIndex("construction_year")],
      10,
    );
    if (
      isNaN(constructionYear) ||
      constructionYear < 1800 ||
      constructionYear > 2030
    ) {
      rowErrors.push(
        `Row ${rowNum}: construction_year must be between 1800 and 2030.`,
      );
    }

    const numberOfFloors = parseInt(values[colIndex("number_of_floors")], 10);
    if (isNaN(numberOfFloors) || numberOfFloors < 1 || numberOfFloors > 100) {
      rowErrors.push(
        `Row ${rowNum}: number_of_floors must be between 1 and 100.`,
      );
    }

    const propertyType = values[colIndex("property_type")]?.trim();
    if (!propertyType) {
      rowErrors.push(`Row ${rowNum}: property_type is empty.`);
    }

    // Parse optional fields
    const archetypeNameIdx = colIndex("archetype_name");
    const archetypeName =
      archetypeNameIdx >= 0
        ? values[archetypeNameIdx]?.trim() || undefined
        : undefined;

    const floorNumberIdx = colIndex("floor_number");
    const floorNumber =
      floorNumberIdx >= 0 && values[floorNumberIdx]?.trim()
        ? parseInt(values[floorNumberIdx], 10)
        : undefined;

    const capexIdx = colIndex("capex");
    const estimatedCapex =
      capexIdx >= 0 && values[capexIdx]?.trim()
        ? parseFloat(values[capexIdx])
        : undefined;

    const maintenanceIdx = colIndex("annual_maintenance_cost");
    const annualMaintenanceCost =
      maintenanceIdx >= 0 && values[maintenanceIdx]?.trim()
        ? parseFloat(values[maintenanceIdx])
        : undefined;

    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
      continue;
    }

    buildings.push({
      id: crypto.randomUUID(),
      name: name || `Building ${i}`,
      source: "csv",
      category: category || "",
      country: country || "",
      archetypeName,
      lat,
      lng,
      floorArea,
      constructionYear,
      numberOfFloors,
      propertyType: propertyType || "",
      floorNumber,
      estimatedCapex,
      annualMaintenanceCost,
      validationStatus: "valid",
    });
  }

  return { buildings, errors };
}

/**
 * Parse a single CSV line handling quoted values with commas.
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++; // Skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}
