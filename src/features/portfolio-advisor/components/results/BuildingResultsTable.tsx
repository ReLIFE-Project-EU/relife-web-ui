/**
 * BuildingResultsTable
 * Sortable, filterable per-building results table with row-click drill-down.
 *
 * Extracted from the original `ResultsStep` table; column data and tooltips
 * are preserved exactly. Adds local sort/filter state and a row-click hook.
 */

import {
  Badge,
  Card,
  Group,
  Select,
  Stack,
  Table,
  Text,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import {
  IconChevronDown,
  IconChevronUp,
  IconInfoCircle,
  IconSelector,
} from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { DeltaBadge } from "../../../../components/shared/DeltaValue";
import { EPCBadge } from "../../../../components/shared/EPCBadge";
import {
  calculatePercentChange,
  formatCurrency,
  formatDecimal,
  formatEnergyPerYear,
} from "../../../../utils/formatters";
import { formatArchetypeName } from "../../../../utils/archetypeLabels";
import type { PRABuilding, BuildingAnalysisResult } from "../../context/types";

export type StatusFilter =
  | "all"
  | "pending"
  | "running"
  | "success"
  | "error"
  | "no-savings";

type SortKey = "name" | "status" | "energyReduction" | "npv" | "roi" | "pbp";

interface SortState {
  key: SortKey;
  dir: "asc" | "desc";
}

interface RowVm {
  building: PRABuilding;
  result: BuildingAnalysisResult;
  isSuccess: boolean;
  noSavings: boolean;
  energyReduction: number | undefined;
  npv: number | undefined;
  roi: number | undefined;
  pbp: number | undefined;
}

interface BuildingResultsTableProps {
  buildings: PRABuilding[];
  results: Record<string, BuildingAnalysisResult>;
  onRowClick?: (vm: RowVm) => void;
  /** Default sort (defaults to NPV desc) */
  defaultSort?: SortState;
}

function buildRowVms(
  buildings: PRABuilding[],
  results: Record<string, BuildingAnalysisResult>,
): RowVm[] {
  return buildings
    .map((building) => {
      const result = results[building.id];
      if (!result) return null;
      const isSuccess = result.status === "success";
      const renovated = result.scenarios?.find((s) => s.id === "renovated");
      const fr = result.financialResults;
      const noSavings = isSuccess && fr?.riskAssessment === null && !!renovated;
      const energyBefore = result.estimation?.annualEnergyNeeds;
      const energyAfter = renovated?.annualEnergyNeeds;
      const energyReduction =
        energyBefore !== undefined &&
        energyAfter !== undefined &&
        energyBefore > 0
          ? calculatePercentChange(energyBefore, energyAfter)
          : undefined;
      return {
        building,
        result,
        isSuccess,
        noSavings,
        energyReduction,
        npv: isSuccess && fr ? fr.netPresentValue : undefined,
        roi: isSuccess && fr ? fr.returnOnInvestment : undefined,
        pbp: isSuccess && fr ? fr.paybackTime : undefined,
      } satisfies RowVm;
    })
    .filter((v): v is RowVm => v !== null);
}

function applyStatusFilter(rows: RowVm[], filter: StatusFilter): RowVm[] {
  if (filter === "all") return rows;
  if (filter === "no-savings") {
    return rows.filter((r) => r.isSuccess && (r.npv ?? 0) <= 0);
  }
  return rows.filter((r) => r.result.status === filter);
}

function applySort(rows: RowVm[], sort: SortState): RowVm[] {
  const dir = sort.dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const get = (r: RowVm): number | string => {
      switch (sort.key) {
        case "name":
          return r.building.name.toLowerCase();
        case "status":
          return r.result.status;
        case "energyReduction":
          return r.energyReduction ?? Infinity;
        case "npv":
          return r.npv ?? -Infinity;
        case "roi":
          return r.roi ?? -Infinity;
        case "pbp":
          return r.pbp ?? Infinity;
      }
    };
    const va = get(a);
    const vb = get(b);
    if (typeof va === "number" && typeof vb === "number") {
      return (va - vb) * dir;
    }
    return String(va).localeCompare(String(vb)) * dir;
  });
}

export function BuildingResultsTable({
  buildings,
  results,
  onRowClick,
  defaultSort = { key: "npv", dir: "desc" },
}: BuildingResultsTableProps) {
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortState>(defaultSort);

  const allRows = useMemo(
    () => buildRowVms(buildings, results),
    [buildings, results],
  );

  const filteredRows = useMemo(
    () => applyStatusFilter(allRows, filter),
    [allRows, filter],
  );

  const visibleRows = useMemo(
    () => applySort(filteredRows, sort),
    [filteredRows, sort],
  );

  const showDeliveredEnergyColumn = visibleRows.some(({ result }) => {
    const renovated = result.scenarios?.find((s) => s.id === "renovated");
    return (
      result.estimation?.deliveredTotal !== undefined ||
      renovated?.deliveredTotal !== undefined
    );
  });

  const toggleSort = (key: SortKey) => {
    setSort((current) =>
      current.key === key
        ? { key, dir: current.dir === "asc" ? "desc" : "asc" }
        : {
            key,
            dir: key === "name" || key === "status" ? "asc" : "desc",
          },
    );
  };

  return (
    <Card withBorder radius="md" p={0}>
      <Group p="md" gap="sm" wrap="wrap">
        <Select
          aria-label="Filter by status"
          data={[
            { value: "all", label: "All buildings" },
            { value: "success", label: "Successful" },
            { value: "no-savings", label: "No savings" },
            { value: "error", label: "Errored" },
            { value: "pending", label: "Pending" },
            { value: "running", label: "Running" },
          ]}
          value={filter}
          onChange={(v) => setFilter((v as StatusFilter | null) ?? "all")}
          allowDeselect={false}
          w={180}
        />
        {onRowClick && (
          <Text size="xs" c="dimmed">
            Click a row to see the full breakdown.
          </Text>
        )}
        <Group ml="auto" gap="xs">
          <Badge variant="light" color="gray" size="lg">
            {visibleRows.length} of {allRows.length}
          </Badge>
        </Group>
      </Group>

      <Table.ScrollContainer minWidth={1100}>
        <Table striped highlightOnHover withTableBorder={false}>
          <Table.Thead>
            <Table.Tr>
              <SortableTh
                label="Building"
                sortKey="name"
                sort={sort}
                onSort={toggleSort}
              />
              <Table.Th>
                <Text fz="sm" fw={700}>
                  Matched archetype
                </Text>
              </Table.Th>
              <SortableTh
                label="Status"
                sortKey="status"
                sort={sort}
                onSort={toggleSort}
              />
              <Table.Th>
                <Group gap={4} wrap="nowrap">
                  <Text fz="sm" fw={700}>
                    Estimated EPC
                  </Text>
                  <Text span size="xs" c="dimmed">
                    before
                  </Text>
                </Group>
              </Table.Th>
              <Table.Th>
                <Group gap={4} wrap="nowrap">
                  <Text fz="sm" fw={700}>
                    Estimated EPC
                  </Text>
                  <Text span size="xs" c="dimmed">
                    after
                  </Text>
                </Group>
              </Table.Th>
              <SortableTh
                label="Energy reduction"
                sortKey="energyReduction"
                sort={sort}
                onSort={toggleSort}
              />
              {showDeliveredEnergyColumn && (
                <Table.Th>
                  <Group gap={4} wrap="nowrap">
                    <Text fz="sm" fw={700}>
                      System energy consumption
                    </Text>
                    <Text span size="xs" c="dimmed">
                      (kWh delivered/year)
                    </Text>
                  </Group>
                </Table.Th>
              )}
              <SortableTh
                label="NPV"
                sortKey="npv"
                sort={sort}
                onSort={toggleSort}
                numeric
              />
              <SortableTh
                label="ROI"
                sortKey="roi"
                sort={sort}
                onSort={toggleSort}
                numeric
              />
              <SortableTh
                label="Payback"
                sortKey="pbp"
                sort={sort}
                onSort={toggleSort}
                numeric
              />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {visibleRows.map((row) => (
              <ResultsRow
                key={row.building.id}
                row={row}
                showDeliveredEnergyColumn={showDeliveredEnergyColumn}
                onClick={onRowClick}
              />
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>

      {visibleRows.length === 0 && (
        <Stack align="center" py="xl" gap={4}>
          <Text size="sm" fw={600}>
            No matching buildings
          </Text>
          <Text size="xs" c="dimmed">
            Adjust the status filter to see more rows.
          </Text>
        </Stack>
      )}
    </Card>
  );
}

function ResultsRow({
  row,
  showDeliveredEnergyColumn,
  onClick,
}: {
  row: RowVm;
  showDeliveredEnergyColumn: boolean;
  onClick?: (vm: RowVm) => void;
}) {
  const { building, result, isSuccess, noSavings, energyReduction } = row;
  const fr = result.financialResults;
  const renovated = result.scenarios?.find((s) => s.id === "renovated");
  const epcBefore = result.estimation?.estimatedEPC;
  const epcAfter = renovated?.epcClass;
  const energyBefore = result.estimation?.annualEnergyNeeds;
  const energyAfter = renovated?.annualEnergyNeeds;
  const intensityBefore =
    energyBefore !== undefined && building.floorArea > 0
      ? energyBefore / building.floorArea
      : undefined;
  const intensityAfter =
    energyAfter !== undefined && building.floorArea > 0
      ? energyAfter / building.floorArea
      : undefined;
  const deliveredBefore = result.estimation?.deliveredTotal;
  const deliveredAfter = renovated?.deliveredTotal;
  const deliveredEnergyReduction =
    deliveredBefore !== undefined &&
    deliveredAfter !== undefined &&
    deliveredBefore > 0
      ? calculatePercentChange(deliveredBefore, deliveredAfter)
      : undefined;
  const archetype = result.estimation?.archetype;
  const wasAutoMatched = !building.archetypeName && !!archetype;

  return (
    <Table.Tr
      onClick={onClick ? () => onClick(row) : undefined}
      style={onClick ? { cursor: "pointer" } : undefined}
    >
      <Table.Td>
        <Stack gap={4}>
          <Text size="sm" fw={500}>
            {building.name}
          </Text>
          {noSavings && (
            <Tooltip
              label="This building's current specifications already meet the targets for the selected renovation measures. No energy savings could be computed, so financial indicators are not meaningful."
              multiline
              w={300}
              position="bottom-start"
            >
              <Badge
                color="yellow"
                variant="light"
                size="sm"
                leftSection={<IconInfoCircle size={11} />}
                style={{ cursor: "default" }}
              >
                Already at renovation target
              </Badge>
            </Tooltip>
          )}
        </Stack>
      </Table.Td>
      <Table.Td>
        {archetype ? (
          <Tooltip
            label={`${archetype.category} · ${archetype.country} · ${archetype.name}`}
            multiline
            w={260}
          >
            <Stack gap={4} style={{ cursor: "default" }}>
              <Text size="sm">{formatArchetypeName(archetype.name)}</Text>
              {wasAutoMatched && (
                <Badge color="gray" variant="light" size="xs">
                  Auto
                </Badge>
              )}
            </Stack>
          </Tooltip>
        ) : (
          <Text size="sm" c="dimmed">
            —
          </Text>
        )}
      </Table.Td>
      <Table.Td>
        <Badge
          color={
            result.status === "success"
              ? "green"
              : result.status === "error"
                ? "red"
                : "yellow"
          }
          size="sm"
          variant="light"
        >
          {result.status === "success"
            ? "Analyzed"
            : result.status === "error"
              ? "Failed"
              : result.status === "running"
                ? "Running"
                : "Pending"}
        </Badge>
      </Table.Td>
      <Table.Td>
        {epcBefore ? (
          <Group gap="xs" wrap="nowrap">
            <EPCBadge
              epcClass={epcBefore}
              size="sm"
              energyIntensity={intensityBefore}
              estimated
            />
            {intensityBefore !== undefined && (
              <Text size="xs" c="dimmed">
                {Math.round(intensityBefore)} kWh/m²/y
              </Text>
            )}
          </Group>
        ) : (
          "-"
        )}
      </Table.Td>
      <Table.Td>
        {epcAfter ? (
          <Group gap="xs" wrap="nowrap">
            <EPCBadge
              epcClass={epcAfter}
              size="sm"
              energyIntensity={intensityAfter}
              estimated
            />
            {intensityAfter !== undefined && (
              <Text size="xs" c="dimmed">
                {Math.round(intensityAfter)} kWh/m²/y
              </Text>
            )}
          </Group>
        ) : (
          "-"
        )}
      </Table.Td>
      <Table.Td>
        {energyReduction !== undefined ? (
          <DeltaBadge delta={energyReduction} higherIsBetter={false} />
        ) : (
          "-"
        )}
      </Table.Td>
      {showDeliveredEnergyColumn && (
        <Table.Td>
          {deliveredAfter !== undefined ? (
            <Stack gap={4}>
              <Text size="sm">{formatEnergyPerYear(deliveredAfter)}</Text>
              {deliveredEnergyReduction !== undefined ? (
                <DeltaBadge
                  delta={deliveredEnergyReduction}
                  higherIsBetter={false}
                />
              ) : (
                <Text size="xs" c="dimmed">
                  Baseline unavailable
                </Text>
              )}
            </Stack>
          ) : (
            "-"
          )}
        </Table.Td>
      )}
      <Table.Td ta="right">
        {isSuccess && fr ? (
          <Text
            size="sm"
            fw={500}
            c={
              noSavings
                ? "dimmed"
                : fr.netPresentValue >= 0
                  ? "green.7"
                  : "red.7"
            }
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {formatCurrency(fr.netPresentValue)}
          </Text>
        ) : result.status === "error" ? (
          <Text size="xs" c="red">
            {(result.error ?? "").substring(0, 40)}
          </Text>
        ) : (
          "-"
        )}
      </Table.Td>
      <Table.Td ta="right">
        <Text
          size="sm"
          c={noSavings ? "dimmed" : undefined}
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {isSuccess && fr
            ? `${formatDecimal(fr.returnOnInvestment * 100)}%`
            : "-"}
        </Text>
      </Table.Td>
      <Table.Td ta="right">
        <Text
          size="sm"
          c={noSavings ? "dimmed" : undefined}
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {isSuccess && fr ? formatDecimal(fr.paybackTime) : "-"}
        </Text>
      </Table.Td>
    </Table.Tr>
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

export type { RowVm };
