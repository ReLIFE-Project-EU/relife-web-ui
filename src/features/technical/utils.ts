export const TECHNICAL_PROFILES = [
  { value: "Environment-Oriented", label: "Environment" },
  { value: "Comfort-Oriented", label: "Comfort" },
  { value: "Financally-Oriented", label: "Financial" }, // Backend typo preserved in value
] as const;

export const DEFAULT_PROFILE = "Environment-Oriented";

export const LOADING_OVERLAY_PROPS = {
  zIndex: 1000,
  overlayProps: { radius: "sm" as const, blur: 2 },
} as const;

export const ICON_SIZES = {
  header: 24,
  inline: 16,
} as const;

export const getScoreRating = (
  score: number,
): { label: string; color: string; variant: string } => {
  if (score >= 75) {
    return { label: "Excellent", color: "green", variant: "light" };
  } else if (score >= 60) {
    return { label: "Good", color: "teal", variant: "light" };
  } else if (score >= 40) {
    return { label: "Fair", color: "yellow", variant: "light" };
  } else {
    return { label: "Needs Improvement", color: "orange", variant: "light" };
  }
};

export const getProgressColor = (score: number): string => {
  if (score >= 75) return "green";
  if (score >= 60) return "teal";
  if (score >= 40) return "yellow";
  return "orange";
};

export const getProfileDescription = (
  kpiWeight: number,
  numMetrics: number,
) => {
  const totalPillarWeight = kpiWeight * numMetrics;
  const percentage = (totalPillarWeight * 100).toFixed(1);

  const emphasis =
    totalPillarWeight >= 0.15
      ? "High"
      : totalPillarWeight >= 0.1
        ? "Medium"
        : "Low";

  return {
    percentage,
    emphasis,
    description:
      emphasis === "High"
        ? "This pillar has high priority in your selected profile"
        : emphasis === "Medium"
          ? "This pillar has moderate priority in your selected profile"
          : "This pillar has lower priority in your selected profile",
  };
};

export const getOverallAssessment = (
  metrics: Array<{ value: number }>,
): string => {
  if (metrics.length === 0) {
    return "No metrics available for assessment.";
  }

  const avgScore =
    metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;

  if (avgScore >= 75) {
    return "Your performance is excellent across all metrics. Keep up the great work!";
  } else if (avgScore >= 60) {
    return "Your performance is good overall. Consider focusing on the lower-scoring metrics for improvement.";
  } else if (avgScore >= 40) {
    return "Your performance is fair. There are opportunities for significant improvements across several metrics.";
  } else {
    return "Your metrics indicate substantial room for improvement. Consider reviewing best practices and setting improvement targets.";
  }
};
