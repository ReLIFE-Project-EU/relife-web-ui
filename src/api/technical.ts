import { ServiceType } from "../types/common";
import type { McdaTopsisRequest, McdaTopsisResponse } from "../types/technical";
import { createServiceApi, request } from "./client";

export const technical = {
  ...createServiceApi(ServiceType.TECHNICAL),

  runTopsis: (data: McdaTopsisRequest) =>
    request<McdaTopsisResponse>("/technical/mcda/topsis", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
