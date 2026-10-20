/** "n/a" for a null IRR or ROI, with the cause (read from year 0) on hover. */

import { Text, Tooltip } from "@mantine/core";
import type { FinancialResults } from "../../types/renovation";

interface NotApplicableProps {
  result: FinancialResults | undefined;
}

export function NotApplicable({ result }: NotApplicableProps) {
  const noUpfront =
    result?.riskAssessment?.cashFlowData?.initial_investment === 0;

  return (
    <Tooltip
      label={
        noUpfront
          ? "Not applicable: no upfront investment"
          : "Not applicable: no payback within horizon"
      }
      withArrow
    >
      <Text span inherit style={{ cursor: "help" }}>
        n/a
      </Text>
    </Tooltip>
  );
}
