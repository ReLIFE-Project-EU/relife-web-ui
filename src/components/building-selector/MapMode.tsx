import {
  Alert,
  Badge,
  Group,
  Loader,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useMemo } from "react";
import type { ArchetypeDetails } from "../../types/archetype";
import type { ArchetypeInfo } from "../../types/forecasting";
import type { ArchetypeMatchResult } from "../../services/types";
import { formatArchetypeName } from "../../utils/archetypeLabels";
import { BuildingSelectorMap } from "./BuildingSelectorMap";
import { formatCoords, formatNumber } from "./selectorConfig";
import { getDisplayCountry, getMatchStatus } from "./buildingSelectorUtils";
import classes from "./MapMode.module.css";

interface MapModeProps {
  compact: boolean;
  archetypes: ArchetypeInfo[];
  isCatalogLoading: boolean;
  lat: number | null;
  lng: number | null;
  detectedCountry: string | null;
  category: string | null;
  period: string | null;
  categories: string[];
  periods: string[];
  selectedDetails: ArchetypeDetails | null;
  selectedKey: string | null;
  matchResult: ArchetypeMatchResult | null;
  isMatching: boolean;
  matchError: string | null;
  fallbackText: string | null;
  accentColor: string;
  onCategoryChange: (value: string | null) => void;
  onPeriodChange: (value: string | null) => void;
  onLocationChange: (lat: number, lng: number) => void;
}

function getCategoryOptions(categories: string[]) {
  return categories
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right))
    .map((value) => ({ value, label: value }));
}

export function MapMode({
  compact,
  archetypes,
  isCatalogLoading,
  lat,
  lng,
  detectedCountry,
  category,
  period,
  categories,
  periods,
  selectedDetails,
  selectedKey,
  matchResult,
  isMatching,
  matchError,
  fallbackText,
  accentColor,
  onCategoryChange,
  onPeriodChange,
  onLocationChange,
}: MapModeProps) {
  const categoryOptions = useMemo(
    () => getCategoryOptions(categories),
    [categories],
  );
  const periodOptions = useMemo(
    () => periods.map((item) => ({ value: item, label: item })),
    [periods],
  );
  const mapArchetypes = useMemo(
    () =>
      archetypes.filter(
        (archetype) => !category || archetype.category === category,
      ),
    [archetypes, category],
  );

  return (
    <Stack gap="md">
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 2 }} spacing="sm">
        <Select
          placeholder="Type"
          clearable
          data={categoryOptions}
          value={category}
          onChange={onCategoryChange}
        />
        <Select
          placeholder="Period"
          clearable
          data={periodOptions}
          value={period}
          onChange={onPeriodChange}
          disabled={!category}
        />
      </SimpleGrid>

      <BuildingSelectorMap
        lat={lat}
        lng={lng}
        archetypes={mapArchetypes}
        highlightedArchetype={selectedDetails ?? undefined}
        selectedKey={selectedKey}
        accentColor={accentColor}
        compact={compact}
        loading={isCatalogLoading}
        onLocationChange={onLocationChange}
      />

      <Group gap="sm" align="flex-start">
        <Paper withBorder p="sm" radius="sm" style={{ flex: "1 1 240px" }}>
          <Text size="xs" c="dimmed" mb={4}>
            Selected location
          </Text>
          {lat !== null && lng !== null ? (
            <Stack gap={4}>
              <Text size="sm" fw={600}>
                {formatCoords(lat, lng)}
              </Text>
              <Text size="xs" c="dimmed">
                Detected country:{" "}
                <Text span fw={600}>
                  {getDisplayCountry(detectedCountry) || "Unknown"}
                </Text>
              </Text>
            </Stack>
          ) : (
            <Text size="sm" c="dimmed">
              Click the map.
            </Text>
          )}
        </Paper>
        <Paper
          key={selectedKey ?? "empty"}
          withBorder
          p="sm"
          radius="sm"
          className={selectedDetails ? classes.flashRing : undefined}
          style={{
            flex: "1 1 240px",
            ["--flash-color" as string]: `var(--mantine-color-${accentColor}-3)`,
          }}
        >
          <Group justify="space-between" align="center" mb={4}>
            <Text size="xs" c="dimmed">
              Matched reference
            </Text>
            {matchResult && (
              <Badge
                color={
                  getMatchStatus(matchResult) === "exact" ? "green" : "yellow"
                }
                variant="light"
              >
                {getMatchStatus(matchResult)}
              </Badge>
            )}
          </Group>
          {isMatching ? (
            <Group gap="xs">
              <Loader size="xs" />
              <Text size="sm" c="dimmed">
                Matching reference...
              </Text>
            </Group>
          ) : selectedDetails ? (
            <Stack gap={4}>
              <Text size="sm" fw={600}>
                {formatArchetypeName(selectedDetails.name)}
              </Text>
              <Text size="xs" c="dimmed">
                {formatNumber(selectedDetails.floorArea)} m2,{" "}
                {selectedDetails.numberOfFloors} floors
              </Text>
            </Stack>
          ) : (
            <Text size="sm" c="dimmed">
              Select a location, type, and period.
            </Text>
          )}
        </Paper>
      </Group>

      {fallbackText && (
        <Alert
          color="yellow"
          variant="light"
          icon={<IconAlertTriangle size={16} />}
        >
          <Text size="sm">{fallbackText}</Text>
        </Alert>
      )}
      {matchError && (
        <Alert
          color="red"
          variant="light"
          icon={<IconAlertTriangle size={16} />}
        >
          {matchError}
        </Alert>
      )}
    </Stack>
  );
}
