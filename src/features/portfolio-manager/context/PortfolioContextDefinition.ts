/**
 * Context definition for the Portfolio Manager.
 */

import { createContext, type Dispatch } from "react";
import type { PortfolioAction, PortfolioState } from "./types";

export interface PortfolioContextValue {
  state: PortfolioState;
  dispatch: Dispatch<PortfolioAction>;
}

export const PortfolioContext = createContext<PortfolioContextValue | null>(
  null,
);
