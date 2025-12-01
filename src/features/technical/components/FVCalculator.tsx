import {
  Alert,
  Box,
  Button,
  Divider,
  Group,
  LoadingOverlay,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconCalculator,
  IconCoins,
  IconInfoCircle,
} from "@tabler/icons-react";
import { useState } from "react";
import { technical } from "../../../api";
import type { FVRequest, FVResponse } from "../../../types/technical";
import { DEFAULT_PROFILE, TECHNICAL_PROFILES } from "../utils";
import { ResultDisplay } from "./ResultDisplay";

export const FVCalculator = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FVResponse | null>(null);

  // Form state
  const [profile, setProfile] = useState<string>(DEFAULT_PROFILE);

  // Initial Investment (II)
  const [iiKpi, setIiKpi] = useState<string | number>(500000);
  const [iiMin, setIiMin] = useState<string | number>(300000);
  const [iiMax, setIiMax] = useState<string | number>(1000000);

  // Annual Operating Cost (AOC)
  const [aocKpi, setAocKpi] = useState<string | number>(50000);
  const [aocMin, setAocMin] = useState<string | number>(30000);
  const [aocMax, setAocMax] = useState<string | number>(100000);

  // Internal Rate of Return (IRR)
  const [irrKpi, setIrrKpi] = useState<string | number>(8);
  const [irrMin, setIrrMin] = useState<string | number>(5);
  const [irrMax, setIrrMax] = useState<string | number>(15);

  // Net Present Value (NPV)
  const [npvKpi, setNpvKpi] = useState<string | number>(100000);
  const [npvMin, setNpvMin] = useState<string | number>(-50000);
  const [npvMax, setNpvMax] = useState<string | number>(500000);

  const handleCalculate = async () => {
    if (loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const request: FVRequest = {
        ii_kpi: Number(iiKpi),
        ii_min: Number(iiMin),
        ii_max: Number(iiMax),
        aoc_kpi: Number(aocKpi),
        aoc_min: Number(aocMin),
        aoc_max: Number(aocMax),
        irr_kpi: Number(irrKpi),
        irr_min: Number(irrMin),
        irr_max: Number(irrMax),
        npv_kpi: Number(npvKpi),
        npv_min: Number(npvMin),
        npv_max: Number(npvMax),
        profile: profile,
      };

      const response = await technical.calculateFV(request);
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
          <IconCoins size={24} />
          <Text fw={500} size="lg">
            Financial Viability (FV)
          </Text>
        </Group>

        <Alert variant="light" color="blue" icon={<IconInfoCircle size={16} />}>
          Calculate the Financial Viability score based on investment metrics,
          operating costs, and expected returns.
        </Alert>

        <Select
          label="Optimization Profile"
          description="Select the weighting profile for the calculation"
          data={TECHNICAL_PROFILES}
          value={profile}
          onChange={(value) => value && setProfile(value)}
          allowDeselect={false}
        />

        <Divider label="Initial Investment (II)" labelPosition="left" />
        <SimpleGrid cols={{ base: 1, sm: 3 }}>
          <NumberInput
            label="Current Investment"
            description="Project initial investment amount"
            value={iiKpi}
            onChange={setIiKpi}
            prefix="€"
            thousandSeparator=","
          />
          <NumberInput
            label="Min Investment"
            description="Minimum expected investment"
            value={iiMin}
            onChange={setIiMin}
            prefix="€"
            thousandSeparator=","
          />
          <NumberInput
            label="Max Investment"
            description="Maximum budget threshold"
            value={iiMax}
            onChange={setIiMax}
            prefix="€"
            thousandSeparator=","
          />
        </SimpleGrid>

        <Divider label="Annual Operating Cost (AOC)" labelPosition="left" />
        <SimpleGrid cols={{ base: 1, sm: 3 }}>
          <NumberInput
            label="Current AOC"
            description="Yearly operating and maintenance costs"
            value={aocKpi}
            onChange={setAocKpi}
            prefix="€"
            thousandSeparator=","
          />
          <NumberInput
            label="Min AOC"
            description="Best-case operating costs"
            value={aocMin}
            onChange={setAocMin}
            prefix="€"
            thousandSeparator=","
          />
          <NumberInput
            label="Max AOC"
            description="Worst-case operating costs"
            value={aocMax}
            onChange={setAocMax}
            prefix="€"
            thousandSeparator=","
          />
        </SimpleGrid>

        <Divider label="Internal Rate of Return (IRR)" labelPosition="left" />
        <SimpleGrid cols={{ base: 1, sm: 3 }}>
          <NumberInput
            label="Current IRR (%)"
            description="Expected annual return rate"
            value={irrKpi}
            onChange={setIrrKpi}
            suffix="%"
          />
          <NumberInput
            label="Min IRR (%)"
            description="Minimum acceptable return"
            value={irrMin}
            onChange={setIrrMin}
            suffix="%"
          />
          <NumberInput
            label="Max IRR (%)"
            description="Target return rate"
            value={irrMax}
            onChange={setIrrMax}
            suffix="%"
          />
        </SimpleGrid>

        <Divider label="Net Present Value (NPV)" labelPosition="left" />
        <SimpleGrid cols={{ base: 1, sm: 3 }}>
          <NumberInput
            label="Current NPV"
            description="Present value of future cash flows"
            value={npvKpi}
            onChange={setNpvKpi}
            prefix="€"
            thousandSeparator=","
          />
          <NumberInput
            label="Min NPV"
            description="Minimum acceptable NPV (break-even)"
            value={npvMin}
            onChange={setNpvMin}
            prefix="€"
            thousandSeparator=","
          />
          <NumberInput
            label="Max NPV"
            description="Target NPV for strong viability"
            value={npvMax}
            onChange={setNpvMax}
            prefix="€"
            thousandSeparator=","
          />
        </SimpleGrid>

        <Button
          onClick={handleCalculate}
          leftSection={<IconCalculator size={16} />}
          mt="md"
          disabled={loading}
        >
          Calculate FV
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
          <ResultDisplay
            icon={<IconCoins size={16} />}
            kpiWeight={result.fv_kpi_weight}
            profileName={profile}
            metrics={[
              {
                label: "Initial Investment",
                value: result.ii_normalized,
                isLowerBetter: true,
              },
              {
                label: "Annual Operating Cost",
                value: result.aoc_normalized,
                isLowerBetter: true,
              },
              {
                label: "Internal Rate of Return",
                value: result.irr_normalized,
              },
              {
                label: "Net Present Value",
                value: result.npv_normalized,
              },
            ]}
            explanation={
              "Financial Viability (FV) evaluates the economic feasibility and profitability of your project. " +
              "Initial Investment and Annual Operating Costs are normalized where lower values indicate better cost efficiency. " +
              "Internal Rate of Return (IRR) measures the percentage yield on investment - higher values show stronger returns. " +
              "Net Present Value (NPV) represents the total value created by the project - positive NPV indicates profitability. " +
              "Higher normalized scores suggest your project has strong financial prospects and aligns with best-practice investment criteria."
            }
            inputData={result.input}
          />
        )}
      </Stack>
    </Box>
  );
};
