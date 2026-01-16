import { ServiceType } from "../types/common";
import type {
  ARVRequest,
  ARVResponse,
  RiskAssessmentRequest,
  RiskAssessmentResponse,
} from "../types/financial";
import { createServiceApi, request } from "./client";

export const financial = {
  ...createServiceApi(ServiceType.FINANCIAL),

  /**
   * Perform Monte Carlo risk assessment for energy retrofit project.
   * Runs 10,000 scenarios to assess financial risk and returns.
   */
  assessRisk: (data: RiskAssessmentRequest) =>
    request<RiskAssessmentResponse>("/financial/risk-assessment", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  /**
   * Calculate After Renovation Value (ARV) for a property.
   * Predicts property value based on characteristics and energy class.
   */
  calculateARV: (data: ARVRequest) =>
    request<ARVResponse>("/financial/arv", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
