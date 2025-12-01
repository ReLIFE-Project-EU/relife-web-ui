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
  IconLeaf,
} from "@tabler/icons-react";
import { useState } from "react";
import { technical } from "../../../api";
import type { REIRequest, REIResponse } from "../../../types/technical";
import { DEFAULT_PROFILE, TECHNICAL_PROFILES } from "../utils";
import { ResultDisplay } from "./ResultDisplay";

export const REICalculator = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<REIResponse | null>(null);

  // Form state
  const [profile, setProfile] = useState<string>(DEFAULT_PROFILE);

  // Solar Thermal Coverage
  const [stCoverageKpi, setStCoverageKpi] = useState<string | number>(30);
  const [stCoverageMin, setStCoverageMin] = useState<string | number>(0);
  const [stCoverageMax, setStCoverageMax] = useState<string | number>(100);

  // Onsite RES
  const [onsiteResKpi, setOnsiteResKpi] = useState<string | number>(40);
  const [onsiteResMin, setOnsiteResMin] = useState<string | number>(0);
  const [onsiteResMax, setOnsiteResMax] = useState<string | number>(100);

  // Net Energy Export
  const [netExportKpi, setNetExportKpi] = useState<string | number>(10);
  const [netExportMin, setNetExportMin] = useState<string | number>(-50);
  const [netExportMax, setNetExportMax] = useState<string | number>(50);

  const handleCalculate = async () => {
    if (loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const request: REIRequest = {
        st_coverage_kpi: Number(stCoverageKpi),
        st_coverage_min: Number(stCoverageMin),
        st_coverage_max: Number(stCoverageMax),
        onsite_res_kpi: Number(onsiteResKpi),
        onsite_res_min: Number(onsiteResMin),
        onsite_res_max: Number(onsiteResMax),
        net_energy_export_kpi: Number(netExportKpi),
        net_energy_export_min: Number(netExportMin),
        net_energy_export_max: Number(netExportMax),
        profile: profile,
      };

      const response = await technical.calculateREI(request);
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
          <IconLeaf size={24} />
          <Text fw={500} size="lg">
            Renewable Energy Index (REI)
          </Text>
        </Group>

        <Alert variant="light" color="blue" icon={<IconInfoCircle size={16} />}>
          Calculate the Renewable Energy Index based on solar coverage, onsite
          renewable generation, and energy export.
        </Alert>

        <Select
          label="Optimization Profile"
          description="Select the weighting profile for the calculation"
          data={TECHNICAL_PROFILES}
          value={profile}
          onChange={(value) => value && setProfile(value)}
          allowDeselect={false}
        />

        <Divider label="Solar Thermal Coverage" labelPosition="left" />
        <SimpleGrid cols={{ base: 1, sm: 3 }}>
          <NumberInput
            label="Current Coverage (%)"
            description="Percentage of demand met by solar thermal"
            value={stCoverageKpi}
            onChange={setStCoverageKpi}
            min={0}
            max={100}
          />
          <NumberInput
            label="Min Coverage (%)"
            description="Minimum acceptable coverage"
            value={stCoverageMin}
            onChange={setStCoverageMin}
            min={0}
            max={100}
          />
          <NumberInput
            label="Max Coverage (%)"
            description="Target or maximum possible coverage"
            value={stCoverageMax}
            onChange={setStCoverageMax}
            min={0}
            max={100}
          />
        </SimpleGrid>

        <Divider label="Onsite RES Generation" labelPosition="left" />
        <SimpleGrid cols={{ base: 1, sm: 3 }}>
          <NumberInput
            label="Current Generation (%)"
            description="Percentage of energy generated onsite"
            value={onsiteResKpi}
            onChange={setOnsiteResKpi}
            min={0}
            max={100}
          />
          <NumberInput
            label="Min Generation (%)"
            description="Minimum acceptable generation"
            value={onsiteResMin}
            onChange={setOnsiteResMin}
            min={0}
            max={100}
          />
          <NumberInput
            label="Max Generation (%)"
            description="Target or maximum possible generation"
            value={onsiteResMax}
            onChange={setOnsiteResMax}
            min={0}
            max={100}
          />
        </SimpleGrid>

        <Divider label="Net Energy Export" labelPosition="left" />
        <SimpleGrid cols={{ base: 1, sm: 3 }}>
          <NumberInput
            label="Current Export (kWh/m²)"
            description="Net energy exported to grid (positive) or imported (negative)"
            value={netExportKpi}
            onChange={setNetExportKpi}
          />
          <NumberInput
            label="Min Export (kWh/m²)"
            description="Lowest acceptable export level"
            value={netExportMin}
            onChange={setNetExportMin}
          />
          <NumberInput
            label="Max Export (kWh/m²)"
            description="Target export level"
            value={netExportMax}
            onChange={setNetExportMax}
          />
        </SimpleGrid>

        <Button
          onClick={handleCalculate}
          leftSection={<IconCalculator size={16} />}
          mt="md"
          disabled={loading}
        >
          Calculate REI
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
            icon={<IconLeaf size={16} />}
            kpiWeight={result.rei_kpi_weight}
            profileName={profile}
            metrics={[
              {
                label: "Solar Thermal Coverage",
                value: result.st_coverage_normalized,
              },
              {
                label: "Onsite RES Generation",
                value: result.onsite_res_normalized,
              },
              {
                label: "Net Energy Export",
                value: result.net_energy_normalized,
              },
            ]}
            explanation={
              "Renewable Energy Index (REI) measures your project's renewable energy performance. " +
              "Solar Thermal Coverage shows how much of your thermal energy needs are met by solar systems. " +
              "Onsite RES Generation tracks the percentage of energy produced from renewable sources on-site. " +
              "Net Energy Export indicates whether your building is a net energy producer (positive) or consumer (negative). " +
              "Higher scores indicate better renewable energy integration and reduced dependence on grid electricity."
            }
            inputData={result.input}
          />
        )}
      </Stack>
    </Box>
  );
};
