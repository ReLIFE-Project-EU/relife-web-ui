import { Box, Flex, Stack, Text } from "@mantine/core";
import { APARTMENT_LOCATION_OPTIONS } from "../../constants/buildingFormOptions";
import { relifeConcepts } from "../../constants/relifeConcepts";
import { toNearestWholeFloorCount } from "../../utils/buildingFloorNumbers";
import { mapApartmentLocationToFloorNumber } from "./buildingSelectorUtils";
import {
  formatFloorArea,
  formatNumber,
  formatPerFloorArea,
} from "./selectorConfig";
import type { ApartmentLocation } from "./types";

/** Fixed drawing area and schematic width; area never determines the outline. */
const SKETCH = {
  width: 160,
  height: 160,
  buildingLeft: 36,
  buildingWidth: 100,
  groundY: 148,
  maxStackHeight: 140,
  groundOverhang: 16,
  gap: 10,
} as const;

type GeometrySketchProps = {
  floors: number;
  floorHeight: number;
  accentColor: string;
} & (
  | { mode: "building"; totalFloorArea: number }
  | {
      mode: "flat";
      flatFloorArea: number;
      apartmentLocation: ApartmentLocation;
    }
);

/** Side view of the stacked floors the geometry inputs describe. */
export function GeometrySketch(props: GeometrySketchProps) {
  const { floors, floorHeight, accentColor } = props;
  const drawnFloors = toNearestWholeFloorCount(floors);
  const groundY = SKETCH.groundY;
  // Compress the supported 1–20 floors / 2–6 m range without scaling the labels.
  const stackHeight = Math.min(
    SKETCH.maxStackHeight,
    SKETCH.maxStackHeight * Math.sqrt((drawnFloors * floorHeight) / (20 * 6)),
  );
  const floorPx = stackHeight / drawnFloors;
  const markedFloor =
    props.mode === "flat"
      ? mapApartmentLocationToFloorNumber(props.apartmentLocation, floors)
      : 0;
  const markedTop = groundY - (markedFloor + 1) * floorPx;
  const buildingRight = SKETCH.buildingLeft + SKETCH.buildingWidth;

  const floorCount = `${formatNumber(floors)} ${floors === 1 ? "floor" : "floors"}`;
  const heightLabel = `${formatNumber(floorHeight)} m`;
  const areaLabel =
    relifeConcepts[
      props.mode === "flat" ? "apartment-floor-area" : "total-floor-area"
    ].label;
  const areaValue = formatFloorArea(
    props.mode === "flat" ? props.flatFloorArea : props.totalFloorArea,
  );
  const locationLabel =
    props.mode === "flat"
      ? APARTMENT_LOCATION_OPTIONS.find(
          ({ value }) => value === props.apartmentLocation,
        )?.label
      : undefined;

  const accentFill = `var(--mantine-color-${accentColor}-light)`;
  const accentStroke = `var(--mantine-color-${accentColor}-filled)`;

  return (
    <Flex gap="md" align="center" wrap="wrap">
      <Box style={{ flex: `0 0 ${SKETCH.width}px` }}>
        <svg
          viewBox={`0 0 ${SKETCH.width} ${SKETCH.height}`}
          width={SKETCH.width}
          height={SKETCH.height}
          style={{ display: "block" }}
          role="img"
          aria-label={`Building geometry preview. ${floorCount}. ${heightLabel} per floor.${locationLabel ? ` Your flat: ${locationLabel}.` : ""}`}
        >
          <rect
            x={SKETCH.buildingLeft}
            y={groundY - stackHeight}
            width={SKETCH.buildingWidth}
            height={stackHeight}
            fill={accentFill}
            stroke={accentStroke}
            strokeWidth={2}
          />
          {Array.from({ length: drawnFloors - 1 }, (_, floor) => (
            <line
              key={floor}
              x1={SKETCH.buildingLeft}
              x2={buildingRight}
              y1={groundY - (floor + 1) * floorPx}
              y2={groundY - (floor + 1) * floorPx}
              stroke={accentStroke}
              strokeOpacity={0.3}
            />
          ))}
          {props.mode === "flat" && (
            <rect
              x={buildingRight - 30}
              y={markedTop + floorPx * 0.2}
              width={22}
              height={floorPx * 0.6}
              fill={accentStroke}
            />
          )}
          <line
            x1={SKETCH.buildingLeft - SKETCH.groundOverhang}
            x2={buildingRight + SKETCH.groundOverhang}
            y1={groundY}
            y2={groundY}
            stroke="var(--mantine-color-dimmed)"
            strokeWidth={2}
          />
          <path
            d={`M ${SKETCH.buildingLeft - SKETCH.gap + 4} ${markedTop}
                h -8 m 4 0 v ${floorPx} m -4 0 h 8`}
            fill="none"
            stroke="var(--mantine-color-text)"
            strokeWidth={1.5}
          />
        </svg>
      </Box>
      <Stack
        gap={6}
        mih={140}
        justify="center"
        style={{ flex: "1 1 180px", minWidth: 0, overflowWrap: "anywhere" }}
      >
        <Text size="xs">
          Floor height:{" "}
          <Text span fw={600}>
            {heightLabel}
          </Text>
        </Text>
        <Text size="xs">
          Building:{" "}
          <Text span fw={600}>
            {floorCount}
          </Text>
        </Text>
        <Text size="xs">
          {areaLabel}:{" "}
          <Text span fw={600} style={{ display: "inline-block" }}>
            {areaValue}
          </Text>
        </Text>
        {props.mode === "building" ? (
          <Text size="xs" c="dimmed">
            {formatPerFloorArea(props.totalFloorArea, floors)}
          </Text>
        ) : (
          <Text size="xs" c={`${accentColor}.9`} fw={600}>
            Your flat · {locationLabel}
          </Text>
        )}
      </Stack>
    </Flex>
  );
}
