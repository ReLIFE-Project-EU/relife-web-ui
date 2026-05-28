/**
 * Export menu for the PRA results screen: a single button opening a dropdown
 * with two CSV exports — per-building results and the portfolio summary.
 */

import { Button, Menu } from "@mantine/core";
import {
  IconBuilding,
  IconChartBar,
  IconChevronDown,
  IconDownload,
} from "@tabler/icons-react";
import { auditLog } from "../../../../utils/auditLogger";
import { downloadCsv } from "../../../../utils/csvExport";
import {
  buildBuildingsCsv,
  buildSummaryCsv,
} from "../../services/resultsCsvExport";
import type { PortfolioStats } from "../steps/ResultsStep";
import type { BuildingAnalysisResult, PRABuilding } from "../../context/types";

interface ResultsExportMenuProps {
  buildings: PRABuilding[];
  results: Record<string, BuildingAnalysisResult>;
  stats: PortfolioStats;
}

function datedFilename(kind: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `relife-portfolio-${kind}-${date}.csv`;
}

export function ResultsExportMenu({
  buildings,
  results,
  stats,
}: ResultsExportMenuProps) {
  const exportBuildings = () => {
    downloadCsv(
      datedFilename("buildings"),
      buildBuildingsCsv(buildings, results),
    );
    auditLog.info("portfolio", "results.csv_export", {
      kind: "buildings",
      buildingCount: buildings.length,
    });
  };

  const exportSummary = () => {
    downloadCsv(datedFilename("summary"), buildSummaryCsv(stats));
    auditLog.info("portfolio", "results.csv_export", {
      kind: "summary",
      buildingCount: stats.totalBuildings,
    });
  };

  return (
    <Menu position="bottom-end" withinPortal>
      <Menu.Target>
        <Button
          variant="default"
          leftSection={<IconDownload size={16} />}
          rightSection={<IconChevronDown size={14} />}
        >
          Export CSV
        </Button>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item
          leftSection={<IconBuilding size={16} />}
          onClick={exportBuildings}
        >
          Per-building results (CSV)
        </Menu.Item>
        <Menu.Item
          leftSection={<IconChartBar size={16} />}
          onClick={exportSummary}
        >
          Portfolio summary (CSV)
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
