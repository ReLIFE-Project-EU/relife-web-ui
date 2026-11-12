import { createContext, type Dispatch } from "react";
import type { GasTariff } from "../../../services/gasTariffService";
import type { StrategyExplorerAction, StrategyExplorerState } from "./types";
import type { RSEWorkflowStage } from "../services/rseWorkflowService";

export interface StrategyExplorerContextValue {
  gasTariff: GasTariff;
  state: StrategyExplorerState;
  dispatch: Dispatch<StrategyExplorerAction>;
  setWorkflowStage: (stage: RSEWorkflowStage) => void;
}

export const StrategyExplorerContext =
  createContext<StrategyExplorerContextValue | null>(null);
