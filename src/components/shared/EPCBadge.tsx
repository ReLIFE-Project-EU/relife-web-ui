/**
 * EPCBadge Component
 * Displays an EPC class as a colored badge.
 */

import {
  Badge,
  Box,
  Stack,
  Text,
  Tooltip,
  type MantineSize,
} from "@mantine/core";
import {
  getEPCColor,
  getEPCDescription,
  EPC_ENERGY_RANGES,
} from "../../utils/epcUtils";
import { formatEnergyIntensity } from "../../utils/formatters";

interface EPCBadgeProps {
  /** The EPC class to display (A+, A, B, C, D, E, F, G) */
  epcClass: string;
  /** Size of the badge */
  size?: MantineSize;
  /** Whether to show a tooltip with the EPC description */
  showTooltip?: boolean;
  /** Additional class name */
  className?: string;
  /** Energy intensity in kWh/m²/year to show in the tooltip */
  energyIntensity?: number;
  /** When true, renders as outline variant with "~" prefix to signal approximation */
  estimated?: boolean;
  /** Extra tooltip lines (e.g. system / PV scope for scenario comparison). */
  additionalTooltipNotes?: readonly string[];
}

export function EPCBadge({
  epcClass,
  size = "lg",
  showTooltip = true,
  className,
  energyIntensity,
  estimated,
  additionalTooltipNotes,
}: EPCBadgeProps) {
  const badge = (
    <Badge
      color={getEPCColor(epcClass)}
      size={size}
      variant={estimated ? "outline" : "filled"}
      className={className}
      styles={{
        root: {
          fontWeight: 700,
          minWidth: size === "lg" ? 40 : size === "xl" ? 50 : 32,
        },
      }}
    >
      {estimated ? `~${epcClass}` : epcClass}
    </Badge>
  );

  if (showTooltip) {
    const range = EPC_ENERGY_RANGES[epcClass];
    const hasExtra =
      energyIntensity !== undefined ||
      estimated ||
      (additionalTooltipNotes?.length ?? 0) > 0;

    const tooltipContent = hasExtra ? (
      <Box>
        <Box mb={4}>{getEPCDescription(epcClass)}</Box>
        {energyIntensity !== undefined && (
          <Box mb={4}>
            ~{formatEnergyIntensity(Math.round(energyIntensity))}
          </Box>
        )}
        {range && (
          <Box mb={4}>
            Class {epcClass} range:{" "}
            {range.max === Infinity
              ? `${range.min}+ kWh/m²/year`
              : `${range.min}–${range.max} kWh/m²/year`}
          </Box>
        )}
        {estimated && (
          <Box c="dimmed" fs="italic">
            Estimated from building energy simulation, not an official EPC
            certificate.
          </Box>
        )}
        {additionalTooltipNotes && additionalTooltipNotes.length > 0 ? (
          <Stack gap={6} mt={6}>
            {additionalTooltipNotes.map((note, index) => (
              <Text key={index} size="xs" c="dimmed" fs="italic">
                {note}
              </Text>
            ))}
          </Stack>
        ) : null}
      </Box>
    ) : (
      getEPCDescription(epcClass)
    );

    return (
      <Tooltip
        label={tooltipContent}
        position="top"
        withArrow
        {...(hasExtra ? { multiline: true, w: 280 } : {})}
      >
        {badge}
      </Tooltip>
    );
  }

  return badge;
}
