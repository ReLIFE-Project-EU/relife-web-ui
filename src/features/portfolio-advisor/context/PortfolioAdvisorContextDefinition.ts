import { createContext, type Dispatch } from "react";
import type { GasTariff } from "../../../services/gasTariffService";
import type { PortfolioAdvisorAction, PortfolioAdvisorState } from "./types";

export interface PortfolioAdvisorContextValue {
  gasTariff: GasTariff;
  state: PortfolioAdvisorState;
  dispatch: Dispatch<PortfolioAdvisorAction>;
}

export const PortfolioAdvisorContext =
  createContext<PortfolioAdvisorContextValue | null>(null);
