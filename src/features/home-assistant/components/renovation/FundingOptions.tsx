/**
 * FundingOptions Component
 * Allows selection of financing type: Self-funded or Loan.
 * Per design doc: Only two financing options (Equity/Self-funded or Loan).
 */

import {
  Card,
  Group,
  NumberInput,
  Radio,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconCash, IconCreditCard } from "@tabler/icons-react";
import type { FinancingType, LoanDetails } from "../../context/types";
import { useHomeAssistant } from "../../hooks/useHomeAssistant";

export function FundingOptions() {
  const { state, dispatch } = useHomeAssistant();
  const { funding } = state;

  const handleFinancingTypeChange = (value: string) => {
    dispatch({
      type: "SET_FINANCING_TYPE",
      financingType: value as FinancingType,
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

        <Radio.Group
          value={funding.financingType}
          onChange={handleFinancingTypeChange}
        >
          <Stack gap="md">
            {/* Self-funded Option */}
            <FinancingCard
              value="self-funded"
              checked={funding.financingType === "self-funded"}
              icon={<IconCash size={20} />}
              title="Self-funded"
              description="Pay the full renovation cost upfront from your own savings"
            />

            {/* Loan Option */}
            <FinancingCard
              value="loan"
              checked={funding.financingType === "loan"}
              icon={<IconCreditCard size={20} />}
              title="Loan"
              description="Finance part of the renovation through a bank loan"
            >
              {funding.financingType === "loan" && (
                <Stack gap="sm" mt="md">
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
              )}
            </FinancingCard>
          </Stack>
        </Radio.Group>
      </Stack>
    </Card>
  );
}

interface FinancingCardProps {
  value: string;
  checked: boolean;
  icon: React.ReactNode;
  title: string;
  description: string;
  children?: React.ReactNode;
}

function FinancingCard({
  value,
  checked,
  icon,
  title,
  description,
  children,
}: FinancingCardProps) {
  return (
    <Stack
      gap="xs"
      p="md"
      style={{
        backgroundColor: checked
          ? "var(--mantine-color-blue-0)"
          : "var(--mantine-color-gray-0)",
        borderRadius: "var(--mantine-radius-sm)",
        border: checked
          ? "1px solid var(--mantine-color-blue-3)"
          : "1px solid var(--mantine-color-gray-3)",
        transition: "all 0.2s ease",
        cursor: "pointer",
      }}
    >
      <Radio
        value={value}
        label={
          <Group gap="xs" ml="xs">
            <span
              style={{
                color: checked
                  ? "var(--mantine-color-blue-6)"
                  : "var(--mantine-color-gray-6)",
              }}
            >
              {icon}
            </span>
            <Text size="sm" fw={600}>
              {title}
            </Text>
          </Group>
        }
        description={description}
        styles={{
          label: { cursor: "pointer" },
          description: { marginLeft: "calc(20px + var(--mantine-spacing-xs))" },
        }}
      />
      {children}
    </Stack>
  );
}
