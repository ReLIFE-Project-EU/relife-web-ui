/**
 * Portfolio-wide financing scenario for RSE, adjusted from the results step and
 * applied explicitly.
 *
 * Unlike HRA/PRA, where a financing change costs one cheap dispatch, an RSE
 * recalculation re-runs the financial layer for every archetype × package
 * combination. So the shared (live) controls are fed from a local draft, and
 * nothing reaches the workflow until Apply — the same draft/apply shape as
 * EnergyTariffPanel.
 */

import { Badge, Button, Card, Group, Stack, Text, Title } from "@mantine/core";
import { IconCoins } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import {
  FinancingTypeCards,
  SubsidyInput,
} from "../../../../components/shared";
import type { FundingOptions } from "../../../../types/renovation";
import { useRSEWorkflow } from "../../hooks/useRSEWorkflow";
import { useStrategyExplorer } from "../../hooks/useStrategyExplorer";

export function FinancingPanel() {
  const { state, dispatch } = useStrategyExplorer();
  const { run, isRunning } = useRSEWorkflow();

  const appliedFunding =
    state.workflowResult?.request.financialAssumptions.funding ?? state.funding;
  const [draft, setDraft] = useState<FundingOptions>(appliedFunding);

  useEffect(() => {
    setDraft(appliedFunding);
  }, [appliedFunding]);

  const isDirty = JSON.stringify(draft) !== JSON.stringify(appliedFunding);
  const canApply =
    isDirty &&
    !isRunning &&
    state.goal !== null &&
    state.portfolio.selections.length > 0 &&
    state.packageIds.length > 0;

  const handleApply = async () => {
    dispatch({ type: "SET_FUNDING", funding: draft });
    await run({ funding: draft });
  };

  return (
    <Card withBorder radius="md" p="lg">
      <Stack gap="md">
        <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm">
          <Group gap="sm" align="center">
            <IconCoins size={20} />
            <div>
              <Title order={4}>Financing scenario</Title>
              <Text size="sm" c="dimmed">
                Applied to every archetype and package in the comparison. A
                subsidy lowers the investment behind NPV, ROI and payback, so it
                can change how the packages rank.
              </Text>
            </div>
          </Group>
          <Badge variant="light" color={isDirty ? "yellow" : "gray"}>
            {isDirty ? "Unsaved changes" : "Applied"}
          </Badge>
        </Group>

        <FinancingTypeCards
          value={draft.financingType}
          onChange={(financingType) => setDraft({ ...draft, financingType })}
          loan={draft.loan}
          onLoanChange={(loan) => setDraft({ ...draft, loan })}
          loanPercentageLabel="Loan percentage"
          loanPercentageDescription="Share of the post-subsidy cost financed by the loan."
        />

        <SubsidyInput
          incentives={draft.incentives}
          onChange={(incentives) => setDraft({ ...draft, incentives })}
          amountHelperText="Applied per dwelling, to every archetype in the portfolio."
        />

        <Group justify="flex-end">
          <Button
            onClick={handleApply}
            disabled={!canApply}
            loading={isRunning}
          >
            {isRunning ? "Recalculating…" : "Apply and recalculate"}
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}
