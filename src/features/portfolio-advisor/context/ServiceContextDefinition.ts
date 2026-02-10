import { createContext } from "react";
import type { IPortfolioAdvisorServices } from "../services/types";

export const PortfolioAdvisorServiceContext =
  createContext<IPortfolioAdvisorServices | null>(null);
