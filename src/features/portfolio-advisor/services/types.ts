/**
 * Service interfaces for the Portfolio Renovation Advisor.
 */

import type {
  IBuildingService,
  IEnergyService,
  IFinancialService,
  IMCDAService,
  IRenovationService,
} from "../../../services/types";
import type {
  FundingOptions,
  RenovationMeasureId,
} from "../../../types/renovation";
import type { FinancingScheme } from "../constants";
import type { BuildingAnalysisResult, PRABuilding } from "../context/types";

export interface IPortfolioAnalysisService {
  analyzePortfolio(
    buildings: PRABuilding[],
    selectedMeasures: RenovationMeasureId[],
    financingScheme: FinancingScheme,
    funding: FundingOptions,
    projectLifetime: number,
    onProgress: (completed: number, total: number, current: string) => void,
    globalCapex?: number | null,
    globalMaintenanceCost?: number | null,
  ): Promise<Record<string, BuildingAnalysisResult>>;
}

export interface IPortfolioAdvisorServices {
  building: IBuildingService;
  energy: IEnergyService;
  renovation: IRenovationService;
  financial: IFinancialService;
  mcda: IMCDAService;
  portfolioAnalysis: IPortfolioAnalysisService;
}
