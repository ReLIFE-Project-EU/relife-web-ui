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
  IconCoin,
  IconReceipt,
} from "@tabler/icons-react";
import { useState } from "react";
import { financial } from "../../../api";
import type { OPEXRequest, OPEXResponse } from "../../../types/financial";
import { parseArrayInput } from "../utils";

export const OPEXCalculator = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OPEXResponse | null>(null);

  // Form state
  const [maintenanceCost, setMaintenanceCost] = useState<string | number>(500);
  const [energyMixStr, setEnergyMixStr] = useState<string>("2000, 1500, 500");
  const [energyPricesStr, setEnergyPricesStr] =
    useState<string>("0.15, 0.12, 0.10");

  const handleCalculate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Validate maintenance cost
      const maintenanceCostNum = Number(maintenanceCost);
      if (!Number.isFinite(maintenanceCostNum)) {
        throw new Error(
          "Invalid maintenance cost. Please enter a valid number.",
        );
      }

      const energyMix = parseArrayInput(energyMixStr);
      const energyPrices = parseArrayInput(energyPricesStr);

      const request: OPEXRequest = {
        maintenance_cost: maintenanceCostNum,
        energy_mix: energyMix,
        energy_prices: energyPrices,
      };

      const response = await financial.calculateOPEX(request);
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
          <IconReceipt size={24} />
          <Text fw={500} size="lg">
            Operational Expenses (OPEX)
          </Text>
        </Group>
        <Text size="sm" c="dimmed">
          Calculate the operational expenses of the project.
        </Text>

        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <NumberInput
            label="Maintenance Cost (€/year)"
            description="Annual cost for maintenance"
            value={maintenanceCost}
            onChange={setMaintenanceCost}
            min={0}
            thousandSeparator=","
          />
        </SimpleGrid>

        <Textarea
          label="Energy Mix"
          description="Energy consumption from each source (kWh, comma separated)"
          value={energyMixStr}
          onChange={(e) => setEnergyMixStr(e.currentTarget.value)}
          rows={2}
        />

        <Textarea
          label="Energy Prices"
          description="Price per unit for each energy source (comma separated)"
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
          Calculate OPEX
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
                <Text fw={500}>Operational Expenses:</Text>
                <Text fw={700} size="xl">
                  {result.opex.toLocaleString(undefined, {
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
