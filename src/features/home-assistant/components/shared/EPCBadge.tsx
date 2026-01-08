/**
 * EPCBadge Component
 * Displays an EPC class as a colored badge.
 */

import { Badge, Tooltip, type MantineSize } from "@mantine/core";
import { getEPCColor, getEPCDescription } from "../../utils/epcUtils";

interface EPCBadgeProps {
  /** The EPC class to display (A+, A, B, C, D, E, F, G) */
  epcClass: string;
  /** Size of the badge */
  size?: MantineSize;
  /** Whether to show a tooltip with the EPC description */
  showTooltip?: boolean;
  /** Additional class name */
  className?: string;
}

export function EPCBadge({
  epcClass,
  size = "lg",
  showTooltip = true,
  className,
}: EPCBadgeProps) {
  const badge = (
    <Badge
      color={getEPCColor(epcClass)}
      size={size}
      variant="filled"
      className={className}
      styles={{
        root: {
          fontWeight: 700,
          minWidth: size === "lg" ? 40 : size === "xl" ? 50 : 32,
        },
      }}
    >
      {epcClass}
    </Badge>
  );

  if (showTooltip) {
    return (
      <Tooltip label={getEPCDescription(epcClass)} position="top" withArrow>
        {badge}
      </Tooltip>
    );
  }

  return badge;
}
