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
  IconCalculator,
  IconChartLine,
  IconCoin,
} from "@tabler/icons-react";
import { useState } from "react";
import { parseArrayInput } from "../utils";
import { financial } from "../../../api";
import type { NPVRequest, NPVResponse } from "../../../types/financial";

export const NPVCalculator = () => {
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
    // Guard against concurrent execution
    if (loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Validate numeric inputs
      const initInv = Number(initialInvestment);
      const discRate = Number(discountRate);
      const energySav = Number(energySavings);
      const life = Number(lifetime);

      if (
        !Number.isFinite(initInv) ||
        !Number.isFinite(discRate) ||
        !Number.isFinite(energySav) ||
        !Number.isFinite(life)
      ) {
        throw new Error(
          "Invalid numeric input. Please ensure all fields contain valid numbers.",
        );
      }

      // Parse cash flows from comma-separated string
      const cashFlows = parseArrayInput(cashFlowsStr);

      const request: NPVRequest = {
        initial_investment: initInv,
        discount_rate: discRate,
        energy_savings: energySav,
        lifetime: life,
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
          Calculate the difference between the present value of cash inflows and
          the present value of cash outflows over a period of time.
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
          disabled={loading}
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
  );
};
