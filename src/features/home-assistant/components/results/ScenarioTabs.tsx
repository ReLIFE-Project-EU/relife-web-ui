/**
 * ScenarioTabs — top-of-deep-dive tab strip. One tab per renovation
 * scenario; the winner gets a crown badge.
 */

import { IconCrown } from "@tabler/icons-react";
import type { RenovationScenario, ScenarioId } from "../../context/types";
import { getScenarioColor } from "../../utils/colorUtils";
import shared from "../../../../components/shared/ResultsLayout.module.css";
import { ColorDot } from "../../../../components/shared/ResultAtoms";

interface ScenarioTabsProps {
  /** Packages in rank order. */
  rankedScenarios: RenovationScenario[];
  winnerId: ScenarioId | null;
  selectedScenarioId: ScenarioId | null;
  onSelectScenario: (scenarioId: ScenarioId) => void;
}

export function ScenarioTabs({
  rankedScenarios,
  winnerId,
  selectedScenarioId,
  onSelectScenario,
}: ScenarioTabsProps) {
  return (
    <div className={shared.tabsRow} role="tablist">
      {rankedScenarios.map((scenario) => {
        const isSel = scenario.id === selectedScenarioId;
        return (
          <button
            key={scenario.id}
            type="button"
            role="tab"
            aria-selected={isSel}
            className={shared.tab}
            onClick={() => onSelectScenario(scenario.id)}
          >
            <ColorDot color={getScenarioColor(scenario.id)} />
            <span>{scenario.label}</span>
            {scenario.id === winnerId ? (
              <IconCrown size={14} className={shared.tabCrown} />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
