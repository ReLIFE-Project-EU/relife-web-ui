import { createContext } from "react";
import type { IHomeAssistantServices } from "../services/types";

export const ServiceContext = createContext<IHomeAssistantServices | null>(
  null,
);
