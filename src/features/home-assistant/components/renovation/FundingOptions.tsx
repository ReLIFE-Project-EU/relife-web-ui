/**
 * FundingOptions Component
 * Allows selection of financing type: Self-funded or Loan.
 * Per design doc: Only two financing options (Equity/Self-funded or Loan).
 */

import {
  Alert,
  Badge,
  Card,
  Divider,
  Group,
  NumberInput,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
  UnstyledButton,
} from "@mantine/core";
import {
  IconCash,
  IconCreditCard,
  IconGift,
  IconPigMoney,
} from "@tabler/icons-react";
import type {
  FinancingType,
  IncentiveDetails,
  LoanDetails,
} from "../../context/types";
import { useHomeAssistant } from "../../hooks/useHomeAssistant";

export function FundingOptions() {
  const { state, dispatch } = useHomeAssistant();
  const { funding } = state;
  const projectLifetime = state.building.projectLifetime;
  const lifetimeIncentivesPartiallyFilled =
    (funding.incentives.lifetimeAmount > 0 &&
      funding.incentives.lifetimeYears === 0) ||
    (funding.incentives.lifetimeAmount === 0 &&
      funding.incentives.lifetimeYears > 0);

  const handleFinancingTypeChange = (value: FinancingType) => {
    dispatch({
      type: "SET_FINANCING_TYPE",
      financingType: value,
    });
  };

  const handleLoanUpdate = (field: keyof LoanDetails, value: number) => {
    dispatch({ type: "UPDATE_LOAN", field, value });
  };

  const handleIncentiveUpdate = (
    field: keyof IncentiveDetails,
    value: number,
  ) => {
    dispatch({ type: "UPDATE_INCENTIVE", field, value });
  };

  return (
    <Card withBorder radius="md" p="lg">
      <Stack gap="lg">
        <Title order={4}>Financing Options</Title>

        <Text size="sm" c="dimmed">
          Choose the setup that best matches how you expect to pay for the
          renovation.
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

        <Divider />

        <Card withBorder radius="md" p="md" bg="gray.0">
          <Stack gap="md">
            <Group justify="space-between" align="flex-start" gap="sm">
              <Group gap="sm" align="flex-start">
                <ThemeIcon color="grape" variant="light" size="lg" radius="xl">
                  <IconGift size={16} />
                </ThemeIcon>
                <div>
                  <Text size="sm" fw={600}>
                    Incentives
                  </Text>
                  <Text size="xs" c="dimmed">
                    Optional support that can lower your upfront cost or improve
                    yearly savings.
                  </Text>
                </div>
              </Group>
              <Badge variant="light" color="gray">
                Optional
              </Badge>
            </Group>

            <NumberInput
              label="Upfront support"
              description="A one-time contribution at the start of the project"
              value={funding.incentives.upfrontPercentage}
              onChange={(value) =>
                handleIncentiveUpdate(
                  "upfrontPercentage",
                  typeof value === "number" ? value : 0,
                )
              }
              suffix="%"
              min={0}
              max={100}
              step={1}
              clampBehavior="strict"
              size="sm"
            />

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <NumberInput
                label="Yearly support"
                description="Reduction in yearly operating costs"
                value={funding.incentives.lifetimeAmount}
                onChange={(value) =>
                  handleIncentiveUpdate(
                    "lifetimeAmount",
                    typeof value === "number" ? value : 0,
                  )
                }
                prefix="EUR "
                min={0}
                step={100}
                clampBehavior="strict"
                error={
                  lifetimeIncentivesPartiallyFilled
                    ? "Enter both the yearly amount and the number of years."
                    : undefined
                }
                size="sm"
              />

              <NumberInput
                label="Support duration"
                description={`How many years it lasts, up to ${projectLifetime} years`}
                value={funding.incentives.lifetimeYears}
                onChange={(value) =>
                  handleIncentiveUpdate(
                    "lifetimeYears",
                    typeof value === "number" ? value : 0,
                  )
                }
                suffix=" years"
                min={0}
                max={projectLifetime}
                step={1}
                decimalScale={0}
                clampBehavior="strict"
                error={
                  lifetimeIncentivesPartiallyFilled
                    ? "Enter both the yearly amount and the number of years."
                    : undefined
                }
                size="sm"
              />
            </SimpleGrid>

            {lifetimeIncentivesPartiallyFilled && (
              <Alert color="yellow" variant="light">
                Lifetime support only works when both the amount and duration
                are filled in.
              </Alert>
            )}
          </Stack>
        </Card>

        {funding.financingType === "loan" && (
          <Card withBorder radius="md" p="md" bg="blue.0">
            <Stack gap="md">
              <Group gap="sm" align="flex-start">
                <ThemeIcon color="blue" variant="light" size="lg" radius="xl">
                  <IconPigMoney size={16} />
                </ThemeIcon>
                <div>
                  <Text size="sm" fw={600}>
                    Loan configuration
                  </Text>
                  <Text size="xs" c="dimmed">
                    These settings apply only when you choose a loan.
                  </Text>
                </div>
              </Group>

              <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
                <NumberInput
                  label="How much to borrow"
                  description="Share of the renovation cost covered by the loan"
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
                  label="Repayment period"
                  description="How long you expect to repay the loan"
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
                  label="Interest rate"
                  description="Expected yearly interest on the loan"
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
              </SimpleGrid>
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
          backgroundColor: selected ? "var(--mantine-color-teal-0)" : undefined,
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
        {selected && (
          <Text size="xs" c="teal.7" mt="sm" fw={500}>
            This option will be used in the financial results.
          </Text>
        )}
      </Card>
    </UnstyledButton>
  );
}
