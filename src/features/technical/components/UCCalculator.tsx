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
  IconUsers,
} from "@tabler/icons-react";
import { useState } from "react";
import { technical } from "../../../api";
import type { UCRequest, UCResponse } from "../../../types/technical";
import { DEFAULT_PROFILE, TECHNICAL_PROFILES } from "../utils";
import { ResultDisplay } from "./ResultDisplay";

export const UCCalculator = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UCResponse | null>(null);

  // Form state
  const [profile, setProfile] = useState<string>(DEFAULT_PROFILE);

  // Air Temperature
  const [tempKpi, setTempKpi] = useState<string | number>(21);
  const [tempMin, setTempMin] = useState<string | number>(18);
  const [tempMax, setTempMax] = useState<string | number>(26);

  // Humidity
  const [humidityKpi, setHumidityKpi] = useState<string | number>(50);
  const [humidityMin, setHumidityMin] = useState<string | number>(30);
  const [humidityMax, setHumidityMax] = useState<string | number>(70);

  const handleCalculate = async () => {
    if (loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const request: UCRequest = {
        thermal_comfort_air_temp_kpi: Number(tempKpi),
        thermal_comfort_air_temp_min: Number(tempMin),
        thermal_comfort_air_temp_max: Number(tempMax),
        thermal_comfort_humidity_kpi: Number(humidityKpi),
        thermal_comfort_humidity_min: Number(humidityMin),
        thermal_comfort_humidity_max: Number(humidityMax),
        profile: profile,
      };

      const response = await technical.calculateUC(request);
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
          <IconUsers size={24} />
          <Text fw={500} size="lg">
            User Comfort (UC)
          </Text>
        </Group>

        <Alert variant="light" color="blue" icon={<IconInfoCircle size={16} />}>
          Calculate the User Comfort score based on thermal comfort parameters
          (temperature and humidity).
        </Alert>

        <Select
          label="Optimization Profile"
          description="Select the weighting profile for the calculation"
          data={TECHNICAL_PROFILES}
          value={profile}
          onChange={(value) => value && setProfile(value)}
          allowDeselect={false}
        />

        <Divider
          label="Thermal Comfort (Air Temperature)"
          labelPosition="left"
        />
        <SimpleGrid cols={{ base: 1, sm: 3 }}>
          <NumberInput
            label="Current Temperature (°C)"
            description="Indoor air temperature"
            value={tempKpi}
            onChange={setTempKpi}
          />
          <NumberInput
            label="Min Temperature (°C)"
            description="Minimum comfortable temperature"
            value={tempMin}
            onChange={setTempMin}
          />
          <NumberInput
            label="Max Temperature (°C)"
            description="Maximum comfortable temperature"
            value={tempMax}
            onChange={setTempMax}
          />
        </SimpleGrid>

        <Divider label="Thermal Comfort (Humidity)" labelPosition="left" />
        <SimpleGrid cols={{ base: 1, sm: 3 }}>
          <NumberInput
            label="Current Humidity (%)"
            description="Indoor relative humidity"
            value={humidityKpi}
            onChange={setHumidityKpi}
            min={0}
            max={100}
          />
          <NumberInput
            label="Min Humidity (%)"
            description="Minimum comfortable humidity"
            value={humidityMin}
            onChange={setHumidityMin}
            min={0}
            max={100}
          />
          <NumberInput
            label="Max Humidity (%)"
            description="Maximum comfortable humidity"
            value={humidityMax}
            onChange={setHumidityMax}
            min={0}
            max={100}
          />
        </SimpleGrid>

        <Button
          onClick={handleCalculate}
          leftSection={<IconCalculator size={16} />}
          mt="md"
          disabled={loading}
        >
          Calculate UC
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
            icon={<IconUsers size={16} />}
            kpiWeight={result.uc_kpi_weight}
            profileName={profile}
            metrics={[
              {
                label: "Temperature Comfort",
                value: result.thermal_comfort_air_temp_normalized,
              },
              {
                label: "Humidity Comfort",
                value: result.thermal_comfort_humidity_normalized,
              },
            ]}
            explanation={
              "User Comfort (UC) measures how well the indoor environment meets occupant comfort requirements. " +
              "The normalized scores show how close your current conditions are to the optimal comfort range. " +
              "Higher scores indicate better thermal comfort conditions. " +
              "Temperature and humidity levels within the defined comfort range will score closer to 100%."
            }
            inputData={result.input}
          />
        )}
      </Stack>
    </Box>
  );
};
