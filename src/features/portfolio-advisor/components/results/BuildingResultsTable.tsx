/**
 * BuildingResultsTable
 * Sortable, filterable per-building results table with row-click drill-down.
 *
 * Extracted from the original `ResultsStep` table; column data and tooltips
 * are preserved exactly. Adds local sort/filter state and a row-click hook.
 */

import {
  Badge,
  Box,
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
  IconArrowRight,
  IconChevronDown,
  IconChevronUp,
  IconInfoCircle,
  IconSelector,
} from "@tabler/icons-react";
import { useMemo, useState, type ReactNode } from "react";
import { DeltaBadge } from "../../../../components/shared/DeltaValue";
import { EPCBadge } from "../../../../components/shared/EPCBadge";
import { MetricEyebrow } from "../../../../components/shared/MetricEyebrow";
import {
  formatCurrency,
  formatDecimal,
  formatEnergyPerYear,
  formatFixed,
  formatPercent,
  getEnergyReduction,
  isPaybackBeyondHorizon,
} from "../../../../utils/formatters";
import { getEnergyIntensity } from "../../../../utils/epcUtils";
import type { PRABuilding, BuildingAnalysisResult } from "../../context/types";
import {
  resolveSavingsAvailability,
  savingsAvailabilityExplanation,
  savingsAvailabilityLabel,
  type SavingsAvailability,
} from "../../../../services/savingsState";
import { baselineScenarioOf, renovatedOf } from "../../services/scenarioLookup";

type StatusFilter =
  | "all"
  | "pending"
  | "running"
  | "success"
  | "error"
  | "rejected"
  /** Appraised, and the investment does not pay off. */
  | "unprofitable"
  /** Analysed, but the financial appraisal never ran. */
  | "not-appraised";

/**
 * Below this the table scrolls sideways rather than compressing. Set from the
 * width at which the EPC badges stop truncating and the system-energy value
 * stops wrapping, which is wider than the mockup's 900 because the real screen
 * keeps the full concept labels.
 */
const TABLE_MIN_WIDTH = 1040;

/** Faint rule continuing the header's group divider down through the body. */
const GROUP_BORDER = "1px solid var(--mantine-color-gray-2)";

type SortKey = "name" | "energyReduction" | "npv" | "roi" | "pbp";

interface SortState {
  key: SortKey;
  dir: "asc" | "desc";
}

/** Keeps the toolbar hint honest once the user sorts by something else. */
const SORT_DESCRIPTIONS: Record<SortKey, { asc: string; desc: string }> = {
  name: { asc: "name, A to Z", desc: "name, Z to A" },
  energyReduction: {
    asc: "energy reduction, largest first",
    desc: "energy reduction, smallest first",
  },
  npv: { asc: "NPV, lowest first", desc: "NPV, highest first" },
  roi: { asc: "ROI, lowest first", desc: "ROI, highest first" },
  pbp: { asc: "payback, shortest first", desc: "payback, longest first" },
};

interface RowVm {
  building: PRABuilding;
  result: BuildingAnalysisResult;
  isSuccess: boolean;
  availability: SavingsAvailability;
  energyReduction: number | undefined;
  npv: number | undefined;
  roi: number | undefined;
  pbp: number | undefined;
}

interface BuildingResultsTableProps {
  buildings: PRABuilding[];
  results: Record<string, BuildingAnalysisResult>;
  onRowClick?: (vm: RowVm) => void;
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
      const renovated = renovatedOf(result);
      const fr = result.financialResults;
      const availability = resolveSavingsAvailability(renovated, fr);
      const energyBefore = result.estimation?.annualEnergyNeeds;
      const energyAfter = renovated?.annualEnergyNeeds;
      const energyReduction = getEnergyReduction(energyBefore, energyAfter);
      return {
        building,
        result,
        isSuccess,
        availability,
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
  if (filter === "unprofitable") {
    // Requires an appraisal: a skipped one leaves a placeholder zero that would
    // otherwise be read as a genuine non-positive NPV, as would a missing one.
    return rows.filter(
      (r) =>
        r.isSuccess &&
        r.availability === "appraised" &&
        r.npv !== undefined &&
        r.npv <= 0,
    );
  }
  if (filter === "not-appraised") {
    return rows.filter(
      (r) =>
        r.isSuccess &&
        r.availability !== "appraised" &&
        r.availability !== "unknown",
    );
  }
  return rows.filter((r) => r.result.status === filter);
}

function applySort(rows: RowVm[], sort: SortState): RowVm[] {
  const dir = sort.dir === "asc" ? 1 : -1;
  const get = (r: RowVm): number | string => {
    switch (sort.key) {
      case "name":
        return r.building.name.toLowerCase();
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
  return [...rows].sort((a, b) => {
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
}: BuildingResultsTableProps) {
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortState>({ key: "npv", dir: "desc" });

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
    const renovated = renovatedOf(result);
    return (
      baselineScenarioOf(result)?.deliveredTotal !== undefined ||
      renovated?.deliveredTotal !== undefined
    );
  });

  const toggleSort = (key: SortKey) => {
    setSort((current) =>
      current.key === key
        ? { key, dir: current.dir === "asc" ? "desc" : "asc" }
        : {
            key,
            dir: key === "name" ? "asc" : "desc",
          },
    );
  };

  // The bar in the NPV column is read against the largest magnitude on screen,
  // so it rescales when the filter changes rather than against a fixed maximum.
  const maxAbsNpv = visibleRows.reduce(
    (max, { npv }) => (npv === undefined ? max : Math.max(max, Math.abs(npv))),
    0,
  );

  const energyColumnCount = showDeliveredEnergyColumn ? 3 : 2;

  return (
    <Card withBorder radius="md" p={0}>
      <Group p="md" gap="sm" wrap="wrap">
        <Select
          aria-label="Filter by status"
          data={[
            { value: "all", label: "All buildings" },
            { value: "success", label: "Successful" },
            {
              value: "unprofitable",
              label: "Analysed — does not pay off (NPV ≤ 0)",
            },
            { value: "not-appraised", label: "Not appraised" },
            { value: "rejected", label: "Rejected" },
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
            Click a row to see the full breakdown. Sorted by{" "}
            {SORT_DESCRIPTIONS[sort.key][sort.dir]}.
          </Text>
        )}
        <Group ml="auto" gap="xs">
          <Badge variant="light" color="gray" size="lg">
            {visibleRows.length} of {allRows.length}
          </Badge>
        </Group>
      </Group>

      <Table.ScrollContainer minWidth={TABLE_MIN_WIDTH}>
        <Table highlightOnHover withTableBorder={false}>
          <Table.Thead>
            <Table.Tr>
              <GroupTh colSpan={2}>Building</GroupTh>
              <GroupTh colSpan={energyColumnCount} groupStart>
                Energy performance
              </GroupTh>
              <GroupTh colSpan={3} groupStart>
                Financial outcome
              </GroupTh>
            </Table.Tr>
            <Table.Tr>
              <Table.Th w={34} />
              <SortableTh
                label="Name"
                sortKey="name"
                sort={sort}
                onSort={toggleSort}
              />
              <PlainTh unit="before → after" groupStart>
                Estimated EPC
              </PlainTh>
              <SortableTh
                label="Energy reduction"
                unit="thermal needs"
                sortKey="energyReduction"
                sort={sort}
                onSort={toggleSort}
                numeric
              />
              {showDeliveredEnergyColumn && (
                <PlainTh unit="kWh delivered/year" numeric>
                  System energy consumption
                </PlainTh>
              )}
              <SortableTh
                label="NPV"
                unit="EUR"
                sortKey="npv"
                sort={sort}
                onSort={toggleSort}
                numeric
                groupStart
              />
              <SortableTh
                label="ROI"
                unit="%"
                sortKey="roi"
                sort={sort}
                onSort={toggleSort}
                numeric
              />
              <SortableTh
                label="Payback"
                unit="years"
                sortKey="pbp"
                sort={sort}
                onSort={toggleSort}
                numeric
              />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {visibleRows.map((row, index) => (
              <ResultsRow
                key={row.building.id}
                row={row}
                rank={index + 1}
                maxAbsNpv={maxAbsNpv}
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
  rank,
  maxAbsNpv,
  showDeliveredEnergyColumn,
  onClick,
}: {
  row: RowVm;
  rank: number;
  maxAbsNpv: number;
  showDeliveredEnergyColumn: boolean;
  onClick?: (vm: RowVm) => void;
}) {
  const { building, result, isSuccess, availability, energyReduction } = row;
  // A skipped appraisal leaves placeholder zeros on the result; showing them
  // dimmed still shows a number, so render them as unavailable instead.
  const appraised = availability === "appraised";
  const fr = result.financialResults;
  const renovated = renovatedOf(result);
  const epcBefore = result.estimation?.estimatedEPC;
  const epcAfter = renovated?.epcClass;
  const intensityBefore = getEnergyIntensity(
    result.estimation ?? {},
    building.floorArea,
  );
  const intensityAfter = getEnergyIntensity(
    renovated ?? {},
    building.floorArea,
  );
  // Baseline scenario, not the step-1 estimation: this is the figure the
  // Financial service prices savings against, and what the portfolio summary
  // above this table already sums.
  const deliveredBefore = baselineScenarioOf(result)?.deliveredTotal;
  const deliveredAfter = renovated?.deliveredTotal;
  const deliveredEnergyReduction = getEnergyReduction(
    deliveredBefore,
    deliveredAfter,
  );

  return (
    <Table.Tr
      onClick={onClick ? () => onClick(row) : undefined}
      style={onClick ? { cursor: "pointer" } : undefined}
    >
      <Table.Td
        w={34}
        style={{ fontVariantNumeric: "tabular-nums", verticalAlign: "middle" }}
      >
        <Text fz="xs" c="gray.5">
          {rank}
        </Text>
      </Table.Td>
      <Table.Td style={{ verticalAlign: "middle" }}>
        <Group gap="xs" wrap="wrap">
          <Text size="sm" fw={500}>
            {building.name}
          </Text>
          <RowStatusBadge row={row} />
          {(result.costSource?.capexFromLookup ||
            result.costSource?.opexFromLookup) && (
            <Tooltip
              label="Cost estimated from EU reference data (no override set)"
              withArrow
            >
              <Badge
                variant="light"
                color="blue"
                size="xs"
                leftSection={<IconInfoCircle size={11} />}
              >
                Est. cost
              </Badge>
            </Tooltip>
          )}
        </Group>
      </Table.Td>
      <Table.Td style={{ borderLeft: GROUP_BORDER, verticalAlign: "middle" }}>
        {epcBefore || epcAfter ? (
          // Mantine's Badge label is `overflow: hidden`, so its min-content
          // width is near zero and the column happily squeezes "~G" down to
          // "~..". Pinning the row to max-content gives the cell a real
          // minimum for the table to lay out against.
          <Group gap="xs" wrap="nowrap" style={{ minWidth: "max-content" }}>
            {epcBefore ? (
              <EPCBadge
                epcClass={epcBefore}
                size="sm"
                energyIntensity={intensityBefore}
                estimated
              />
            ) : (
              <Text size="sm" c="dimmed">
                —
              </Text>
            )}
            <IconArrowRight
              size={14}
              color="var(--mantine-color-gray-5)"
              aria-hidden
            />
            {epcAfter ? (
              <EPCBadge
                epcClass={epcAfter}
                size="sm"
                energyIntensity={intensityAfter}
                estimated
              />
            ) : (
              <Text size="sm" c="dimmed">
                —
              </Text>
            )}
          </Group>
        ) : (
          "-"
        )}
      </Table.Td>
      <Table.Td ta="right" style={{ verticalAlign: "middle" }}>
        {energyReduction !== undefined ? (
          <DeltaBadge delta={energyReduction} higherIsBetter={false} />
        ) : (
          "-"
        )}
      </Table.Td>
      {showDeliveredEnergyColumn && (
        <Table.Td ta="right" style={{ verticalAlign: "middle" }}>
          {deliveredAfter !== undefined ? (
            <Group gap="xs" wrap="nowrap" justify="flex-end">
              <Text size="sm" style={{ fontVariantNumeric: "tabular-nums" }}>
                {formatEnergyPerYear(deliveredAfter)}
              </Text>
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
            </Group>
          ) : (
            "-"
          )}
        </Table.Td>
      )}
      <Table.Td
        ta="right"
        style={{ borderLeft: GROUP_BORDER, verticalAlign: "middle" }}
      >
        {isSuccess && fr && appraised ? (
          <NpvCell value={fr.netPresentValue} maxAbs={maxAbsNpv} />
        ) : result.status === "error" ? (
          <Text size="xs" c="red">
            {(result.error ?? "").substring(0, 40)}
          </Text>
        ) : isSuccess || result.status === "rejected" ? (
          <Text size="sm" c="dimmed">
            —
          </Text>
        ) : (
          "-"
        )}
      </Table.Td>
      <Table.Td ta="right" style={{ verticalAlign: "middle" }}>
        <Text
          size="sm"
          c={appraised ? undefined : "dimmed"}
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {isSuccess && fr && appraised
            ? formatPercent(fr.returnOnInvestment * 100)
            : "—"}
        </Text>
      </Table.Td>
      <Table.Td ta="right" style={{ verticalAlign: "middle" }}>
        <Text
          size="sm"
          c={appraised ? undefined : "dimmed"}
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {isSuccess && fr && appraised
            ? isPaybackBeyondHorizon(
                fr.paybackTime,
                fr.riskAssessment?.metadata.project_lifetime,
              )
              ? "No payback"
              : formatDecimal(fr.paybackTime)
            : "—"}
        </Text>
      </Table.Td>
    </Table.Tr>
  );
}

/**
 * NPV with a bar sized against the largest magnitude on screen, so rows can be
 * compared without reading every number. Magnitude only: the sign is already
 * carried by the colour and the value itself.
 */
function NpvCell({ value, maxAbs }: { value: number; maxAbs: number }) {
  const negative = value < 0;
  const ratio = maxAbs > 0 ? Math.abs(value) / maxAbs : 0;

  return (
    <Group gap={10} wrap="nowrap" justify="flex-end">
      <Box
        style={{
          flex: 1,
          minWidth: 40,
          height: 8,
          borderRadius: "var(--mantine-radius-sm)",
          backgroundColor: "var(--mantine-color-gray-1)",
          overflow: "hidden",
        }}
      >
        <Box
          style={{
            width: `${ratio * 100}%`,
            height: "100%",
            borderRadius: "var(--mantine-radius-sm)",
            backgroundColor: negative
              ? "var(--mantine-color-red-6)"
              : "var(--mantine-color-green-6)",
          }}
        />
      </Box>
      <Text
        fz={15}
        fw={600}
        c={negative ? "red.7" : "green.7"}
        style={{
          whiteSpace: "nowrap",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {formatCurrency(value)}
      </Text>
    </Group>
  );
}

/**
 * A fully-funded renovation is a good outcome, not a failure, so it is the one
 * unappraised state that is not flagged in warning colours.
 */
const AVAILABILITY_BADGE_COLOR: Record<SavingsAvailability, string> = {
  appraised: "gray",
  "no-savings": "yellow",
  "fully-funded": "teal",
  "not-priceable": "gray",
  unknown: "gray",
};

function RowStatusBadge({ row }: { row: RowVm }) {
  const { result, isSuccess, availability } = row;

  if (isSuccess && availability !== "appraised") {
    return (
      <Tooltip
        label={savingsAvailabilityExplanation[availability]}
        multiline
        w={300}
        position="bottom-start"
      >
        <Badge
          color={AVAILABILITY_BADGE_COLOR[availability]}
          variant="light"
          size="sm"
          leftSection={<IconInfoCircle size={11} />}
          style={{ cursor: "default" }}
        >
          {savingsAvailabilityLabel[availability]}
        </Badge>
      </Tooltip>
    );
  }

  if (result.status === "rejected" && result.rejection) {
    return (
      <Tooltip
        label={
          <Stack gap={4}>
            {result.rejection.reasons.map((reason, i) => (
              <Text key={i} size="xs" fw={i === 0 ? 600 : 400}>
                {reason.message}
              </Text>
            ))}
            {result.rejection.remediation && (
              <Text size="xs">{result.rejection.remediation}</Text>
            )}
            <Text size="xs" c="dimmed">
              Strategy: {result.rejection.strategy} · scale{" "}
              {formatFixed(result.rejection.areaScaleFactor, 2)}×
            </Text>
          </Stack>
        }
        multiline
        w={320}
        position="bottom-start"
      >
        <Badge
          color="orange"
          size="sm"
          variant="light"
          leftSection={<IconInfoCircle size={11} />}
          style={{ cursor: "default" }}
        >
          Rejected
        </Badge>
      </Tooltip>
    );
  }

  if (result.status === "error") {
    return (
      <Badge color="red" size="sm" variant="light">
        Failed
      </Badge>
    );
  }

  if (result.status === "running" || result.status === "pending") {
    return (
      <Badge color="yellow" size="sm" variant="light">
        {result.status === "running" ? "Running" : "Pending"}
      </Badge>
    );
  }

  return null;
}

/** Column-group label spanning the header's first tier. */
function GroupTh({
  colSpan,
  groupStart,
  children,
}: {
  colSpan: number;
  groupStart?: boolean;
  children: ReactNode;
}) {
  return (
    <Table.Th
      colSpan={colSpan}
      style={{
        backgroundColor: "var(--mantine-color-gray-0)",
        borderLeft: groupStart ? GROUP_BORDER : undefined,
      }}
    >
      <MetricEyebrow>{children}</MetricEyebrow>
    </Table.Th>
  );
}

/**
 * Header title over its unit. Moving the unit out of the cells is what lets
 * every numeric cell stay on one line.
 */
function ThLabel({
  label,
  unit,
  active,
  numeric,
}: {
  label: ReactNode;
  unit?: string;
  active?: boolean;
  numeric?: boolean;
}) {
  return (
    <Stack gap={0} align={numeric ? "flex-end" : undefined}>
      <Text fz={13} fw={700} c={active ? "relife.7" : undefined}>
        {label}
      </Text>
      {unit && (
        <Text fz={11} fw={400} c="dimmed">
          {unit}
        </Text>
      )}
    </Stack>
  );
}

function PlainTh({
  unit,
  numeric,
  groupStart,
  children,
}: {
  unit?: string;
  numeric?: boolean;
  groupStart?: boolean;
  children: ReactNode;
}) {
  return (
    <Table.Th
      ta={numeric ? "right" : undefined}
      style={{ borderLeft: groupStart ? GROUP_BORDER : undefined }}
    >
      <ThLabel label={children} unit={unit} numeric={numeric} />
    </Table.Th>
  );
}

function SortableTh({
  label,
  unit,
  sortKey,
  sort,
  onSort,
  numeric,
  groupStart,
}: {
  label: string;
  unit?: string;
  sortKey: SortKey;
  sort: SortState;
  onSort: (key: SortKey) => void;
  numeric?: boolean;
  groupStart?: boolean;
}) {
  const active = sort.key === sortKey;
  const Icon = !active
    ? IconSelector
    : sort.dir === "asc"
      ? IconChevronUp
      : IconChevronDown;
  return (
    <Table.Th style={{ borderLeft: groupStart ? GROUP_BORDER : undefined }}>
      <UnstyledButton
        onClick={() => onSort(sortKey)}
        style={{ width: "100%", display: "block", font: "inherit" }}
      >
        <Group
          gap={4}
          wrap="nowrap"
          align="flex-start"
          justify={numeric ? "flex-end" : "flex-start"}
        >
          <ThLabel
            label={label}
            unit={unit}
            active={active}
            numeric={numeric}
          />
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
