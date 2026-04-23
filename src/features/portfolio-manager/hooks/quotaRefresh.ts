import type { Dispatch } from "react";
import { quotaApi } from "../api";
import type { PortfolioAction } from "../context/types";

export async function refreshPortfolioQuota(
  dispatch: Dispatch<PortfolioAction>,
): Promise<void> {
  try {
    const quota = await quotaApi.get();
    dispatch({ type: "SET_QUOTA", quota });
  } catch (err) {
    console.error("Failed to refresh quota:", err);
  }
}
