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
  IconInfoCircle,
  IconPlant2,
} from "@tabler/icons-react";
import { useState } from "react";
import { technical } from "../../../api";
import type { SEIRequest, SEIResponse } from "../../../types/technical";
import { DEFAULT_PROFILE, TECHNICAL_PROFILES } from "../utils";
import { ResultDisplay } from "./ResultDisplay";

export const SEICalculator = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SEIResponse | null>(null);

  // Form state
  const [profile, setProfile] = useState<string>(DEFAULT_PROFILE);

  // Embodied Carbon
  const [embodiedCarbonKpi, setEmbodiedCarbonKpi] = useState<string | number>(
    500,
  );
  const [embodiedCarbonMin, setEmbodiedCarbonMin] = useState<string | number>(
    100,
  );
  const [embodiedCarbonMax, setEmbodiedCarbonMax] = useState<string | number>(
    1000,
  );

  // GWP
  const [gwpKpi, setGwpKpi] = useState<string | number>(50);
  const [gwpMin, setGwpMin] = useState<string | number>(10);
  const [gwpMax, setGwpMax] = useState<string | number>(100);

  const handleCalculate = async () => {
    if (loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const request: SEIRequest = {
        embodied_carbon_kpi: Number(embodiedCarbonKpi),
        embodied_carbon_min: Number(embodiedCarbonMin),
        embodied_carbon_max: Number(embodiedCarbonMax),
        gwp_kpi: Number(gwpKpi),
        gwp_min: Number(gwpMin),
        gwp_max: Number(gwpMax),
        profile: profile,
      };

      const response = await technical.calculateSEI(request);
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
          <IconPlant2 size={24} />
          <Text fw={500} size="lg">
            Sustainability Environmental Index (SEI)
          </Text>
        </Group>

        <Alert variant="light" color="blue" icon={<IconInfoCircle size={16} />}>
          Calculate the Sustainability Environmental Index based on embodied
          carbon and global warming potential.
        </Alert>

        <Select
          label="Optimization Profile"
          description="Select the weighting profile for the calculation"
          data={TECHNICAL_PROFILES}
          value={profile}
          onChange={(value) => value && setProfile(value)}
          allowDeselect={false}
        />

        <Divider label="Embodied Carbon" labelPosition="left" />
        <SimpleGrid cols={{ base: 1, sm: 3 }}>
          <NumberInput
            label="Current Value (kgCO2e/m²)"
            description="Total embodied carbon per square meter"
            value={embodiedCarbonKpi}
            onChange={setEmbodiedCarbonKpi}
            min={0}
          />
          <NumberInput
            label="Min Value (kgCO2e/m²)"
            description="Lowest achievable embodied carbon"
            value={embodiedCarbonMin}
            onChange={setEmbodiedCarbonMin}
            min={0}
          />
          <NumberInput
            label="Max Value (kgCO2e/m²)"
            description="Maximum acceptable embodied carbon"
            value={embodiedCarbonMax}
            onChange={setEmbodiedCarbonMax}
            min={0}
          />
        </SimpleGrid>

        <Divider label="Global Warming Potential (GWP)" labelPosition="left" />
        <SimpleGrid cols={{ base: 1, sm: 3 }}>
          <NumberInput
            label="Current GWP (kgCO2e)"
            description="Current global warming potential"
            value={gwpKpi}
            onChange={setGwpKpi}
            min={0}
          />
          <NumberInput
            label="Min GWP (kgCO2e)"
            description="Lowest achievable GWP"
            value={gwpMin}
            onChange={setGwpMin}
            min={0}
          />
          <NumberInput
            label="Max GWP (kgCO2e)"
            description="Maximum acceptable GWP"
            value={gwpMax}
            onChange={setGwpMax}
            min={0}
          />
        </SimpleGrid>

        <Button
          onClick={handleCalculate}
          leftSection={<IconCalculator size={16} />}
          mt="md"
          disabled={loading}
        >
          Calculate SEI
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
            icon={<IconPlant2 size={16} />}
            kpiWeight={result.sei_kpi_weight}
            profileName={profile}
            metrics={[
              {
                label: "Embodied Carbon",
                value: result.embodied_carbon_normalized,
                isLowerBetter: true,
              },
              {
                label: "Global Warming Potential (GWP)",
                value: result.gwp_normalized,
                isLowerBetter: true,
              },
            ]}
            explanation={
              "Sustainability Environmental Index (SEI) evaluates the environmental impact of your project. " +
              "Embodied Carbon measures the total CO2 emissions from materials and construction (lower is better). " +
              "Global Warming Potential (GWP) quantifies the greenhouse gas emissions over the project lifecycle. " +
              "Higher scores indicate better environmental performance, meaning your actual values are closer to the minimum (best practice) thresholds."
            }
            inputData={result.input}
          />
        )}
      </Stack>
    </Box>
  );
};
