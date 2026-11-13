/** Small marks shared by the results screens: a package's colour dot and score bar. */

import type { MantineColor } from "@mantine/core";
import classes from "./ResultsLayout.module.css";

const DEFAULT_DOT_SIZE = 10;
const MAX_PERCENT = 100;

function fill(color: MantineColor): string {
  return `var(--mantine-color-${color}-6)`;
}

interface ColorDotProps {
  color: MantineColor;
  size?: number;
}

export function ColorDot({ color, size = DEFAULT_DOT_SIZE }: ColorDotProps) {
  return (
    <span
      className={classes.dot}
      style={{ width: size, height: size, background: fill(color) }}
      aria-hidden
    />
  );
}

interface ScoreBarProps {
  color: MantineColor;
  pct: number;
}

export function ScoreBar({ color, pct }: ScoreBarProps) {
  return (
    <span className={classes.scoreBar} aria-hidden>
      <span
        className={classes.scoreBarFill}
        style={{
          width: `${Math.max(0, Math.min(MAX_PERCENT, pct))}%`,
          background: fill(color),
        }}
      />
    </span>
  );
}
