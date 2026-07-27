/**
 * Service interfaces for the Portfolio Renovation Advisor.
 */

import type {
  FinancialAssumptions,
  IBuildingService,
  IEnergyService,
  IFinancialService,
  IRenovationService,
} from "../../../services/types";
import type {
  FundingOptions,
  RenovationMeasureId,
} from "../../../types/renovation";
import type { BuildingAnalysisResult, PRABuilding } from "../context/types";

export interface PortfolioAnalysisRequest {
  buildings: PRABuilding[];
  selectedMeasures: RenovationMeasureId[];
  funding: FundingOptions;
  projectLifetime: number;
  onProgress: (completed: number, total: number, current: string) => void;
  globalCapex?: number | null;
  globalMaintenanceCost?: number | null;
  financialAssumptions?: FinancialAssumptions;
}

export interface IPortfolioAnalysisService {
  analyzePortfolio(
    request: PortfolioAnalysisRequest,
  ): Promise<Record<string, BuildingAnalysisResult>>;
}

export interface IPortfolioAdvisorServices {
  building: IBuildingService;
  energy: IEnergyService;
  renovation: IRenovationService;
  financial: IFinancialService;
  portfolioAnalysis: IPortfolioAnalysisService;
}
