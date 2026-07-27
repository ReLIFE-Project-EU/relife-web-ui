import type { FundingOptions } from "../types/renovation";

/**
 * Starting financing configuration, shared by all three tools so they cannot
 * drift apart: own funds, no subsidy. Each tool seeds its own state from this
 * and the user takes it from there.
 */
export const DEFAULT_FUNDING_OPTIONS: FundingOptions = {
  financingType: "self-funded",
  loan: {
    percentage: 80,
    duration: 10,
  },
  incentives: {
    mode: "percentage",
    upfrontPercentage: 0,
    upfrontAmount: 0,
  },
};
