/**
 * Small uppercase qualifier rendered above a label.
 *
 * Shared so the portfolio strip, the metric cards and the results group
 * headings cannot drift apart: the treatment is one line of spec repeated in
 * five places otherwise.
 */

import { Text } from "@mantine/core";
import type { ReactNode } from "react";

interface MetricEyebrowProps {
  children: ReactNode;
  /** Text alignment, for right-aligned table headers. */
  ta?: "left" | "right";
}

export function MetricEyebrow({ children, ta }: MetricEyebrowProps) {
  return (
    <Text
      // A div, not the default <p>: eyebrows sit inside table headers, cards
      // and other Text nodes, where a nested <p> is invalid HTML.
      component="div"
      ta={ta}
      size="10px"
      fw={700}
      c="dimmed"
      tt="uppercase"
      style={{ letterSpacing: "0.06em" }}
    >
      {children}
    </Text>
  );
}
