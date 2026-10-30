import { createContext, type Dispatch } from "react";
import type { GasTariff } from "../../../services/gasTariffService";
import type { HomeAssistantAction, HomeAssistantState } from "./types";

export interface HomeAssistantContextValue {
  gasTariff: GasTariff;
  state: HomeAssistantState;
  dispatch: Dispatch<HomeAssistantAction>;
}

export const HomeAssistantContext =
  createContext<HomeAssistantContextValue | null>(null);
