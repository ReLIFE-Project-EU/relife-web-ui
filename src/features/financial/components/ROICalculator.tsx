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
  Textarea,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconInfoCircle,
  IconCalculator,
  IconCoin,
  IconPercentage,
} from "@tabler/icons-react";
import { useState } from "react";
import { financial } from "../../../api";
import type { ROIRequest, ROIResponse } from "../../../types/financial";
import { parseArrayInput } from "../utils";

export const ROICalculator = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ROIResponse | null>(null);

  // Form state
  const [capex, setCapex] = useState<string | number>(50000);
  const [interestRate, setInterestRate] = useState<string | number>(0.035);
  const [loanTerm, setLoanTerm] = useState<string | number>(20);
  const [loanAmount, setLoanAmount] = useState<string | number>(25000);
  const [subsidy, setSubsidy] = useState<string | number>(15000);
  const [energySavings, setEnergySavings] = useState<string | number>(4500);
  const [maintenanceCost, setMaintenanceCost] = useState<string | number>(500);
  const [otherOutflows, setOtherOutflows] = useState<string | number>(100);

  const [energyMixStr, setEnergyMixStr] = useState<string>("2000, 1500, 500");
  const [energyPricesStr, setEnergyPricesStr] =
    useState<string>("0.15, 0.12, 0.10");

  const handleCalculate = async () => {
    // Guard against concurrent execution
    if (loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Validate all numeric inputs
      const capexNum = Number(capex);
      const interestRateNum = Number(interestRate);
      const loanTermNum = Number(loanTerm);
      const loanAmountNum = Number(loanAmount);
      const subsidyNum = Number(subsidy);
      const energySavingsNum = Number(energySavings);
      const maintenanceCostNum = Number(maintenanceCost);
      const otherOutflowsNum = Number(otherOutflows);

      if (
        !Number.isFinite(capexNum) ||
        !Number.isFinite(interestRateNum) ||
        !Number.isFinite(loanTermNum) ||
        !Number.isFinite(loanAmountNum) ||
        !Number.isFinite(subsidyNum) ||
        !Number.isFinite(energySavingsNum) ||
        !Number.isFinite(maintenanceCostNum) ||
        !Number.isFinite(otherOutflowsNum)
      ) {
        throw new Error(
          "Invalid numeric input. Please ensure all fields contain valid numbers.",
        );
      }

      const energyMix = parseArrayInput(energyMixStr);
      const energyPrices = parseArrayInput(energyPricesStr);

      // Validate energy arrays have matching lengths
      if (energyMix.length !== energyPrices.length) {
        throw new Error(
          `Energy mix and energy prices must have the same number of values. Got ${energyMix.length} energy sources but ${energyPrices.length} prices.`,
        );
      }

      const request: ROIRequest = {
        capex: capexNum,
        interest_rate: interestRateNum,
        loan_term: loanTermNum,
        loan_amount: loanAmountNum,
        subsidy: subsidyNum,
        energy_savings: energySavingsNum,
        maintenance_cost: maintenanceCostNum,
        other_outflows: otherOutflowsNum,
        energy_mix: energyMix,
        energy_prices: energyPrices,
      };

      const response = await financial.calculateROI(request);
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
          <IconPercentage size={24} />
          <Text fw={500} size="lg">
            Return on Investment (ROI)
          </Text>
        </Group>
        <Alert variant="light" color="blue" icon={<IconInfoCircle size={16} />}>
          Measures the efficiency of the investment. It shows the percentage
          return you get back relative to the cost, factoring in savings,
          expenses, and financing over the project life.
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
            description="Total amount borrowed"
            value={loanAmount}
            onChange={setLoanAmount}
            min={0}
            thousandSeparator=","
          />
          <NumberInput
            label="Loan Term (years)"
            description="Duration of loan repayment"
            value={loanTerm}
            onChange={setLoanTerm}
            min={1}
          />
          <NumberInput
            label="Subsidy (€)"
            description="Financial aid amount"
            value={subsidy}
            onChange={setSubsidy}
            min={0}
            thousandSeparator=","
          />
          <NumberInput
            label="Energy Savings (€/year)"
            description="Annual energy savings"
            value={energySavings}
            onChange={setEnergySavings}
            min={0}
            thousandSeparator=","
          />
          <NumberInput
            label="Maintenance Cost (€/year)"
            description="Annual maintenance cost"
            value={maintenanceCost}
            onChange={setMaintenanceCost}
            min={0}
            thousandSeparator=","
          />
          <NumberInput
            label="Other Outflows (€/year)"
            description="Other annual expenses"
            value={otherOutflows}
            onChange={setOtherOutflows}
            min={0}
            thousandSeparator=","
          />
        </SimpleGrid>

        <Textarea
          label="Energy Mix"
          description="Energy consumption from each source in kWh (comma separated). Must match the number of energy prices."
          value={energyMixStr}
          onChange={(e) => setEnergyMixStr(e.currentTarget.value)}
          rows={2}
        />

        <Textarea
          label="Energy Prices"
          description="Price per kWh for each energy source (€/kWh, comma separated). Must match the number of energy sources."
          value={energyPricesStr}
          onChange={(e) => setEnergyPricesStr(e.currentTarget.value)}
          rows={2}
        />

        <Button
          onClick={handleCalculate}
          leftSection={<IconCalculator size={16} />}
          mt="md"
          disabled={loading}
        >
          Calculate ROI
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
                <Text fw={500}>Return on Investment:</Text>
                <Text fw={700} size="xl">
                  {result.roi.toFixed(2)}%
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
