/**
 * BuildingInfoStep Component
 * Screen 1: Collects building information and triggers EPC estimation.
 */

import { Alert, Box, Grid, Stack, Text, Title } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import {
  ErrorAlert,
  SelectionSummaryPanel,
  StepProgressFooter,
  StepSectionCard,
  SummaryStatusBadge,
  type SelectionSummaryItem,
} from "../../../../components/shared";
import { useHomeAssistant } from "../../hooks/useHomeAssistant";
import { useHomeAssistantServices } from "../../hooks/useHomeAssistantServices";
import {
  ArchetypeSelector,
  BuildingTypeInputs,
  LocationInputs,
} from "../building";

export function BuildingInfoStep() {
  const { state, dispatch } = useHomeAssistant();
  const { energy, building } = useHomeAssistantServices();
  const [showHowItWorks, setShowHowItWorks] = useState(true);

  const hasCoordinates =
    state.building.lat !== null && state.building.lng !== null;

  const detectedCountry = useMemo(() => {
    if (!hasCoordinates) return null;
    return building.detectCountryFromCoords({
      lat: state.building.lat!,
      lng: state.building.lng!,
    });
  }, [hasCoordinates, state.building.lat, state.building.lng, building]);

  const locationDone = hasCoordinates;
  const buildingDone =
    Boolean(state.building.buildingType) &&
    Boolean(state.building.constructionPeriod);
  const archetypeDone = state.building.selectedArchetype !== undefined;

  const completedCount = [locationDone, buildingDone, archetypeDone].filter(
    Boolean,
  ).length;

  const isValid = locationDone && buildingDone && archetypeDone;

  const handleEstimateEPC = async () => {
    if (!isValid) return;

    dispatch({ type: "START_ESTIMATION" });

    try {
      const result = await energy.estimateEPC(state.building);
      dispatch({ type: "SET_ESTIMATION", result });
      dispatch({ type: "NEXT_STEP" });
    } catch (error) {
      dispatch({
        type: "ESTIMATION_ERROR",
        error:
          error instanceof Error ? error.message : "Failed to estimate EPC",
      });
    }
  };

  const summaryItems: SelectionSummaryItem[] = [
    {
      id: "country",
      label: "Country",
      value: detectedCountry ?? undefined,
      complete: Boolean(detectedCountry),
      placeholder: "Click on the map",
    },
    {
      id: "type",
      label: "Type",
      value: state.building.buildingType || undefined,
      complete: Boolean(state.building.buildingType),
    },
    {
      id: "period",
      label: "Built",
      value: state.building.constructionPeriod || undefined,
      complete: Boolean(state.building.constructionPeriod),
    },
    {
      id: "archetype",
      label: "Archetype",
      value: state.building.selectedArchetype?.name,
      complete: archetypeDone,
      placeholder: "Awaiting match",
    },
  ];

  const summaryNote = archetypeDone ? (
    <Text size="xs" c="dimmed">
      <Text component="span" fw={600} c="var(--mantine-color-text)">
        Energy figures come next.
      </Text>{" "}
      Once you continue, we'll combine this archetype with your bills to
      estimate today's energy use.
    </Text>
  ) : (
    <Text size="xs" c="dimmed">
      Fill in the location, type, and period to match an archetype.
    </Text>
  );

  return (
    <Stack gap="lg">
      {/* Heading */}
      <Box>
        <Title order={2} mb={4}>
          Tell us about your building
        </Title>
        <Text c="dimmed" size="sm">
          Place your home on the map, pick its type and age. We'll match it to a
          representative archetype with typical energy use, then refine in the
          next step.
        </Text>
      </Box>

      {/* Dismissible "How matching works" info card */}
      {showHowItWorks && (
        <Alert
          variant="light"
          color="blue"
          icon={<IconInfoCircle size={16} />}
          withCloseButton
          onClose={() => setShowHowItWorks(false)}
          title="How this works"
        >
          <Text size="sm">
            We group buildings into archetypes by country, type, and
            construction period. The closer the match, the more reliable the
            estimate. You can review and refine the matched archetype before
            continuing.
          </Text>
        </Alert>
      )}

      {/* Two-column: stacked sections + sticky summary */}
      <Grid gutter="lg">
        {/* Main column */}
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Stack gap="md">
            <StepSectionCard
              number={1}
              title="Location"
              meta={
                detectedCountry
                  ? detectedCountry
                  : hasCoordinates
                    ? "Pin set — country not yet detected"
                    : "Click on the map to drop your pin"
              }
              complete={locationDone}
              active={!locationDone}
            >
              <LocationInputs />
            </StepSectionCard>

            <StepSectionCard
              number={2}
              title="Building type & age"
              meta={
                buildingDone
                  ? `${state.building.buildingType} · ${state.building.constructionPeriod}`
                  : "Pick the type and construction period"
              }
              complete={buildingDone}
              active={locationDone && !buildingDone}
            >
              <BuildingTypeInputs />
            </StepSectionCard>

            <Box id="hra-archetype-section" style={{ scrollMarginTop: 96 }}>
              <StepSectionCard
                number={3}
                title="Matched archetype"
                meta={
                  archetypeDone
                    ? state.building.selectedArchetype?.name
                    : "Awaiting building type & period"
                }
                complete={archetypeDone}
                active={buildingDone && !archetypeDone}
              >
                <ArchetypeSelector />
              </StepSectionCard>
            </Box>
          </Stack>
        </Grid.Col>

        {/* Summary column */}
        <Grid.Col span={{ base: 12, md: 4 }}>
          <SelectionSummaryPanel
            status={<SummaryStatusBadge complete={archetypeDone} />}
            items={summaryItems}
            note={summaryNote}
          />
        </Grid.Col>
      </Grid>

      {/* Error display */}
      <ErrorAlert error={state.error} title="Estimation Error" />

      {/* Sticky progress footer with primary CTA */}
      <StepProgressFooter
        completedCount={completedCount}
        totalCount={3}
        primaryLabel="Show my energy profile"
        onPrimary={handleEstimateEPC}
        primaryDisabled={!isValid}
        isLoading={state.isEstimating}
      />
    </Stack>
  );
}
