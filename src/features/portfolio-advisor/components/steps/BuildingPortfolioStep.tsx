/**
 * BuildingPortfolioStep Component
 * Step 0: CSV import + manual-add (in a Drawer) + filterable, sortable
 * buildings table.
 */

import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Drawer,
  Group,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconAlertTriangle,
  IconBuilding,
  IconChevronDown,
  IconChevronUp,
  IconPencil,
  IconPlus,
  IconSearch,
  IconSelector,
  IconTrash,
} from "@tabler/icons-react";
import { useCallback, useMemo, useState } from "react";
import { compareConstructionPeriods } from "../../../../utils/apiMappings";
import { checkAreaArchetypeMismatch } from "../../../../utils/inputSanityChecks";
import {
  countryFlag,
  countryNameToCode,
  formatArchetypeName,
} from "../../../../utils/archetypeLabels";
import { usePortfolioAdvisor } from "../../hooks/usePortfolioAdvisor";
import { StepNavigation } from "../../../../components/shared/StepNavigation";
import type { PRABuilding } from "../../context/types";
import { CSVImportPanel } from "./CSVImportPanel";
import { ManualAddPanel } from "./ManualAddPanel";

type SortKey =
  | "name"
  | "category"
  | "country"
  | "floorArea"
  | "constructionPeriod";

interface SortState {
  key: SortKey;
  dir: "asc" | "desc";
}

const SORT_STARTING_DIR: Record<SortKey, "asc" | "desc"> = {
  name: "asc",
  category: "asc",
  country: "asc",
  floorArea: "desc",
  constructionPeriod: "asc",
};

function compareBuildings(
  a: PRABuilding,
  b: PRABuilding,
  sort: SortState,
): number {
  const dir = sort.dir === "asc" ? 1 : -1;
  switch (sort.key) {
    case "floorArea":
      return ((a.floorArea ?? 0) - (b.floorArea ?? 0)) * dir;
    case "constructionPeriod":
      return (
        compareConstructionPeriods(a.constructionPeriod, b.constructionPeriod) *
        dir
      );
    default: {
      const va = String(a[sort.key] ?? "");
      const vb = String(b[sort.key] ?? "");
      return va.localeCompare(vb) * dir;
    }
  }
}

export function BuildingPortfolioStep() {
  const { state, dispatch } = usePortfolioAdvisor();
  const [drawerOpen, { open: openDrawer, close: closeDrawer }] =
    useDisclosure(false);
  const [search, setSearch] = useState("");
  const [filterCountry, setFilterCountry] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [sort, setSort] = useState<SortState>({ key: "name", dir: "asc" });

  const handleCSVImport = useCallback(
    (buildings: PRABuilding[]) => {
      dispatch({ type: "APPEND_BUILDINGS", buildings });
    },
    [dispatch],
  );

  const handleManualAdd = useCallback(
    (building: PRABuilding) => {
      dispatch({ type: "ADD_BUILDING", building });
    },
    [dispatch],
  );

  const handleRemove = useCallback(
    (buildingId: string) => {
      dispatch({ type: "REMOVE_BUILDING", buildingId });
    },
    [dispatch],
  );

  const handleNext = () => {
    if (state.buildings.length > 0) {
      dispatch({ type: "SET_STEP", step: 1 });
    }
  };

  const countryOptions = useMemo(() => {
    const seen = new Map<string, string>();
    state.buildings.forEach((b) => {
      if (b.country) seen.set(b.country, b.country);
    });
    return Array.from(seen.keys())
      .sort((a, b) => a.localeCompare(b))
      .map((c) => ({ value: c, label: c }));
  }, [state.buildings]);

  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    state.buildings.forEach((b) => {
      if (b.category) set.add(b.category);
    });
    return Array.from(set)
      .sort((a, b) => a.localeCompare(b))
      .map((c) => ({ value: c, label: c }));
  }, [state.buildings]);

  const filteredSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.buildings
      .filter((b) => {
        if (filterCountry && b.country !== filterCountry) return false;
        if (filterCategory && b.category !== filterCategory) return false;
        if (q) {
          const haystack = `${b.name} ${b.category} ${b.country} ${
            b.archetypeName ?? ""
          }`.toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => compareBuildings(a, b, sort));
  }, [state.buildings, search, filterCountry, filterCategory, sort]);

  const toggleSort = (key: SortKey) => {
    setSort((current) =>
      current.key === key
        ? { key, dir: current.dir === "asc" ? "desc" : "asc" }
        : { key, dir: SORT_STARTING_DIR[key] },
    );
  };

  return (
    <Stack gap="xl">
      {/* Header */}
      <Box>
        <Title order={2} mb="xs">
          Building Portfolio
        </Title>
        <Text c="dimmed" size="sm">
          Import buildings from a CSV file or add them manually. Each building
          is matched to an archetype that determines defaults for energy use and
          renovation cost.
        </Text>
      </Box>

      {/* CSV import is always available */}
      <CSVImportPanel onImport={handleCSVImport} />

      {/* Empty state when no buildings */}
      {state.buildings.length === 0 && (
        <Card
          withBorder
          radius="md"
          p="xl"
          style={{
            borderStyle: "dashed",
            backgroundColor: "var(--mantine-color-gray-0)",
          }}
        >
          <Center>
            <Stack align="center" gap="xs">
              <IconBuilding size={36} color="var(--mantine-color-gray-5)" />
              <Text fw={600}>No buildings yet</Text>
              <Text size="sm" c="dimmed" ta="center" maw={420}>
                Use the CSV importer above to upload a portfolio file, or add
                buildings one by one.
              </Text>
              <Button
                mt="xs"
                leftSection={<IconPlus size={16} />}
                onClick={openDrawer}
              >
                Add building
              </Button>
            </Stack>
          </Center>
        </Card>
      )}

      {/* Buildings table with toolbar */}
      {state.buildings.length > 0 && (
        <Card withBorder radius="md" p={0}>
          <Group p="md" gap="sm" wrap="wrap">
            <TextInput
              placeholder="Search by name, archetype, type…"
              leftSection={<IconSearch size={14} />}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              style={{ flex: "1 1 260px", maxWidth: 360 }}
            />
            <Select
              placeholder="All countries"
              clearable
              data={countryOptions}
              value={filterCountry}
              onChange={setFilterCountry}
              w={180}
            />
            <Select
              placeholder="All types"
              clearable
              data={categoryOptions}
              value={filterCategory}
              onChange={setFilterCategory}
              w={180}
            />
            <Group ml="auto" gap="xs">
              <Badge color="relife" variant="light" size="lg">
                {state.buildings.length}{" "}
                {state.buildings.length === 1 ? "building" : "buildings"}
              </Badge>
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={openDrawer}
                size="sm"
              >
                Add building
              </Button>
            </Group>
          </Group>

          <Table.ScrollContainer minWidth={900}>
            <Table striped highlightOnHover withTableBorder={false}>
              <Table.Thead>
                <Table.Tr>
                  <SortableTh
                    label="Name"
                    sortKey="name"
                    sort={sort}
                    onSort={toggleSort}
                  />
                  <SortableTh
                    label="Type"
                    sortKey="category"
                    sort={sort}
                    onSort={toggleSort}
                  />
                  <SortableTh
                    label="Country"
                    sortKey="country"
                    sort={sort}
                    onSort={toggleSort}
                  />
                  <SortableTh
                    label="Floor area (m²)"
                    sortKey="floorArea"
                    sort={sort}
                    onSort={toggleSort}
                    numeric
                  />
                  <SortableTh
                    label="Construction period"
                    sortKey="constructionPeriod"
                    sort={sort}
                    onSort={toggleSort}
                  />
                  <Table.Th>Archetype</Table.Th>
                  <Table.Th>Source</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredSorted.map((building) => (
                  <Table.Tr key={building.id}>
                    <Table.Td>
                      <Text size="sm" fw={500}>
                        {building.name}
                      </Text>
                    </Table.Td>
                    <Table.Td>{building.category}</Table.Td>
                    <Table.Td>
                      <Group gap={4} wrap="nowrap">
                        {(() => {
                          const code = countryNameToCode(building.country);
                          return code ? (
                            <Text size="sm">{countryFlag(code)}</Text>
                          ) : null;
                        })()}
                        <Text size="sm">{building.country}</Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4} wrap="nowrap">
                        <Text
                          size="sm"
                          style={{ fontVariantNumeric: "tabular-nums" }}
                        >
                          {building.floorArea}
                        </Text>
                        {building.archetypeFloorArea &&
                          checkAreaArchetypeMismatch(
                            building.floorArea,
                            building.archetypeFloorArea,
                          ).warning && (
                            <Tooltip
                              label={
                                checkAreaArchetypeMismatch(
                                  building.floorArea,
                                  building.archetypeFloorArea,
                                ).message
                              }
                              multiline
                              w={280}
                            >
                              <IconAlertTriangle
                                size={14}
                                color="var(--mantine-color-yellow-6)"
                                style={{ cursor: "help", flexShrink: 0 }}
                              />
                            </Tooltip>
                          )}
                      </Group>
                    </Table.Td>
                    <Table.Td>{building.constructionPeriod}</Table.Td>
                    <Table.Td>
                      {building.archetypeName ? (
                        <Group gap="xs" wrap="nowrap">
                          <Tooltip label={building.archetypeName}>
                            <Text size="sm">
                              {formatArchetypeName(building.archetypeName)}
                            </Text>
                          </Tooltip>
                          {building.modifications &&
                            Object.keys(building.modifications).length > 0 && (
                              <Badge
                                size="xs"
                                color="orange"
                                variant="light"
                                leftSection={<IconPencil size={10} />}
                              >
                                Customized
                              </Badge>
                            )}
                        </Group>
                      ) : (
                        <Text size="sm" c="dimmed">
                          —
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        size="sm"
                        variant="light"
                        color={building.source === "csv" ? "blue" : "green"}
                      >
                        {building.source}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <ActionIcon
                        color="red"
                        variant="subtle"
                        onClick={() => handleRemove(building.id)}
                        aria-label={`Remove ${building.name}`}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>

          {filteredSorted.length === 0 && (
            <Center py="xl">
              <Stack align="center" gap={4}>
                <Text fw={600} size="sm">
                  No matches
                </Text>
                <Text size="xs" c="dimmed">
                  Try clearing your filters.
                </Text>
              </Stack>
            </Center>
          )}

          <Group
            justify="space-between"
            p="sm"
            style={{
              borderTop: "1px solid var(--mantine-color-gray-2)",
              backgroundColor: "var(--mantine-color-gray-0)",
            }}
          >
            <Text size="xs" c="dimmed">
              Showing <strong>{filteredSorted.length}</strong> of{" "}
              {state.buildings.length} buildings
            </Text>
          </Group>
        </Card>
      )}

      {/* Manual-add Drawer (right side) */}
      <Drawer
        opened={drawerOpen}
        onClose={closeDrawer}
        position="right"
        size="xl"
        title="Add a building"
        keepMounted={false}
      >
        <ManualAddPanel
          onAdd={handleManualAdd}
          onClose={closeDrawer}
          withCard={false}
        />
      </Drawer>

      {/* Navigation */}
      <StepNavigation
        currentStep={0}
        totalSteps={4}
        onNext={handleNext}
        nextLabel="Choose renovation measures"
        primaryDisabled={state.buildings.length === 0}
      />
    </Stack>
  );
}

function SortableTh({
  label,
  sortKey,
  sort,
  onSort,
  numeric,
}: {
  label: string;
  sortKey: SortKey;
  sort: SortState;
  onSort: (key: SortKey) => void;
  numeric?: boolean;
}) {
  const active = sort.key === sortKey;
  const Icon = !active
    ? IconSelector
    : sort.dir === "asc"
      ? IconChevronUp
      : IconChevronDown;
  return (
    <Table.Th>
      <UnstyledButton
        onClick={() => onSort(sortKey)}
        style={{ width: "100%", display: "block", font: "inherit" }}
      >
        <Group
          gap={4}
          wrap="nowrap"
          justify={numeric ? "flex-end" : "flex-start"}
        >
          <Text fz="sm" fw={700} c={active ? "relife.7" : undefined}>
            {label}
          </Text>
          <Icon
            size={14}
            color={
              active
                ? "var(--mantine-color-relife-7)"
                : "var(--mantine-color-gray-5)"
            }
          />
        </Group>
      </UnstyledButton>
    </Table.Th>
  );
}
