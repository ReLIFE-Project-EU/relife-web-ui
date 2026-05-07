/**
 * PortfolioSummaryStrip
 * A sticky strip rendered under the Stepper that surfaces portfolio context
 * (count, area, CAPEX, project lifetime, status) across every wizard step.
 *
 * Reads only existing state — no new reducer fields, no new API calls.
 */

import { Badge, Card, Group, Loader, Stack, Text } from "@mantine/core";
import { useMemo } from "react";
import { formatCurrency, formatNumber } from "../../../utils/formatters";
import type { PortfolioAdvisorState } from "../context/types";

interface PortfolioSummaryStripProps {
  state: PortfolioAdvisorState;
}

const STEPPER_OFFSET = 96; // matches useWizardStepScroll's scrollMarginTop

export function PortfolioSummaryStrip({ state }: PortfolioSummaryStripProps) {
  const buildings = state.buildings;
  const totals = useMemo(() => {
    const totalArea = buildings.reduce((s, b) => s + (b.floorArea || 0), 0);
    const totalCapex = buildings.reduce(
      (s, b) =>
        s +
        (typeof b.estimatedCapex === "number"
          ? b.estimatedCapex
          : (state.renovation.estimatedCapex ?? 0)),
      0,
    );
    return { totalArea, totalCapex };
  }, [buildings, state.renovation.estimatedCapex]);

  const resultsCount = Object.keys(state.buildingResults).length;
  const status = (() => {
    if (state.isEvaluating || state.isEstimating || state.isRanking) {
      return { label: "Running…", color: "blue", icon: true };
    }
    if (resultsCount > 0) {
      return { label: "Complete", color: "green", icon: false };
    }
    if (state.currentStep > 0) {
      return { label: "In progress", color: "yellow", icon: false };
    }
    return { label: "Not started", color: "gray", icon: false };
  })();

  return (
    <Card
      withBorder
      radius="md"
      p={0}
      style={{
        position: "sticky",
        top: STEPPER_OFFSET,
        zIndex: 10,
        backgroundColor: "var(--mantine-color-gray-0)",
      }}
    >
      <Group gap={0} grow wrap="nowrap" align="stretch">
        <Cell label="Buildings">
          {buildings.length > 0 ? (
            formatNumber(buildings.length)
          ) : (
            <Text c="dimmed" span>
              —
            </Text>
          )}
        </Cell>
        <Cell label="Floor area">
          {totals.totalArea > 0 ? (
            <>
              {formatNumber(totals.totalArea)}
              <Text component="span" size="xs" c="dimmed" ml={4}>
                m²
              </Text>
            </>
          ) : (
            <Text c="dimmed" span>
              —
            </Text>
          )}
        </Cell>
        <Cell label="Estimated CAPEX">
          {totals.totalCapex > 0 ? (
            formatCurrency(totals.totalCapex)
          ) : (
            <Text c="dimmed" span>
              —
            </Text>
          )}
        </Cell>
        <Cell label="Project lifetime">
          {state.projectLifetime}
          <Text component="span" size="xs" c="dimmed" ml={4}>
            years
          </Text>
        </Cell>
        <Cell label="Status" alignEnd>
          <Badge
            color={status.color}
            variant="light"
            leftSection={
              status.icon ? (
                <Loader size={10} color={status.color} />
              ) : undefined
            }
          >
            {status.label}
          </Badge>
        </Cell>
      </Group>
    </Card>
  );
}

function Cell({
  label,
  children,
  alignEnd,
}: {
  label: string;
  children: React.ReactNode;
  alignEnd?: boolean;
}) {
  return (
    <Stack
      gap={2}
      px="md"
      py="xs"
      style={{
        borderRight: "1px solid var(--mantine-color-gray-2)",
        minWidth: 0,
      }}
    >
      <Text
        size="10px"
        fw={700}
        c="dimmed"
        tt="uppercase"
        style={{ letterSpacing: "0.06em" }}
      >
        {label}
      </Text>
      <Text
        size="sm"
        fw={600}
        style={{
          fontVariantNumeric: "tabular-nums",
          alignSelf: alignEnd ? "flex-start" : "stretch",
        }}
      >
        {children}
      </Text>
    </Stack>
  );
}
