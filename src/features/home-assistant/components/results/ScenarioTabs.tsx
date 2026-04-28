/**
 * ScenarioTabs — top-of-deep-dive tab strip. One tab per renovation
 * scenario; the winner gets a crown badge.
 */

import { IconCrown } from "@tabler/icons-react";
import type {
  MCDARankingResult,
  RenovationScenario,
  ScenarioId,
} from "../../context/types";
import classes from "./ResultsLayout.module.css";
import { ScenDot } from "./resultsAtoms";

interface ScenarioTabsProps {
  renovationScenarios: RenovationScenario[];
  ranking: MCDARankingResult[] | null;
  selectedScenarioId: ScenarioId | null;
  onSelectScenario: (scenarioId: ScenarioId) => void;
}

export function ScenarioTabs({
  renovationScenarios,
  ranking,
  selectedScenarioId,
  onSelectScenario,
}: ScenarioTabsProps) {
  const winnerId = ranking?.[0]?.scenarioId ?? null;

  return (
    <div className={classes.tabsRow} role="tablist">
      {renovationScenarios.map((scenario) => {
        const isSel = scenario.id === selectedScenarioId;
        return (
          <button
            key={scenario.id}
            type="button"
            role="tab"
            aria-selected={isSel}
            className={classes.tab}
            onClick={() => onSelectScenario(scenario.id)}
          >
            <ScenDot scenarioId={scenario.id} />
            <span>{scenario.label}</span>
            {scenario.id === winnerId ? (
              <IconCrown size={14} className={classes.tabCrown} />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
