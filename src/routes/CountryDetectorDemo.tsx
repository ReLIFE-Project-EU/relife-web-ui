import { useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Code,
  Container,
  Group,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useEuropeanCountryCode } from "../hooks/useEuropeanCountryCode";
import {
  benchmarkEuropeanCountryDetector,
  detectEuropeanCountry,
  type CountryDetectionBenchmarkResult,
  type Coordinates,
} from "../utils/geo/europeanCountryDetector";

const SAMPLE_LOCATIONS: Array<Coordinates & { label: string }> = [
  { label: "Madrid", lat: 40.4168, lng: -3.7038 },
  { label: "Vienna", lat: 48.2082, lng: 16.3738 },
  { label: "Nicosia", lat: 35.1856, lng: 33.3823 },
  { label: "Valletta", lat: 35.8989, lng: 14.5146 },
  { label: "Tallinn", lat: 59.437, lng: 24.7536 },
  { label: "Zurich", lat: 47.3769, lng: 8.5417 },
  { label: "North Sea", lat: 56.2, lng: 3.1 },
];

export const CountryDetectorDemo = () => {
  const [latValue, setLatValue] = useState("40.4168");
  const [lngValue, setLngValue] = useState("-3.7038");
  const [queryTimeMs, setQueryTimeMs] = useState<number | null>(null);
  const [benchmark, setBenchmark] =
    useState<CountryDetectionBenchmarkResult | null>(null);

  const lat = latValue.trim() === "" ? null : Number(latValue);
  const lng = lngValue.trim() === "" ? null : Number(lngValue);
  const hasInvalidInput =
    (latValue.trim() !== "" && Number.isNaN(lat)) ||
    (lngValue.trim() !== "" && Number.isNaN(lng));

  const { countryCode, countryName } = useEuropeanCountryCode(
    Number.isFinite(lat) ? lat : null,
    Number.isFinite(lng) ? lng : null,
  );

  const updateQueryTime = (nextLatValue: string, nextLngValue: string) => {
    const nextLat =
      nextLatValue.trim() === "" ? null : Number.parseFloat(nextLatValue);
    const nextLng =
      nextLngValue.trim() === "" ? null : Number.parseFloat(nextLngValue);

    if (!Number.isFinite(nextLat) || !Number.isFinite(nextLng)) {
      setQueryTimeMs(null);
      return;
    }

    const startedAt = performance.now();
    detectEuropeanCountry({
      lat: nextLat as number,
      lng: nextLng as number,
    });
    setQueryTimeMs(performance.now() - startedAt);
  };

  const handleRunBenchmark = () => {
    setBenchmark(
      benchmarkEuropeanCountryDetector(
        SAMPLE_LOCATIONS.map(({ lat: sampleLat, lng: sampleLng }) => ({
          lat: sampleLat,
          lng: sampleLng,
        })),
        2_000,
      ),
    );
  };

  return (
    <Container size="md" py="xl">
      <Stack gap="xl">
        <div>
          <Badge color="teal" size="lg" mb="md">
            Offline Demo
          </Badge>
          <Title order={1} mb="sm">
            European Country Detector
          </Title>
          <Text c="dimmed" size="lg">
            Polygon-based EU-27 country detection from coordinates with no
            external API calls.
          </Text>
        </div>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <TextInput
            label="Latitude"
            value={latValue}
            onChange={(event) => {
              const nextLatValue = event.currentTarget.value;
              setLatValue(nextLatValue);
              updateQueryTime(nextLatValue, lngValue);
            }}
            placeholder="40.4168"
            type="number"
            step="any"
            error={
              latValue.trim() !== "" && Number.isNaN(lat)
                ? "Enter a valid latitude"
                : undefined
            }
          />
          <TextInput
            label="Longitude"
            value={lngValue}
            onChange={(event) => {
              const nextLngValue = event.currentTarget.value;
              setLngValue(nextLngValue);
              updateQueryTime(latValue, nextLngValue);
            }}
            placeholder="-3.7038"
            type="number"
            step="any"
            error={
              lngValue.trim() !== "" && Number.isNaN(lng)
                ? "Enter a valid longitude"
                : undefined
            }
          />
        </SimpleGrid>

        <Card withBorder radius="md" p="lg">
          <Stack gap="sm">
            <Group justify="space-between" align="flex-start">
              <div>
                <Text fw={600}>Lookup result</Text>
                <Text size="sm" c="dimmed">
                  Returns an ISO2 code inside the supported EU-27 polygon set,
                  otherwise <Code>null</Code>.
                </Text>
              </div>
              {queryTimeMs !== null && (
                <Badge color="blue" variant="light">
                  {queryTimeMs.toFixed(3)} ms
                </Badge>
              )}
            </Group>

            {hasInvalidInput ? (
              <Alert color="red" variant="light">
                Enter valid numeric coordinates to run the detector.
              </Alert>
            ) : countryCode ? (
              <Alert color="green" variant="light">
                <Group gap="xs">
                  <Text fw={600}>{countryCode}</Text>
                  <Text c="dimmed">{countryName}</Text>
                </Group>
              </Alert>
            ) : (
              <Alert color="yellow" variant="light">
                No supported EU-27 country found for these coordinates.
              </Alert>
            )}
          </Stack>
        </Card>

        <Card withBorder radius="md" p="lg">
          <Stack gap="md">
            <div>
              <Text fw={600}>Sample locations</Text>
              <Text size="sm" c="dimmed">
                Quick checks for mainland, island, and out-of-scope points.
              </Text>
            </div>
            <Group gap="xs">
              {SAMPLE_LOCATIONS.map((sample) => (
                <Button
                  key={sample.label}
                  variant="light"
                  size="xs"
                  onClick={() => {
                    const nextLatValue = sample.lat.toString();
                    const nextLngValue = sample.lng.toString();
                    setLatValue(nextLatValue);
                    setLngValue(nextLngValue);
                    updateQueryTime(nextLatValue, nextLngValue);
                  }}
                >
                  {sample.label}
                </Button>
              ))}
            </Group>
          </Stack>
        </Card>

        <Card withBorder radius="md" p="lg">
          <Stack gap="md">
            <Group justify="space-between" align="flex-start">
              <div>
                <Text fw={600}>Benchmark</Text>
                <Text size="sm" c="dimmed">
                  Runs 2,000 iterations across {SAMPLE_LOCATIONS.length} fixed
                  sample points in the current browser.
                </Text>
              </div>
              <Button variant="outline" onClick={handleRunBenchmark}>
                Run benchmark
              </Button>
            </Group>

            {benchmark && (
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                <Text size="sm">
                  Average query time:{" "}
                  <Code>{benchmark.averageQueryTimeMs.toFixed(4)} ms</Code>
                </Text>
                <Text size="sm">
                  P95 query time:{" "}
                  <Code>{benchmark.p95QueryTimeMs.toFixed(4)} ms</Code>
                </Text>
                <Text size="sm">
                  Max query time:{" "}
                  <Code>{benchmark.maxQueryTimeMs.toFixed(4)} ms</Code>
                </Text>
                <Text size="sm">
                  Total queries: <Code>{benchmark.totalQueries}</Code>
                </Text>
              </SimpleGrid>
            )}
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
};
