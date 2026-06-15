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
   *
   * `skipGlobalLoading` suppresses the global loading overlay — used by the
   * non-critical cost-estimation pre-pass so it doesn't block the page.
   */
  assessRisk: (
    data: RiskAssessmentRequest,
    options?: { skipGlobalLoading?: boolean },
  ) =>
    request<RiskAssessmentResponse>("/financial/risk-assessment", {
      method: "POST",
      body: JSON.stringify(data),
      skipGlobalLoading: options?.skipGlobalLoading,
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
