import {
  Alert,
  Box,
  Button,
  Code,
  Divider,
  Group,
  LoadingOverlay,
  NumberInput,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconInfoCircle,
  IconCalculator,
  IconCash,
  IconCoin,
} from "@tabler/icons-react";
import { useState } from "react";
import { financial } from "../../../api";
import type { IIRequest, IIResponse } from "../../../types/financial";

export const IICalculator = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IIResponse | null>(null);

  // Form state - Mantine NumberInput can return undefined
  const [capex, setCapex] = useState<string | number | undefined>(50000);
  const [interestRate, setInterestRate] = useState<string | number | undefined>(
    0.035,
  );
  const [loanTerm, setLoanTerm] = useState<string | number | undefined>(20);
  const [loanAmount, setLoanAmount] = useState<string | number | undefined>(
    25000,
  );
  const [subsidy, setSubsidy] = useState<string | number | undefined>(15000);

  const handleCalculate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Validate inputs are not undefined
      if (
        capex === undefined ||
        interestRate === undefined ||
        loanTerm === undefined ||
        loanAmount === undefined ||
        subsidy === undefined
      ) {
        throw new Error("All fields are required. Please fill in all values.");
      }

      // Convert to numbers and validate they are finite
      const capexNum = Number(capex);
      const interestRateNum = Number(interestRate);
      const loanTermNum = Number(loanTerm);
      const loanAmountNum = Number(loanAmount);
      const subsidyNum = Number(subsidy);

      if (
        !Number.isFinite(capexNum) ||
        !Number.isFinite(interestRateNum) ||
        !Number.isFinite(loanTermNum) ||
        !Number.isFinite(loanAmountNum) ||
        !Number.isFinite(subsidyNum)
      ) {
        throw new Error(
          "Invalid numeric input. Please ensure all fields contain valid numbers.",
        );
      }

      const request: IIRequest = {
        capex: capexNum,
        interest_rate: interestRateNum,
        loan_term: loanTermNum,
        loan_amount: loanAmountNum,
        subsidy: subsidyNum,
      };

      const response = await financial.calculateII(request);
      setResult(response);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "An unknown error occurred",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box pos="relative">
      <LoadingOverlay
        visible={loading}
        zIndex={1000}
        overlayProps={{ radius: "sm", blur: 2 }}
      />
      <Stack gap="md">
        <Group>
          <IconCash size={24} />
          <Text fw={500} size="lg">
            Initial Investment (II)
          </Text>
        </Group>
        <Alert variant="light" color="blue" icon={<IconInfoCircle size={16} />}>
          Estimates the net upfront cash required to start the project. It takes
          into account the total capital expenditure (CAPEX) minus any loans and
          subsidies available.
        </Alert>

        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <NumberInput
            label="CAPEX (€)"
            description="Capital Expenditure"
            value={capex}
            onChange={setCapex}
            min={0}
            thousandSeparator=","
          />
          <NumberInput
            label="Interest Rate"
            description="As a decimal (e.g., 0.04 for 4%)"
            value={interestRate}
            onChange={setInterestRate}
            min={0}
            max={1}
            step={0.01}
            decimalScale={4}
          />
          <NumberInput
            label="Loan Amount (€)"
            description="Total amount borrowed for the project"
            value={loanAmount}
            onChange={setLoanAmount}
            min={0}
            thousandSeparator=","
          />
          <NumberInput
            label="Loan Term (years)"
            description="Duration of the loan repayment in years"
            value={loanTerm}
            onChange={setLoanTerm}
            min={1}
          />
          <NumberInput
            label="Subsidy (€)"
            description="Financial aid or grant amount received"
            value={subsidy}
            onChange={setSubsidy}
            min={0}
            thousandSeparator=","
          />
        </SimpleGrid>

        <Button
          onClick={handleCalculate}
          leftSection={<IconCalculator size={16} />}
          mt="md"
          disabled={loading}
        >
          Calculate II
        </Button>

        {error && (
          <Alert
            color="red"
            title="Error"
            icon={<IconAlertCircle size={16} />}
            mt="md"
          >
            {error}
          </Alert>
        )}

        {result && (
          <Alert
            color="teal"
            title="Calculation Result"
            icon={<IconCoin size={16} />}
            mt="md"
          >
            <Stack gap="xs">
              <Group justify="space-between">
                <Text fw={500}>Initial Investment:</Text>
                <Text fw={700} size="xl">
                  {result.ii.toLocaleString(undefined, {
                    style: "currency",
                    currency: "EUR",
                  })}
                </Text>
              </Group>
              <Divider my="xs" />
              <Text size="xs" fw={500}>
                Input Parameters:
              </Text>
              <Code block>{JSON.stringify(result.input, null, 2)}</Code>
            </Stack>
          </Alert>
        )}
      </Stack>
    </Box>
  );
};
