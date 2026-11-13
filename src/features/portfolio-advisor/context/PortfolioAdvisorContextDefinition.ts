import { createContext, type Dispatch } from "react";
import type { EnergyTariff } from "../../../services/energyTariffService";
import type { PortfolioAdvisorAction, PortfolioAdvisorState } from "./types";

export interface PortfolioAdvisorContextValue {
  gasTariff: EnergyTariff;
  electricityTariff: EnergyTariff;
  state: PortfolioAdvisorState;
  dispatch: Dispatch<PortfolioAdvisorAction>;
}

export const PortfolioAdvisorContext =
  createContext<PortfolioAdvisorContextValue | null>(null);
