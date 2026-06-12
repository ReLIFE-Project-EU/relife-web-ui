/**
 * PackageTabs — top-of-deep-dive tab strip. One tab per ranked renovation
 * package; the top-ranked package gets a crown badge.
 */

import { IconCrown } from "@tabler/icons-react";
import { RSE_PACKAGES } from "../../services/rsePackageCatalog";
import type { RSEPackageId, RSERankingResult } from "../../types";
import { PackageDot } from "./rseResultsAtoms";
import classes from "./StrategyResults.module.css";

interface PackageTabsProps {
  rankings: RSERankingResult[];
  selectedPackageId: RSEPackageId;
  onSelectPackage: (packageId: RSEPackageId) => void;
}

export function PackageTabs({
  rankings,
  selectedPackageId,
  onSelectPackage,
}: PackageTabsProps) {
  return (
    <div className={classes.tabsRow} role="tablist">
      {rankings.map((entry) => {
        const isSel = entry.packageId === selectedPackageId;
        return (
          <button
            key={entry.packageId}
            type="button"
            role="tab"
            aria-selected={isSel}
            className={classes.tab}
            onClick={() => onSelectPackage(entry.packageId)}
          >
            <PackageDot packageId={entry.packageId} />
            <span>{RSE_PACKAGES[entry.packageId].label}</span>
            {entry.rank === 1 ? (
              <IconCrown size={14} className={classes.tabCrown} />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
