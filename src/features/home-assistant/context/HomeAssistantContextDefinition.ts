import { createContext, type Dispatch } from "react";
import type { EnergyTariff } from "../../../services/energyTariffService";
import type { HomeAssistantAction, HomeAssistantState } from "./types";

export interface HomeAssistantContextValue {
  gasTariff: EnergyTariff;
  electricityTariff: EnergyTariff;
  state: HomeAssistantState;
  dispatch: Dispatch<HomeAssistantAction>;
}

export const HomeAssistantContext =
  createContext<HomeAssistantContextValue | null>(null);
