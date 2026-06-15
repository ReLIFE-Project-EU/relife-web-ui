/**
 * Shared renovation measure icon mapping.
 *
 * Maps a RenovationMeasureId to its Tabler icon. Used by both the HRA and PRA
 * measure cards so the icon set stays consistent across tools.
 */

import {
  IconBolt,
  IconBuildingEstate,
  IconFlame,
  IconHome,
  IconSolarPanel,
  IconSun,
  IconWall,
  IconWindow,
} from "@tabler/icons-react";
import type { RenovationMeasureId } from "../types/renovation";

/**
 * Get the appropriate icon for a renovation measure based on its ID.
 */
export function getMeasureIcon(measureId: RenovationMeasureId) {
  const iconProps = { size: 24, stroke: 1.5 };

  switch (measureId) {
    case "wall-insulation":
      return <IconWall {...iconProps} />;
    case "roof-insulation":
      return <IconHome {...iconProps} />;
    case "floor-insulation":
      return <IconBuildingEstate {...iconProps} />;
    case "windows":
      return <IconWindow {...iconProps} />;
    case "air-water-heat-pump":
      return <IconBolt {...iconProps} />;
    case "condensing-boiler":
      return <IconFlame {...iconProps} />;
    case "pv":
      return <IconSolarPanel {...iconProps} />;
    case "solar-thermal":
      return <IconSun {...iconProps} />;
    default:
      return <IconBolt {...iconProps} />;
  }
}
