import { createContext, type Dispatch } from "react";
import type { StrategyExplorerAction, StrategyExplorerState } from "./types";

export interface StrategyExplorerContextValue {
  state: StrategyExplorerState;
  dispatch: Dispatch<StrategyExplorerAction>;
}

export const StrategyExplorerContext =
  createContext<StrategyExplorerContextValue | null>(null);
