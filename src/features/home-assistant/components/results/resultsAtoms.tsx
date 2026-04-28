/**
 * Small presentational atoms shared across the HRA Results layout.
 */

import { getScenarioColor } from "../../utils/colorUtils";
import classes from "./ResultsLayout.module.css";

interface ScenDotProps {
  scenarioId: string;
  size?: number;
}

export function ScenDot({ scenarioId, size = 10 }: ScenDotProps) {
  const color = getScenarioColor(scenarioId);
  return (
    <span
      className={classes.scenDot}
      style={{
        width: size,
        height: size,
        background: `var(--mantine-color-${color}-6)`,
      }}
      aria-hidden
    />
  );
}

interface ScoreBarProps {
  pct: number;
  scenarioId: string;
}

export function ScoreBar({ pct, scenarioId }: ScoreBarProps) {
  const color = getScenarioColor(scenarioId);
  return (
    <span className={classes.scoreBar} aria-hidden>
      <span
        className={classes.scoreBarFill}
        style={{
          width: `${Math.max(0, Math.min(100, pct))}%`,
          background: `var(--mantine-color-${color}-6)`,
        }}
      />
    </span>
  );
}
