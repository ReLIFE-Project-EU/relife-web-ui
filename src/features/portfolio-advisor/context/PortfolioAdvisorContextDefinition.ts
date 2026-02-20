import { createContext, type Dispatch } from "react";
import type { PortfolioAdvisorAction, PortfolioAdvisorState } from "./types";

export interface PortfolioAdvisorContextValue {
  state: PortfolioAdvisorState;
  dispatch: Dispatch<PortfolioAdvisorAction>;
}

export const PortfolioAdvisorContext =
  createContext<PortfolioAdvisorContextValue | null>(null);
