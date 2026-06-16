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
import { IconAlertTriangle, IconCheck, IconSearch } from "@tabler/icons-react";
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
  const listItems = useMemo(
    () =>
      selectedKey
        ? visibleItems.filter((item) => getArchetypeKey(item) !== selectedKey)
        : visibleItems,
    [visibleItems, selectedKey],
  );
  const dedupedCount = visibleItems.length - listItems.length;
  const listTotalCount = totalCount - dedupedCount;
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
        {selectedDetails && (
          <>
            <Text size="xs" fw={600} c="dimmed">
              {copy.selectedReferenceLabel}
            </Text>
            <ArchetypeRow
              copy={copy}
              archetype={selectedDetails}
              details={selectedDetails}
              selected
              onSelect={() => onSelect(selectedDetails)}
            />
          </>
        )}

        {listItems.map((archetype) => {
          const key = getArchetypeKey(archetype);
          return (
            <ArchetypeRow
              key={key}
              copy={copy}
              archetype={archetype}
              details={detailsByKey[key]}
              detailError={detailErrorsByKey[key]}
              selected={false}
              loading={selectingKey === key}
              onSelect={() => onSelect(archetype)}
            />
          );
        })}

        {listTotalCount === 0 && (
          <Paper withBorder p="lg" radius="sm">
            <Text size="sm" fw={600}>
              No reference buildings match these filters.
            </Text>
            <Text size="xs" c="dimmed">
              Clear a filter or try a broader search.
            </Text>
          </Paper>
        )}

        {listTotalCount > listItems.length && (
          <Text size="xs" c="dimmed">
            Showing first {listItems.length} of {listTotalCount} matches. Narrow
            the filters to see more specific results.
          </Text>
        )}
      </Stack>
    </Stack>
  );
}
