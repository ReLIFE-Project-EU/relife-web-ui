import { ServiceType } from "../types/common";
import type {
  EERequest,
  EEResponse,
  FVRequest,
  FVResponse,
  REIRequest,
  REIResponse,
  SEIRequest,
  SEIResponse,
  UCRequest,
  UCResponse,
} from "../types/technical";
import { createServiceApi, request } from "./client";

export const technical = {
  ...createServiceApi(ServiceType.TECHNICAL),

  calculateEE: (data: EERequest) =>
    request<EEResponse>("/technical/technical/ee", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  calculateREI: (data: REIRequest) =>
    request<REIResponse>("/technical/financial/rei", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  calculateSEI: (data: SEIRequest) =>
    request<SEIResponse>("/technical/technical/sei", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  calculateUC: (data: UCRequest) =>
    request<UCResponse>("/technical/technical/uc", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  calculateFV: (data: FVRequest) =>
    request<FVResponse>("/technical/technical/fv", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
