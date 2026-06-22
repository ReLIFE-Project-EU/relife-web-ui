import {
  Alert,
  Box,
  Button,
  Group,
  Loader,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconBuilding,
  IconCheck,
  IconSearch,
} from "@tabler/icons-react";
import { createElement, useMemo } from "react";
import type { ArchetypeDetails } from "../../types/archetype";
import type { ArchetypeInfo } from "../../types/forecasting";
import {
  countryFlag,
  countryNameToCode,
  formatArchetypeName,
} from "../../utils/archetypeLabels";
import {
  formatNumber,
  getBuildingIcon,
  type SelectorCopy,
} from "./selectorConfig";
import {
  getArchetypeKey,
  getArchetypePeriod,
  getDisplayCountry,
} from "./buildingSelectorUtils";

interface BrowseModeProps {
  copy: SelectorCopy;
  archetypes: ArchetypeInfo[];
  detailsByKey: Record<string, ArchetypeDetails>;
  detailErrorsByKey: Record<string, string>;
  visibleItems: ArchetypeInfo[];
  totalCount: number;
  selectedKey: string | null;
  selectingKey: string | null;
  isLoading: boolean;
  browseError: string | null;
  search: string;
  country: string | null;
  category: string | null;
  period: string | null;
  onSearchChange: (value: string) => void;
  onCountryChange: (value: string | null) => void;
  onCategoryChange: (value: string | null) => void;
  onPeriodChange: (value: string | null) => void;
  onSelect: (archetype: ArchetypeInfo) => void;
}

function getPeriodOptions(archetypes: ArchetypeInfo[]) {
  return Array.from(new Set(archetypes.map(getArchetypePeriod).filter(Boolean)))
    .sort()
    .map((period) => ({ value: period, label: period }));
}

function getCountryOptions(archetypes: ArchetypeInfo[]) {
  return Array.from(
    new Set(
      archetypes.map((archetype) => getDisplayCountry(archetype.country)),
    ),
  )
    .filter(Boolean)
    .sort()
    .map((country) => ({ value: country, label: country }));
}

function getCategoryOptions(archetypes: ArchetypeInfo[]) {
  return Array.from(new Set(archetypes.map((item) => item.category)))
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right))
    .map((value) => ({ value, label: value }));
}

function BuildingIcon({ category, size }: { category: string; size: number }) {
  return createElement(getBuildingIcon(category), { size });
}

interface ArchetypeRowProps {
  copy: SelectorCopy;
  archetype: ArchetypeInfo;
  details?: ArchetypeDetails;
  detailError?: string;
  selected: boolean;
  loading?: boolean;
  onSelect: () => void;
}

function ArchetypeRow({
  copy,
  archetype,
  details,
  detailError,
  selected,
  loading = false,
  onSelect,
}: ArchetypeRowProps) {
  const code = countryNameToCode(getDisplayCountry(archetype.country));

  return (
    <Paper
      withBorder
      radius="sm"
      p="sm"
      bg={selected ? `${copy.accentColor}.0` : undefined}
    >
      <Group wrap="nowrap" gap="md">
        <ThemeIcon
          variant="light"
          color={selected ? copy.accentColor : "gray"}
          size={38}
          radius="sm"
        >
          <BuildingIcon category={archetype.category} size={20} />
        </ThemeIcon>
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Text fw={600} size="sm">
            {formatArchetypeName(archetype.name)}
          </Text>
          <Group gap={6} wrap="wrap">
            {code ? <Text size="xs">{countryFlag(code)}</Text> : null}
            <Text size="xs" c="dimmed">
              {getDisplayCountry(archetype.country)}
            </Text>
            <Text size="xs" c="dimmed">
              {archetype.category}
            </Text>
            <Text size="xs" c="dimmed">
              {getArchetypePeriod(archetype)}
            </Text>
            <Text size="xs" c={detailError ? "red" : "dimmed"}>
              {details
                ? `${formatNumber(details.floorArea)} m2, ${details.numberOfFloors} floors`
                : detailError
                  ? "Details unavailable"
                  : "Details loading"}
            </Text>
          </Group>
          {detailError && (
            <Text size="xs" c="red" mt={4}>
              {detailError}
            </Text>
          )}
        </Box>
        <Button
          variant={selected ? "filled" : "default"}
          color={copy.accentColor}
          size="xs"
          leftSection={selected ? <IconCheck size={14} /> : null}
          loading={loading}
          onClick={onSelect}
        >
          {selected ? copy.selectedLabel : copy.chooseLabel}
        </Button>
      </Group>
    </Paper>
  );
}

interface SelectionSummaryBarProps {
  copy: SelectorCopy;
  details?: ArchetypeDetails;
  onClear: () => void;
}

function SelectionSummaryBar({
  copy,
  details,
  onClear,
}: SelectionSummaryBarProps) {
  if (!details) {
    return (
      <Paper
        radius="md"
        p="sm"
        style={{
          border: "1px dashed var(--mantine-color-gray-4)",
          backgroundColor: "var(--mantine-color-gray-0)",
        }}
      >
        <Group wrap="nowrap" gap="md">
          <ThemeIcon
            variant="default"
            color="gray"
            size={40}
            radius="xl"
            style={{ borderStyle: "dashed" }}
          >
            <IconBuilding size={20} />
          </ThemeIcon>
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Text fw={500} size="sm" c="dimmed">
              {copy.selectionEmptyLabel}
            </Text>
            <Text size="xs" c="dimmed">
              {copy.selectionEmptyHint}
            </Text>
          </Box>
        </Group>
      </Paper>
    );
  }

  const code = countryNameToCode(getDisplayCountry(details.country));

  return (
    <Paper
      radius="md"
      p="sm"
      bg={`${copy.accentColor}.0`}
      style={{
        border: `1px solid var(--mantine-color-${copy.accentColor}-4)`,
      }}
    >
      <Group wrap="nowrap" gap="md">
        <ThemeIcon
          variant="filled"
          color={copy.accentColor}
          size={40}
          radius="xl"
        >
          <IconCheck size={22} />
        </ThemeIcon>
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Text fw={600} size="sm">
            {formatArchetypeName(details.name)}
          </Text>
          <Group gap={6} wrap="wrap">
            {code ? <Text size="xs">{countryFlag(code)}</Text> : null}
            <Text size="xs" c="dimmed">
              {getDisplayCountry(details.country)}
            </Text>
            <Text size="xs" c="dimmed">
              {details.category}
            </Text>
            <Text size="xs" c="dimmed">
              {getArchetypePeriod(details)}
            </Text>
          </Group>
        </Box>
        <Button
          variant="subtle"
          color={copy.accentColor}
          size="xs"
          onClick={onClear}
        >
          {copy.clearSelectionLabel}
        </Button>
      </Group>
    </Paper>
  );
}

export function BrowseMode({
  copy,
  archetypes,
  detailsByKey,
  detailErrorsByKey,
  visibleItems,
  totalCount,
  selectedKey,
  selectingKey,
  isLoading,
  browseError,
  search,
  country,
  category,
  period,
  onSearchChange,
  onCountryChange,
  onCategoryChange,
  onPeriodChange,
  onSelect,
}: BrowseModeProps) {
  const categoryOptions = useMemo(
    () => getCategoryOptions(archetypes),
    [archetypes],
  );
  const countryOptions = useMemo(
    () => getCountryOptions(archetypes),
    [archetypes],
  );
  const periodOptions = useMemo(
    () => getPeriodOptions(archetypes),
    [archetypes],
  );
  const selectedDetails = selectedKey ? detailsByKey[selectedKey] : undefined;

  if (isLoading) {
    return (
      <Group justify="center" py="xl">
        <Loader size="sm" />
        <Text size="sm" c="dimmed">
          Loading reference buildings...
        </Text>
      </Group>
    );
  }

  return (
    <Stack gap="md">
      {browseError && (
        <Alert
          color="red"
          variant="light"
          icon={<IconAlertTriangle size={16} />}
        >
          {browseError}
        </Alert>
      )}

      <Stack gap="sm">
        <TextInput
          placeholder={copy.searchPlaceholder}
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(event) => onSearchChange(event.currentTarget.value)}
        />
        <SimpleGrid cols={{ base: 1, sm: 3, lg: 3 }} spacing="sm">
          <Select
            placeholder="Country"
            clearable
            data={countryOptions}
            value={country}
            onChange={onCountryChange}
          />
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
          />
        </SimpleGrid>
      </Stack>

      <Stack gap="xs">
        <Text size="xs" fw={600} c="dimmed">
          {copy.selectedReferenceLabel}
        </Text>
        <SelectionSummaryBar
          copy={copy}
          details={selectedDetails}
          onClear={() => selectedDetails && onSelect(selectedDetails)}
        />

        {visibleItems.map((archetype) => {
          const key = getArchetypeKey(archetype);
          return (
            <ArchetypeRow
              key={key}
              copy={copy}
              archetype={archetype}
              details={detailsByKey[key]}
              detailError={detailErrorsByKey[key]}
              selected={key === selectedKey}
              loading={selectingKey === key}
              onSelect={() => onSelect(archetype)}
            />
          );
        })}

        {totalCount === 0 && (
          <Paper withBorder p="lg" radius="sm">
            <Text size="sm" fw={600}>
              No reference buildings match these filters.
            </Text>
            <Text size="xs" c="dimmed">
              Clear a filter or try a broader search.
            </Text>
          </Paper>
        )}

        {totalCount > visibleItems.length && (
          <Text size="xs" c="dimmed">
            Showing first {visibleItems.length} of {totalCount} matches. Narrow
            the filters to see more specific results.
          </Text>
        )}
      </Stack>
    </Stack>
  );
}
