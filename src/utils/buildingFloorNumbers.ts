export const MIN_BUILDING_FLOOR_COUNT = 1;
export const MIN_FLOOR_NUMBER = 0;

// Financial ARV service contract: number_of_floors is an integer Field(ge=1, le=100).
export const ARV_MAX_FLOOR_COUNT = 100;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function finiteOrFallback(
  value: number | null | undefined,
  fallback: number,
): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function toNearestWholeFloorCount(
  value: number | null | undefined,
  fallback = MIN_BUILDING_FLOOR_COUNT,
): number {
  const rounded = Math.round(finiteOrFallback(value, fallback));
  return Math.max(MIN_BUILDING_FLOOR_COUNT, rounded);
}

export function clampFloorNumberForFloorCount(
  value: number,
  floorCount: number,
): number {
  const topFloorNumber = getTopFloorNumberForFloorCount(floorCount);

  return clamp(Math.round(value), MIN_FLOOR_NUMBER, topFloorNumber);
}

export function getTopFloorNumberForFloorCount(floorCount: number): number {
  return toNearestWholeFloorCount(floorCount) - MIN_BUILDING_FLOOR_COUNT;
}

export interface NormalizedArvFloorFields {
  number_of_floors: number;
  floor_number: number | null;
}

export function normalizeArvFloorFields(input: {
  numberOfFloors: number | null | undefined;
  floorNumber: number | null | undefined;
}): NormalizedArvFloorFields {
  const numberOfFloors = clamp(
    toNearestWholeFloorCount(input.numberOfFloors),
    MIN_BUILDING_FLOOR_COUNT,
    ARV_MAX_FLOOR_COUNT,
  );

  return {
    number_of_floors: numberOfFloors,
    floor_number:
      input.floorNumber == null
        ? null
        : clampFloorNumberForFloorCount(input.floorNumber, numberOfFloors),
  };
}
