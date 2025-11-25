import {
  Alert,
  Box,
  Button,
  Card,
  Code,
  Container,
  Divider,
  Group,
  LoadingOverlay,
  NumberInput,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  Textarea,
  Title,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconCalculator,
  IconCash,
  IconChartLine,
  IconCoin,
} from "@tabler/icons-react";
import { useState } from "react";
import { financial } from "../api";
import type {
  IIRequest,
  IIResponse,
  NPVRequest,
  NPVResponse,
} from "../types/financial";

// ============================================================================
// NPV Calculator Component
// ============================================================================

const NPVCalculator = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<NPVResponse | null>(null);

  // Form state
  const [initialInvestment, setInitialInvestment] = useState<string | number>(
    10000,
  );
  const [discountRate, setDiscountRate] = useState<string | number>(0.05);
  const [energySavings, setEnergySavings] = useState<string | number>(2000);
  const [lifetime, setLifetime] = useState<string | number>(10);
  const [cashFlowsStr, setCashFlowsStr] = useState<string>(
    "2000, 2100, 2200, 2300, 2400, 2500, 2500, 2500, 2500, 2500",
  );

  const handleCalculate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Parse cash flows from comma-separated string
      const cashFlows = cashFlowsStr
        .split(",")
        .map((s) => parseFloat(s.trim()))
        .filter((n) => !isNaN(n));

      const request: NPVRequest = {
        initial_investment: Number(initialInvestment),
        discount_rate: Number(discountRate),
        energy_savings: Number(energySavings),
        lifetime: Number(lifetime),
        cash_flows: cashFlows,
      };

      const response = await financial.calculateNPV(request);
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
    <Card withBorder shadow="sm" radius="md" p="lg">
      <Box pos="relative">
        <LoadingOverlay
          visible={loading}
          zIndex={1000}
          overlayProps={{ radius: "sm", blur: 2 }}
        />
        <Stack gap="md">
          <Group>
            <IconChartLine size={24} />
            <Text fw={500} size="lg">
              Net Present Value (NPV)
            </Text>
          </Group>
          <Text size="sm" c="dimmed">
            Calculate the difference between the present value of cash inflows
            and the present value of cash outflows over a period of time.
          </Text>

          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <NumberInput
              label="Initial Investment (€)"
              description="Total upfront cost required to start the project"
              value={initialInvestment}
              onChange={setInitialInvestment}
              min={0}
              thousandSeparator=","
            />
            <NumberInput
              label="Discount Rate"
              description="As a decimal (e.g., 0.05 for 5%)"
              value={discountRate}
              onChange={setDiscountRate}
              min={0}
              max={1}
              step={0.01}
              decimalScale={4}
            />
            <NumberInput
              label="Energy Savings (€/year)"
              description="Estimated annual savings from energy efficiency"
              value={energySavings}
              onChange={setEnergySavings}
              min={0}
              thousandSeparator=","
            />
            <NumberInput
              label="Lifetime (years)"
              description="Expected duration of the project in years"
              value={lifetime}
              onChange={setLifetime}
              min={1}
            />
          </SimpleGrid>

          <Textarea
            label="Cash Flows"
            description="Enter yearly cash flows separated by commas"
            value={cashFlowsStr}
            onChange={(e) => setCashFlowsStr(e.currentTarget.value)}
            rows={3}
          />

          <Button
            onClick={handleCalculate}
            leftSection={<IconCalculator size={16} />}
            mt="md"
          >
            Calculate NPV
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
                  <Text fw={500}>Net Present Value:</Text>
                  <Text fw={700} size="xl">
                    {result.npv.toLocaleString(undefined, {
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
    </Card>
  );
};

// ============================================================================
// Initial Investment (II) Calculator Component
// ============================================================================

const IICalculator = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IIResponse | null>(null);

  // Form state
  const [capex, setCapex] = useState<string | number>(50000);
  const [interestRate, setInterestRate] = useState<string | number>(0.04);
  const [loanTerm, setLoanTerm] = useState<string | number>(10);
  const [loanAmount, setLoanAmount] = useState<string | number>(30000);
  const [subsidy, setSubsidy] = useState<string | number>(5000);

  const handleCalculate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const request: IIRequest = {
        capex: Number(capex),
        interest_rate: Number(interestRate),
        loan_term: Number(loanTerm),
        loan_amount: Number(loanAmount),
        subsidy: Number(subsidy),
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
    <Card withBorder shadow="sm" radius="md" p="lg">
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
          <Text size="sm" c="dimmed">
            Calculate the total initial investment required, considering loans
            and subsidies.
          </Text>

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
    </Card>
  );
};

// ============================================================================
// Main Page Component
// ============================================================================

export const FinancialAnalysis = () => {
  return (
    <Container size="xl">
      <Stack gap="lg">
        <div>
          <Title order={1}>Financial Analysis</Title>
          <Text size="lg" c="dimmed">
            Evaluate project feasibility using standard financial metrics.
          </Text>
        </div>

        <Tabs defaultValue="npv" keepMounted={false}>
          <Tabs.List>
            <Tabs.Tab value="npv" leftSection={<IconChartLine size={14} />}>
              Net Present Value (NPV)
            </Tabs.Tab>
            <Tabs.Tab value="ii" leftSection={<IconCash size={14} />}>
              Initial Investment (II)
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="npv" pt="md">
            <NPVCalculator />
          </Tabs.Panel>

          <Tabs.Panel value="ii" pt="md">
            <IICalculator />
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
};
