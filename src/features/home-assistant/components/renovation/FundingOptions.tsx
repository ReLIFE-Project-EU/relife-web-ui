/**
 * FundingOptions Component
 * Allows selection of financing type: Self-funded or Loan.
 * Per design doc: Only two financing options (Equity/Self-funded or Loan).
 */

import {
  Badge,
  Card,
  Group,
  NumberInput,
  SimpleGrid,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { IconCash, IconCreditCard } from "@tabler/icons-react";
import type { FinancingType, LoanDetails } from "../../context/types";
import { useHomeAssistant } from "../../hooks/useHomeAssistant";

export function FundingOptions() {
  const { state, dispatch } = useHomeAssistant();
  const { funding } = state;

  const handleFinancingTypeChange = (value: FinancingType) => {
    dispatch({
      type: "SET_FINANCING_TYPE",
      financingType: value,
    });
  };

  const handleLoanUpdate = (field: keyof LoanDetails, value: number) => {
    dispatch({ type: "UPDATE_LOAN", field, value });
  };

  return (
    <Card withBorder radius="md" p="lg">
      <Stack gap="lg">
        <Title order={4}>Financing Options</Title>

        <Text size="sm" c="dimmed">
          Choose how you plan to finance the renovation costs.
        </Text>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <FinancingCard
            selected={funding.financingType === "self-funded"}
            icon={<IconCash size={18} />}
            title="Self-funded"
            description="Pay the full renovation cost upfront from your own savings"
            onClick={() => handleFinancingTypeChange("self-funded")}
          />
          <FinancingCard
            selected={funding.financingType === "loan"}
            icon={<IconCreditCard size={18} />}
            title="Loan"
            description="Finance part of the renovation through a bank loan"
            onClick={() => handleFinancingTypeChange("loan")}
          />
        </SimpleGrid>

        {funding.financingType === "loan" && (
          <Card withBorder radius="md" p="md" bg="gray.0">
            <Stack gap="sm">
              <Text size="sm" fw={600}>
                Loan configuration
              </Text>
              <NumberInput
                label="Loan percentage"
                description="Percentage of renovation cost to finance"
                value={funding.loan.percentage}
                onChange={(value) =>
                  handleLoanUpdate(
                    "percentage",
                    typeof value === "number" ? value : 80,
                  )
                }
                suffix="%"
                min={10}
                max={100}
                step={5}
                size="sm"
              />

              <NumberInput
                label="Loan duration"
                description="Repayment period in years"
                value={funding.loan.duration}
                onChange={(value) =>
                  handleLoanUpdate(
                    "duration",
                    typeof value === "number" ? value : 10,
                  )
                }
                suffix=" years"
                min={1}
                max={30}
                size="sm"
              />

              <NumberInput
                label="Annual interest rate"
                description="Expected loan interest rate"
                value={funding.loan.interestRate * 100}
                onChange={(value) =>
                  handleLoanUpdate(
                    "interestRate",
                    typeof value === "number" ? value / 100 : 0.05,
                  )
                }
                suffix="%"
                min={0}
                max={20}
                step={0.5}
                decimalScale={2}
                size="sm"
              />
            </Stack>
          </Card>
        )}
      </Stack>
    </Card>
  );
}

interface FinancingCardProps {
  selected: boolean;
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}

function FinancingCard({
  selected,
  icon,
  title,
  description,
  onClick,
}: FinancingCardProps) {
  return (
    <UnstyledButton onClick={onClick} w="100%">
      <Card
        withBorder
        radius="md"
        p="md"
        style={{
          borderColor: selected ? "var(--mantine-color-teal-6)" : undefined,
          backgroundColor: selected
            ? "var(--mantine-color-teal-0)"
            : undefined,
        }}
      >
        <Group justify="space-between" mb="xs">
          <Group gap="xs">
            {icon}
            <Text fw={600} size="sm">
              {title}
            </Text>
          </Group>
          {selected && (
            <Badge size="xs" color="teal" variant="filled">
              Selected
            </Badge>
          )}
        </Group>
        <Text size="xs" c="dimmed">
          {description}
        </Text>
      </Card>
    </UnstyledButton>
  );
}
