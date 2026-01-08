/**
 * FundingOptions Component
 * Allows configuration of funding options: Returns on Bills, Loan, and Subsidy.
 */

import {
  Card,
  Checkbox,
  Group,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useHomeAssistant } from "../../hooks/useHomeAssistant";

export function FundingOptions() {
  const { state, dispatch } = useHomeAssistant();
  const { funding } = state;

  const handleToggle = (fundingType: keyof typeof funding) => {
    dispatch({ type: "TOGGLE_FUNDING", fundingType });
  };

  const handleUpdate = (
    fundingType: keyof typeof funding,
    field: string,
    value: unknown,
  ) => {
    dispatch({ type: "UPDATE_FUNDING", fundingType, field, value });
  };

  return (
    <Card withBorder radius="md" p="lg">
      <Stack gap="lg">
        <Title order={4}>Funding Options</Title>

        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
          {/* Returns on Bills */}
          <FundingCard
            title="Returns on Bills"
            checked={funding.returnsOnBills.enabled}
          >
            <Checkbox
              label="Returns on Bills"
              description="Repay through energy savings"
              checked={funding.returnsOnBills.enabled}
              onChange={() => handleToggle("returnsOnBills")}
            />

            {funding.returnsOnBills.enabled && (
              <NumberInput
                label="% of Saved Energy"
                description="Portion of savings for repayment"
                value={funding.returnsOnBills.percentOfSavedEnergy}
                onChange={(value) =>
                  handleUpdate(
                    "returnsOnBills",
                    "percentOfSavedEnergy",
                    typeof value === "number" ? value : 0,
                  )
                }
                suffix="%"
                min={0}
                max={100}
                step={5}
                size="sm"
              />
            )}
          </FundingCard>

          {/* Loan */}
          <FundingCard title="Loan" checked={funding.loan.enabled}>
            <Checkbox
              label="Loan"
              description="Finance through borrowing"
              checked={funding.loan.enabled}
              onChange={() => handleToggle("loan")}
            />

            {funding.loan.enabled && (
              <Stack gap="xs">
                <NumberInput
                  label="Loan Amount Limit"
                  value={funding.loan.amountLimit}
                  onChange={(value) =>
                    handleUpdate(
                      "loan",
                      "amountLimit",
                      typeof value === "number" ? value : 0,
                    )
                  }
                  prefix="€ "
                  min={0}
                  max={500000}
                  step={5000}
                  thousandSeparator=","
                  size="sm"
                />

                <NumberInput
                  label="Loan Duration"
                  value={funding.loan.duration}
                  onChange={(value) =>
                    handleUpdate(
                      "loan",
                      "duration",
                      typeof value === "number" ? value : 0,
                    )
                  }
                  suffix=" years"
                  min={1}
                  max={30}
                  size="sm"
                />

                <Select
                  label="Interest Rate Type"
                  data={[
                    { value: "floating", label: "Floating Rate" },
                    { value: "fixed", label: "Fixed Rate" },
                  ]}
                  value={funding.loan.rateType}
                  onChange={(value) =>
                    handleUpdate("loan", "rateType", value || "floating")
                  }
                  size="sm"
                  allowDeselect={false}
                />
              </Stack>
            )}
          </FundingCard>

          {/* Subsidy */}
          <FundingCard title="Subsidy" checked={funding.subsidy.enabled}>
            <Checkbox
              label="Subsidy"
              description="Government or institutional grants"
              checked={funding.subsidy.enabled}
              onChange={() => handleToggle("subsidy")}
            />

            {funding.subsidy.enabled && (
              <Stack gap="xs">
                <NumberInput
                  label="% of Total"
                  description="Subsidy coverage percentage"
                  value={funding.subsidy.percentOfTotal}
                  onChange={(value) =>
                    handleUpdate(
                      "subsidy",
                      "percentOfTotal",
                      typeof value === "number" ? value : 0,
                    )
                  }
                  suffix="%"
                  min={0}
                  max={100}
                  step={5}
                  size="sm"
                />

                <NumberInput
                  label="Subsidy Amount Limit"
                  value={funding.subsidy.amountLimit}
                  onChange={(value) =>
                    handleUpdate(
                      "subsidy",
                      "amountLimit",
                      typeof value === "number" ? value : 0,
                    )
                  }
                  prefix="€ "
                  min={0}
                  max={100000}
                  step={1000}
                  thousandSeparator=","
                  size="sm"
                />
              </Stack>
            )}
          </FundingCard>
        </SimpleGrid>
      </Stack>
    </Card>
  );
}

interface FundingCardProps {
  title: string;
  checked: boolean;
  children: React.ReactNode;
}

function FundingCard({ title, checked, children }: FundingCardProps) {
  return (
    <Stack
      gap="md"
      p="md"
      style={{
        backgroundColor: checked
          ? "var(--mantine-color-blue-0)"
          : "var(--mantine-color-gray-0)",
        borderRadius: "var(--mantine-radius-sm)",
        border: checked
          ? "1px solid var(--mantine-color-blue-3)"
          : "1px solid transparent",
        transition: "all 0.2s ease",
      }}
    >
      <Group justify="space-between" align="center">
        <Text size="sm" fw={600} c={checked ? "blue" : "dimmed"}>
          {title}
        </Text>
      </Group>
      {children}
    </Stack>
  );
}
