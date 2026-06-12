import { useRef, useState } from "react";
import { Alert, Box, Button, Group, Stack, Text, Title } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { ErrorAlert } from "../../../components/shared/ErrorAlert";
import { formatNumber } from "../../../utils/formatters";
import { RSE_MVP_COST_SOURCE_NOTE } from "../constants";
import { useStrategyExplorer } from "../hooks/useStrategyExplorer";
import type { RSEPackageId } from "../types";
import {
  CompareStrategiesTable,
  ComparisonCharts,
  PackageDeepDive,
  PackageTabs,
  ScoreCompositionChart,
  StrategyHero,
  UnavailableCombinationsAlert,
} from "./results";

const PACKAGE_DETAILS_SCROLL_MARGIN = 96;

export function ResultsStep() {
  const { state, dispatch } = useStrategyExplorer();
  const result = state.workflowResult;
  const packageDetailsRef = useRef<HTMLDivElement | null>(null);

  const [selectedPackageId, setSelectedPackageId] =
    useState<RSEPackageId | null>(null);

  const handleSelectAndRevealPackage = (packageId: RSEPackageId) => {
    setSelectedPackageId(packageId);
    requestAnimationFrame(() => {
      packageDetailsRef.current?.focus({ preventScroll: true });
      packageDetailsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const handleReset = () => {
    dispatch({ type: "RESET" });
  };

  if (!result) {
    return (
      <Stack gap="xl">
        <Box>
          <Title order={2} mb="xs">
            Results
          </Title>
          <Text c="dimmed">
            No results available. Please run the analysis first.
          </Text>
        </Box>
      </Stack>
    );
  }

  const { rankings, packageAggregates, unavailableCombinations, request } =
    result;
  const hasRankings = rankings.length > 0;
  // Selection defaults to the top-ranked package until the user picks one.
  const activePackageId = selectedPackageId ?? rankings[0]?.packageId ?? null;
  const activeAggregate = packageAggregates.find(
    (agg) => agg.packageId === activePackageId,
  );
  const totalPortfolioBuildings = request.portfolio.selections.reduce(
    (sum, selection) => sum + selection.buildingCount,
    0,
  );

  return (
    <Stack gap="xl">
      <Box>
        <Title order={2} mb="xs">
          Strategy Comparison Results
        </Title>
        <Text c="dimmed" size="sm">
          How each renovation package performs across your building stock of{" "}
          {formatNumber(totalPortfolioBuildings)} buildings.
        </Text>
      </Box>

      <ErrorAlert error={state.error} title="Analysis Error" />

      {unavailableCombinations.length > 0 && (
        <UnavailableCombinationsAlert combinations={unavailableCombinations} />
      )}

      {hasRankings && (
        <>
          <StrategyHero
            result={result}
            selectedPackageId={activePackageId as RSEPackageId}
            onSelectPackage={handleSelectAndRevealPackage}
          />

          <ScoreCompositionChart rankings={rankings} />

          <Box
            ref={packageDetailsRef}
            aria-label="Selected strategy details"
            tabIndex={-1}
            style={{ scrollMarginTop: PACKAGE_DETAILS_SCROLL_MARGIN }}
          >
            <PackageTabs
              rankings={rankings}
              selectedPackageId={activePackageId as RSEPackageId}
              onSelectPackage={setSelectedPackageId}
            />
            {activeAggregate ? (
              <PackageDeepDive
                aggregate={activeAggregate}
                goal={request.goal}
              />
            ) : null}
          </Box>

          <ComparisonCharts
            rankings={rankings}
            aggregates={packageAggregates}
            goal={request.goal}
          />

          <CompareStrategiesTable
            rankings={rankings}
            aggregates={packageAggregates}
            goal={request.goal}
            selectedPackageId={activePackageId as RSEPackageId}
            onSelectPackage={handleSelectAndRevealPackage}
          />

          <Alert
            color="blue"
            icon={<IconInfoCircle size={16} />}
            title="Cost assumptions"
          >
            Investment and maintenance figures are not authoritative.{" "}
            {RSE_MVP_COST_SOURCE_NOTE}
          </Alert>
        </>
      )}

      {!hasRankings && unavailableCombinations.length === 0 && (
        <Alert color="yellow" icon={<IconInfoCircle size={16} />}>
          No packages could be ranked. Please check your portfolio and package
          selections.
        </Alert>
      )}

      <Group justify="flex-start">
        <Button onClick={handleReset} variant="default">
          Start Over
        </Button>
      </Group>
    </Stack>
  );
}
