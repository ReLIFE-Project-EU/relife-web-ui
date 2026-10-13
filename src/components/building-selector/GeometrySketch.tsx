import { Stack, Text } from "@mantine/core";
import { toNearestWholeFloorCount } from "../../utils/buildingFloorNumbers";
import { mapApartmentLocationToFloorNumber } from "./buildingSelectorUtils";
import {
  formatFloorArea,
  formatNumber,
  formatPerFloorArea,
} from "./selectorConfig";
import type { ApartmentLocation } from "./types";

/** Layout in SVG viewBox units; the sketch never renders wider than `width`. */
const SKETCH = {
  width: 320,
  height: 120,
  buildingLeft: 56,
  buildingWidth: 112,
  groundOverhang: 16,
  gap: 8,
  fontSize: 11,
  strokeWidth: 1.5,
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
  const groundY = SKETCH.height - SKETCH.strokeWidth;
  const floorPx = groundY / drawnFloors;
  const markedFloor =
    props.mode === "flat"
      ? mapApartmentLocationToFloorNumber(props.apartmentLocation, floors)
      : 0;
  const markedTop = groundY - (markedFloor + 1) * floorPx;
  const markedMiddle = markedTop + floorPx / 2;
  const buildingRight = SKETCH.buildingLeft + SKETCH.buildingWidth;

  const floorCount = `${formatNumber(floors)} ${floors === 1 ? "floor" : "floors"}`;
  const heightLabel = `${formatNumber(floorHeight)} m`;
  const floorLabel =
    props.mode === "flat"
      ? `Your flat: ${formatFloorArea(props.flatFloorArea)}`
      : formatPerFloorArea(props.totalFloorArea, floors);
  const caption =
    props.mode === "flat"
      ? `Building: ${floorCount}`
      : `${floorCount} · ${formatFloorArea(props.totalFloorArea)} in total`;

  const accentFill = `var(--mantine-color-${accentColor}-light)`;
  const accentStroke = `var(--mantine-color-${accentColor}-filled)`;
  const textFill = "var(--mantine-color-text)";

  return (
    <Stack gap={4} mt="sm">
      <svg
        viewBox={`0 0 ${SKETCH.width} ${SKETCH.height}`}
        style={{ width: "100%", maxWidth: SKETCH.width }}
        role="img"
        aria-label={`${caption}. ${floorLabel}. Floor height: ${heightLabel}.`}
      >
        {Array.from({ length: drawnFloors }, (_, floor) => {
          const filled = props.mode === "building" || floor === markedFloor;
          return (
            <rect
              key={floor}
              x={SKETCH.buildingLeft}
              y={groundY - (floor + 1) * floorPx}
              width={SKETCH.buildingWidth}
              height={floorPx}
              fill={filled ? accentFill : "none"}
              stroke={
                filled ? accentStroke : "var(--mantine-color-default-border)"
              }
              strokeWidth={SKETCH.strokeWidth}
            />
          );
        })}
        <line
          x1={SKETCH.buildingLeft - SKETCH.groundOverhang}
          x2={buildingRight + SKETCH.groundOverhang}
          y1={groundY}
          y2={groundY}
          stroke="var(--mantine-color-dimmed)"
          strokeWidth={SKETCH.strokeWidth}
        />
        <line
          x1={SKETCH.buildingLeft - SKETCH.gap}
          x2={SKETCH.buildingLeft - SKETCH.gap}
          y1={markedTop}
          y2={markedTop + floorPx}
          stroke={textFill}
          strokeWidth={SKETCH.strokeWidth}
        />
        <text
          x={SKETCH.buildingLeft - 2 * SKETCH.gap}
          y={markedMiddle}
          textAnchor="end"
          dominantBaseline="middle"
          fontSize={SKETCH.fontSize}
          fill={textFill}
        >
          {heightLabel}
        </text>
        <text
          x={buildingRight + SKETCH.gap}
          y={markedMiddle}
          dominantBaseline="middle"
          fontSize={SKETCH.fontSize}
          fill={textFill}
        >
          {floorLabel}
        </text>
      </svg>
      <Text size="xs" c="dimmed">
        {caption}
      </Text>
    </Stack>
  );
}
