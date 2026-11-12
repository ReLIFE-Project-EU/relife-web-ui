import { analysisLoadingCopy as copy } from "../../constants/relifeConcepts";
import type { LoadingSource } from "./GlobalLoadingContextDefinition";

const TASKS: Record<
  string,
  { title: string; stage: keyof typeof copy.stages }
> = {
  "HomeAssistant.estimate": { title: copy.titles.home, stage: "baseline" },
  "HomeAssistant.evaluate": { title: copy.titles.renovation, stage: "energy" },
  "HomeAssistant.rank": {
    title: copy.titles.recommendations,
    stage: "ranking",
  },
  "PortfolioAdvisor.evaluate": {
    title: copy.titles.portfolio,
    stage: "buildings",
  },
  "StrategyExplorer.workflow": {
    title: copy.titles.strategy,
    stage: "portfolio",
  },
};

const STAGES: Record<string, keyof typeof copy.stages> = {
  "HomeAssistant.evaluate.energy": "energy",
  "HomeAssistant.evaluate.financial": "financial",
  "StrategyExplorer.workflow.portfolio": "portfolio",
  "StrategyExplorer.workflow.energy": "cache",
  "StrategyExplorer.workflow.financial": "financial",
};

/** A workflow stage takes precedence over its concurrent HTTP requests. */
export function getLoadingMessage(sources: ReadonlyMap<string, LoadingSource>) {
  const active = [...sources.values()];
  const stageSource = active.find((source) => STAGES[source.id]);
  const taskSource = stageSource ?? active.find((source) => TASKS[source.id]);
  const taskId = taskSource?.id.split(".").slice(0, 2).join(".");
  const task = taskId ? TASKS[taskId] : undefined;
  const stage =
    copy.stages[
      stageSource ? STAGES[stageSource.id] : (task?.stage ?? "preparing")
    ];

  return {
    title: task?.title ?? copy.titles.analysis,
    text: stage.active,
    waitingText: stage.waiting,
    startedAt: active.length
      ? Math.min(...active.map((source) => source.startedAt))
      : 0,
  };
}
