import { createContext, type Dispatch } from "react";
import type { HomeAssistantAction, HomeAssistantState } from "./types";

export interface HomeAssistantContextValue {
  state: HomeAssistantState;
  dispatch: Dispatch<HomeAssistantAction>;
}

export const HomeAssistantContext =
  createContext<HomeAssistantContextValue | null>(null);
