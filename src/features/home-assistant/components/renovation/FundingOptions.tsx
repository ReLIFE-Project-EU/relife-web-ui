/**
 * FundingOptions Component
 * Financing configuration for the homeowner: how the cost is covered
 * (own funds or a loan) and any upfront subsidy that reduces it first.
 */

import { Card, Stack, Text, Title } from "@mantine/core";
import {
  FinancingTypeCards,
  SubsidyInput,
} from "../../../../components/shared";
import { useHomeAssistant } from "../../hooks/useHomeAssistant";

export function FundingOptions() {
  const { state, dispatch } = useHomeAssistant();
  const { funding } = state;

  return (
    <Card withBorder radius="md" p="lg">
      <Stack gap="lg">
        <Title order={4}>Financing Options</Title>

        <Text size="sm" c="dimmed">
          Choose the setup that best matches how you expect to pay for the
          renovation.
        </Text>

        <FinancingTypeCards
          value={funding.financingType}
          onChange={(financingType) =>
            dispatch({ type: "SET_FINANCING_TYPE", financingType })
          }
          loan={funding.loan}
          onLoanChange={(loan) => dispatch({ type: "SET_LOAN", loan })}
        />

        <SubsidyInput
          incentives={funding.incentives}
          onChange={(incentives) =>
            dispatch({ type: "SET_INCENTIVES", incentives })
          }
          amountHelperText="Applied to each renovation package you compare."
        />
      </Stack>
    </Card>
  );
}
