import { useState } from "react";
import {
  Box,
  Card,
  Group,
  NumberInput,
  Stack,
  Text,
  ThemeIcon,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { IconBolt, IconCash, IconLeaf } from "@tabler/icons-react";
import { StepNavigation } from "../../../components/shared/StepNavigation";
import { useStrategyExplorer } from "../hooks/useStrategyExplorer";
import type { RSERenovationGoal } from "../types";

const GOAL_OPTIONS: Array<{
  kind: RSERenovationGoal["kind"];
  label: string;
  description: string;
  icon: typeof IconCash;
}> = [
  {
    kind: "financial",
    label: "Financial",
    description: "Maximize buildings renovated within a budget.",
    icon: IconCash,
  },
  {
    kind: "energy",
    label: "Energy efficiency",
    description:
      "Prioritize delivered system energy savings and energy saved per euro invested.",
    icon: IconBolt,
  },
  {
    kind: "emission",
    label: "Emission reduction",
    description: "Prioritize CO₂ reduction and CO₂ reduced per euro invested.",
    icon: IconLeaf,
  },
];

export function GoalStep() {
  const { state, dispatch } = useStrategyExplorer();
  const [budget, setBudget] = useState<number | "">("");

  const selectedGoal = state.goal;

  const handleSelect = (kind: RSERenovationGoal["kind"]) => {
    if (kind === "financial") {
      const budgetValue = typeof budget === "number" ? budget : 0;
      dispatch({
        type: "SET_GOAL",
        goal: { kind: "financial", maxBudgetEur: budgetValue },
      });
    } else if (kind === "energy") {
      dispatch({ type: "SET_GOAL", goal: { kind: "energy" } });
    } else {
      dispatch({ type: "SET_GOAL", goal: { kind: "emission" } });
    }
  };

  const handlePrevious = () => {
    dispatch({ type: "SET_STEP", step: 0 });
  };

  const handleNext = () => {
    if (selectedGoal) {
      dispatch({ type: "SET_STEP", step: 2 });
    }
  };

  return (
    <Stack gap="xl">
      <Box>
        <Title order={2} mb="xs">
          Renovation Goal
        </Title>
        <Text c="dimmed" size="sm">
          Choose the primary objective for comparing renovation strategies.
        </Text>
      </Box>

      <Stack gap="md">
        {GOAL_OPTIONS.map((option) => {
          const isSelected = selectedGoal?.kind === option.kind;
          const Icon = option.icon;

          return (
            <UnstyledButton
              key={option.kind}
              onClick={() => handleSelect(option.kind)}
              w="100%"
            >
              <Card
                withBorder
                radius="md"
                p="lg"
                bg={isSelected ? "blue.0" : "white"}
                style={{
                  borderColor: isSelected
                    ? "var(--mantine-color-blue-7)"
                    : undefined,
                  borderWidth: isSelected ? 2 : 1,
                }}
              >
                <Stack gap="sm">
                  <Group gap="sm" align="center">
                    <ThemeIcon
                      size={36}
                      radius="md"
                      color={isSelected ? "blue" : "gray"}
                      variant={isSelected ? "filled" : "light"}
                    >
                      <Icon size={20} />
                    </ThemeIcon>
                    <Box>
                      <Text fw={600} size="md">
                        {option.label}
                      </Text>
                      <Text size="sm" c="dimmed">
                        {option.description}
                      </Text>
                    </Box>
                  </Group>

                  {option.kind === "financial" && isSelected && (
                    <NumberInput
                      label="Maximum budget (EUR)"
                      placeholder="e.g. 1,000,000"
                      value={budget}
                      onChange={(val) => {
                        const num = typeof val === "number" ? val : "";
                        setBudget(num);
                        dispatch({
                          type: "SET_GOAL",
                          goal: {
                            kind: "financial",
                            maxBudgetEur: typeof num === "number" ? num : 0,
                          },
                        });
                      }}
                      min={0}
                      thousandSeparator=","
                      mt="sm"
                    />
                  )}
                </Stack>
              </Card>
            </UnstyledButton>
          );
        })}
      </Stack>

      <StepNavigation
        currentStep={1}
        totalSteps={4}
        onPrevious={handlePrevious}
        previousLabel="Back to portfolio"
        onNext={handleNext}
        nextLabel="Choose packages"
        primaryDisabled={!selectedGoal}
      />
    </Stack>
  );
}
