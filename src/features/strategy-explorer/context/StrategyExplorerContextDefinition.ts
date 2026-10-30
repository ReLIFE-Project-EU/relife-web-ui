import { createContext, type Dispatch } from "react";
import type { GasTariff } from "../../../services/gasTariffService";
import type { StrategyExplorerAction, StrategyExplorerState } from "./types";

export interface StrategyExplorerContextValue {
  gasTariff: GasTariff;
  state: StrategyExplorerState;
  dispatch: Dispatch<StrategyExplorerAction>;
}

export const StrategyExplorerContext =
  createContext<StrategyExplorerContextValue | null>(null);
