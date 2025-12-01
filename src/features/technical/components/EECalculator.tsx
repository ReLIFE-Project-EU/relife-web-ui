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
  IconBolt,
  IconCalculator,
  IconInfoCircle,
} from "@tabler/icons-react";
import { useState } from "react";
import { technical } from "../../../api";
import type { EERequest, EEResponse } from "../../../types/technical";
import { DEFAULT_PROFILE, TECHNICAL_PROFILES } from "../utils";
import { ResultDisplay } from "./ResultDisplay";

export const EECalculator = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EEResponse | null>(null);

  // Form state
  const [profile, setProfile] = useState<string>(DEFAULT_PROFILE);

  // Envelope
  const [envelopeKpi, setEnvelopeKpi] = useState<string | number>(0.5);
  const [envelopeMin, setEnvelopeMin] = useState<string | number>(0.1);
  const [envelopeMax, setEnvelopeMax] = useState<string | number>(1.0);

  // Window
  const [windowKpi, setWindowKpi] = useState<string | number>(1.2);
  const [windowMin, setWindowMin] = useState<string | number>(0.8);
  const [windowMax, setWindowMax] = useState<string | number>(2.5);

  // Heating System
  const [heatingKpi, setHeatingKpi] = useState<string | number>(0.9);
  const [heatingMin, setHeatingMin] = useState<string | number>(0.6);
  const [heatingMax, setHeatingMax] = useState<string | number>(1.2);

  // Cooling System
  const [coolingKpi, setCoolingKpi] = useState<string | number>(2.5);
  const [coolingMin, setCoolingMin] = useState<string | number>(2.0);
  const [coolingMax, setCoolingMax] = useState<string | number>(4.0);

  const handleCalculate = async () => {
    if (loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const request: EERequest = {
        envelope_kpi: Number(envelopeKpi),
        envelope_min: Number(envelopeMin),
        envelope_max: Number(envelopeMax),
        window_kpi: Number(windowKpi),
        window_min: Number(windowMin),
        window_max: Number(windowMax),
        heating_system_kpi: Number(heatingKpi),
        heating_system_min: Number(heatingMin),
        heating_system_max: Number(heatingMax),
        cooling_system_kpi: Number(coolingKpi),
        cooling_system_min: Number(coolingMin),
        cooling_system_max: Number(coolingMax),
        profile: profile,
      };

      const response = await technical.calculateEE(request);
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
          <IconBolt size={24} />
          <Text fw={500} size="lg">
            Energy Efficiency (EE)
          </Text>
        </Group>

        <Alert variant="light" color="blue" icon={<IconInfoCircle size={16} />}>
          Calculate the Energy Efficiency score based on building envelope and
          system performance indicators.
        </Alert>

        <Select
          label="Optimization Profile"
          description="Select the weighting profile for the calculation"
          data={TECHNICAL_PROFILES}
          value={profile}
          onChange={(value) => value && setProfile(value)}
          allowDeselect={false}
        />

        <Divider label="Building Envelope" labelPosition="left" />
        <SimpleGrid cols={{ base: 1, sm: 3 }}>
          <NumberInput
            label="Envelope U-Value"
            description="Current thermal transmittance (W/m²K)"
            value={envelopeKpi}
            onChange={setEnvelopeKpi}
          />
          <NumberInput
            label="Min U-Value"
            description="Best achievable performance"
            value={envelopeMin}
            onChange={setEnvelopeMin}
          />
          <NumberInput
            label="Max U-Value"
            description="Baseline or worst acceptable performance"
            value={envelopeMax}
            onChange={setEnvelopeMax}
          />
        </SimpleGrid>

        <Divider label="Windows" labelPosition="left" />
        <SimpleGrid cols={{ base: 1, sm: 3 }}>
          <NumberInput
            label="Window U-Value"
            description="Current window thermal transmittance (W/m²K)"
            value={windowKpi}
            onChange={setWindowKpi}
          />
          <NumberInput
            label="Min U-Value"
            description="Best achievable performance"
            value={windowMin}
            onChange={setWindowMin}
          />
          <NumberInput
            label="Max U-Value"
            description="Baseline or worst acceptable performance"
            value={windowMax}
            onChange={setWindowMax}
          />
        </SimpleGrid>

        <Divider label="Heating System" labelPosition="left" />
        <SimpleGrid cols={{ base: 1, sm: 3 }}>
          <NumberInput
            label="Heating Efficiency"
            description="Current system efficiency (COP or %)"
            value={heatingKpi}
            onChange={setHeatingKpi}
          />
          <NumberInput
            label="Min Efficiency"
            description="Lowest acceptable efficiency"
            value={heatingMin}
            onChange={setHeatingMin}
          />
          <NumberInput
            label="Max Efficiency"
            description="Best achievable efficiency"
            value={heatingMax}
            onChange={setHeatingMax}
          />
        </SimpleGrid>

        <Divider label="Cooling System" labelPosition="left" />
        <SimpleGrid cols={{ base: 1, sm: 3 }}>
          <NumberInput
            label="Cooling Efficiency"
            description="Current system efficiency (EER or SEER)"
            value={coolingKpi}
            onChange={setCoolingKpi}
          />
          <NumberInput
            label="Min Efficiency"
            description="Lowest acceptable efficiency"
            value={coolingMin}
            onChange={setCoolingMin}
          />
          <NumberInput
            label="Max Efficiency"
            description="Best achievable efficiency"
            value={coolingMax}
            onChange={setCoolingMax}
          />
        </SimpleGrid>

        <Button
          onClick={handleCalculate}
          leftSection={<IconCalculator size={16} />}
          mt="md"
          disabled={loading}
        >
          Calculate EE
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
            icon={<IconBolt size={16} />}
            kpiWeight={result.ee_kpi_weight}
            profileName={profile}
            metrics={[
              {
                label: "Building Envelope",
                value: result.envelope_normalized,
                isLowerBetter: true,
              },
              {
                label: "Windows",
                value: result.window_normalized,
                isLowerBetter: true,
              },
              {
                label: "Heating System",
                value: result.heating_system_normalized,
                isLowerBetter: true,
              },
              {
                label: "Cooling System",
                value: result.cooling_system_normalized,
                isLowerBetter: true,
              },
            ]}
            explanation={
              "Energy Efficiency (EE) evaluates how effectively your building systems minimize energy consumption. " +
              "Building Envelope and Windows are measured by U-values (thermal transmittance) - lower values mean better insulation. " +
              "Heating and Cooling System scores reflect efficiency ratings like COP, EER, or SEER - higher values indicate more efficient systems. " +
              "Higher normalized scores indicate your systems are performing closer to best practice benchmarks, reducing energy waste and operational costs."
            }
            inputData={result.input}
          />
        )}
      </Stack>
    </Box>
  );
};
