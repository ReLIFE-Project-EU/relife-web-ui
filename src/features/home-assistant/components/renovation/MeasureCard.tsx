/**
 * MeasureCard Component
 * Displays a single renovation measure with checkbox selection.
 */

import {
  Badge,
  Card,
  Checkbox,
  Group,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  IconBolt,
  IconBuildingEstate,
  IconFlame,
  IconHome,
  IconInfoCircle,
  IconSolarPanel,
  IconSun,
  IconWall,
  IconWindow,
} from "@tabler/icons-react";
import type { RenovationMeasureId } from "../../context/types";
import type { RenovationMeasure } from "../../services";

interface MeasureCardProps {
  measure: RenovationMeasure;
  isSelected: boolean;
  onToggle: (measureId: RenovationMeasureId) => void;
}

/**
 * Get the appropriate icon for a measure based on its ID
 */
function getMeasureIcon(measureId: RenovationMeasureId) {
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

/**
 * Get badge color based on measure category
 */
function getCategoryColor(category: string): string {
  switch (category) {
    case "envelope":
      return "blue";
    case "systems":
      return "orange";
    case "renewable":
      return "green";
    default:
      return "gray";
  }
}

function getCategoryLabel(category: string): string {
  switch (category) {
    case "envelope":
      return "Envelope";
    case "systems":
      return "Systems";
    case "renewable":
      return "Renewables";
    default:
      return "Other";
  }
}

export function MeasureCard({
  measure,
  isSelected,
  onToggle,
}: MeasureCardProps) {
  const categoryColor = getCategoryColor(measure.category);
  const categoryLabel = getCategoryLabel(measure.category);

  return (
    <Card
      withBorder
      radius="lg"
      p="lg"
      shadow={isSelected ? "md" : "sm"}
      bg={isSelected ? `${categoryColor}.0` : "white"}
      style={{
        borderColor: isSelected
          ? `var(--mantine-color-${categoryColor}-5)`
          : undefined,
        borderWidth: isSelected ? 2 : 1,
        cursor: "pointer",
        transition: "border-color 150ms ease, box-shadow 150ms ease",
      }}
      onClick={() => onToggle(measure.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onToggle(measure.id);
        }
      }}
      role="button"
      tabIndex={0}
    >
      <Stack gap="md">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Group gap="sm" wrap="nowrap" align="flex-start">
            <Text c={categoryColor}>{getMeasureIcon(measure.id)}</Text>
            <Stack gap={4}>
              <Text fw={600} size="sm">
                {measure.name}
              </Text>
            </Stack>
          </Group>
          <Tooltip label={measure.description} position="left" multiline w={260}>
            <IconInfoCircle
              size={16}
              color="var(--mantine-color-gray-5)"
              style={{ cursor: "help", flexShrink: 0 }}
              onClick={(event) => event.stopPropagation()}
            />
          </Tooltip>
        </Group>

        <Group justify="space-between" align="center">
          <Badge color={categoryColor} variant={isSelected ? "filled" : "light"}>
            {categoryLabel}
          </Badge>
          <Checkbox
            checked={isSelected}
            onChange={() => onToggle(measure.id)}
            label={
              <Text fw={500} size="sm">
                {isSelected ? "Selected" : "Select"}
              </Text>
            }
            onClick={(event) => event.stopPropagation()}
            styles={{
              body: { alignItems: "center" },
              label: { paddingLeft: 8 },
            }}
          />
        </Group>
      </Stack>
    </Card>
  );
}
