/**
 * Small presentational atoms shared across the RSE Results layout.
 * Adapted from the HRA results atoms; package identity is carried by a
 * stable color per package instead of a scenario-derived color.
 */

import type { RSEPackageId } from "../../types";
import { PACKAGE_COLORS } from "./rseResultsVm";
import classes from "./StrategyResults.module.css";

interface PackageDotProps {
  packageId: RSEPackageId;
  size?: number;
}

export function PackageDot({ packageId, size = 10 }: PackageDotProps) {
  const color = PACKAGE_COLORS[packageId];
  return (
    <span
      className={classes.pkgDot}
      style={{
        width: size,
        height: size,
        background: `var(--mantine-color-${color}-6)`,
      }}
      aria-hidden
    />
  );
}

interface PackageScoreBarProps {
  pct: number;
  packageId: RSEPackageId;
}

export function PackageScoreBar({ pct, packageId }: PackageScoreBarProps) {
  const color = PACKAGE_COLORS[packageId];
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
