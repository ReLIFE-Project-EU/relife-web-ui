import {
  Alert,
  Box,
  Button,
  Card,
  Checkbox,
  Code,
  Divider,
  Group,
  LoadingOverlay,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconCalculator,
  IconHome2,
  IconInfoCircle,
} from "@tabler/icons-react";
import { useState } from "react";
import { financial } from "../../../api";
import type {
  ARVResponse,
  EnergyClass,
  PropertyType,
} from "../../../types/financial";

const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: "Apartment", label: "Apartment" },
  { value: "Villa", label: "Villa" },
  { value: "Detached House", label: "Detached House" },
  { value: "Maisonette", label: "Maisonette" },
  { value: "Studio / Bedsit", label: "Studio / Bedsit" },
  { value: "Loft", label: "Loft" },
  { value: "Building", label: "Building" },
  { value: "Apartment Complex", label: "Apartment Complex" },
  { value: "Other", label: "Other" },
];

const ENERGY_CLASSES: { value: EnergyClass; label: string }[] = [
  { value: "Α+", label: "A+ (Best)" },
  { value: "Α", label: "A" },
  { value: "Β+", label: "B+" },
  { value: "Β", label: "B" },
  { value: "Γ", label: "C (Γ)" },
  { value: "Δ", label: "D (Δ)" },
  { value: "Ε", label: "E (Ε)" },
  { value: "Ζ", label: "F (Ζ)" },
  { value: "Η", label: "G (Η - Worst)" },
];

export const ARVCalculator = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ARVResponse | null>(null);

  // Form state - Athens defaults
  const [lat, setLat] = useState<string | number>(37.981);
  const [lng, setLng] = useState<string | number>(23.728);
  const [floorArea, setFloorArea] = useState<string | number>(85);
  const [constructionYear, setConstructionYear] = useState<string | number>(
    1985,
  );
  const [floorNumber, setFloorNumber] = useState<string | number | undefined>(
    2,
  );
  const [numberOfFloors, setNumberOfFloors] = useState<string | number>(5);
  const [propertyType, setPropertyType] = useState<string | null>("Apartment");
  const [energyClass, setEnergyClass] = useState<string | null>("Β+");
  const [renovatedLast5Years, setRenovatedLast5Years] = useState(true);

  const handleCalculate = async () => {
    if (loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const latNum = Number(lat);
      const lngNum = Number(lng);
      const areaNum = Number(floorArea);
      const yearNum = Number(constructionYear);
      const floorsNum = Number(numberOfFloors);

      if (!Number.isFinite(latNum) || latNum < -90 || latNum > 90) {
        throw new Error("Latitude must be between -90 and 90.");
      }
      if (!Number.isFinite(lngNum) || lngNum < -180 || lngNum > 180) {
        throw new Error("Longitude must be between -180 and 180.");
      }
      if (!Number.isFinite(areaNum) || areaNum <= 0) {
        throw new Error("Floor area must be a positive number.");
      }
      if (
        !Number.isFinite(yearNum) ||
        yearNum < 1800 ||
        yearNum > new Date().getFullYear()
      ) {
        throw new Error("Construction year must be valid.");
      }
      if (!Number.isFinite(floorsNum) || floorsNum < 1) {
        throw new Error("Number of floors must be at least 1.");
      }
      if (!propertyType) {
        throw new Error("Please select a property type.");
      }
      if (!energyClass) {
        throw new Error("Please select an energy class.");
      }

      const response = await financial.calculateARV({
        lat: latNum,
        lng: lngNum,
        floor_area: areaNum,
        construction_year: yearNum,
        floor_number:
          floorNumber !== undefined && floorNumber !== ""
            ? Number(floorNumber)
            : null,
        number_of_floors: floorsNum,
        property_type: propertyType as PropertyType,
        energy_class: energyClass as EnergyClass,
        renovated_last_5_years: renovatedLast5Years,
      });

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
          <IconHome2 size={24} />
          <Text fw={500} size="lg">
            After Renovation Value (ARV)
          </Text>
        </Group>

        <Alert variant="light" color="blue" icon={<IconInfoCircle size={16} />}>
          Predict the property value after energy renovation using a machine
          learning model trained on Greek property market data. Enter the
          property characteristics and the expected energy class after
          renovation.
        </Alert>

        {/* Input Form */}
        <Card withBorder p="md">
          <Title order={5} mb="md">
            Property Location
          </Title>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <NumberInput
              label="Latitude"
              description="Property latitude in decimal degrees"
              value={lat}
              onChange={setLat}
              min={-90}
              max={90}
              decimalScale={6}
              required
            />
            <NumberInput
              label="Longitude"
              description="Property longitude in decimal degrees"
              value={lng}
              onChange={setLng}
              min={-180}
              max={180}
              decimalScale={6}
              required
            />
          </SimpleGrid>

          <Divider my="md" />

          <Title order={5} mb="md">
            Property Characteristics
          </Title>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <NumberInput
              label="Floor Area (m²)"
              description="Usable floor area in square meters"
              value={floorArea}
              onChange={setFloorArea}
              min={1}
              required
            />
            <NumberInput
              label="Construction Year"
              description="Year the building was built"
              value={constructionYear}
              onChange={setConstructionYear}
              min={1800}
              max={new Date().getFullYear()}
              required
            />
            <NumberInput
              label="Floor Number"
              description="Floor level (0 = ground). Leave empty for houses."
              value={floorNumber}
              onChange={setFloorNumber}
              min={0}
              placeholder="Optional for houses"
            />
            <NumberInput
              label="Number of Floors"
              description="Total floors in the building"
              value={numberOfFloors}
              onChange={setNumberOfFloors}
              min={1}
              max={100}
              required
            />
            <Select
              label="Property Type"
              description="Type of the property"
              data={PROPERTY_TYPES}
              value={propertyType}
              onChange={setPropertyType}
              required
            />
            <Select
              label="Energy Class (After Renovation)"
              description="Expected EPC label after renovation"
              data={ENERGY_CLASSES}
              value={energyClass}
              onChange={setEnergyClass}
              required
            />
          </SimpleGrid>

          <Checkbox
            mt="md"
            label="Property has been renovated within the last 5 years"
            checked={renovatedLast5Years}
            onChange={(e) => setRenovatedLast5Years(e.currentTarget.checked)}
          />
        </Card>

        <Button
          onClick={handleCalculate}
          leftSection={<IconCalculator size={16} />}
          size="md"
          disabled={loading}
        >
          Calculate Property Value
        </Button>

        {error && (
          <Alert
            color="red"
            title="Error"
            icon={<IconAlertCircle size={16} />}
          >
            {error}
          </Alert>
        )}

        {/* Results */}
        {result && (
          <Card withBorder p="lg" bg="teal.0">
            <Title order={4} mb="md">
              Predicted Property Value
            </Title>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
              <Box>
                <Text size="sm" c="dimmed">
                  Price per Square Meter
                </Text>
                <Text fw={700} size="xl">
                  {result.price_per_sqm.toLocaleString(undefined, {
                    style: "currency",
                    currency: "EUR",
                    maximumFractionDigits: 0,
                  })}
                  /m²
                </Text>
              </Box>
              <Box>
                <Text size="sm" c="dimmed">
                  Total Property Value
                </Text>
                <Text fw={700} size="xl" c="teal.7">
                  {result.total_price.toLocaleString(undefined, {
                    style: "currency",
                    currency: "EUR",
                    maximumFractionDigits: 0,
                  })}
                </Text>
              </Box>
            </SimpleGrid>

            <Divider my="md" />

            <Group justify="space-between">
              <Text size="sm">
                Floor Area: <strong>{result.floor_area} m²</strong>
              </Text>
              <Text size="sm">
                Energy Class: <strong>{result.energy_class}</strong>
              </Text>
            </Group>

            {result.metadata && (
              <>
                <Divider my="md" />
                <Text size="xs" c="dimmed" mb="xs">
                  Prediction Metadata:
                </Text>
                <Code block>{JSON.stringify(result.metadata, null, 2)}</Code>
              </>
            )}
          </Card>
        )}
      </Stack>
    </Box>
  );
};
