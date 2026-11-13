import { createContext, type Dispatch } from "react";
import type { EnergyTariff } from "../../../services/energyTariffService";
import type { StrategyExplorerAction, StrategyExplorerState } from "./types";
import type { RSEWorkflowStage } from "../services/rseWorkflowService";

export interface StrategyExplorerContextValue {
  gasTariff: EnergyTariff;
  electricityTariff: EnergyTariff;
  state: StrategyExplorerState;
  dispatch: Dispatch<StrategyExplorerAction>;
  setWorkflowStage: (stage: RSEWorkflowStage) => void;
}

export const StrategyExplorerContext =
  createContext<StrategyExplorerContextValue | null>(null);
