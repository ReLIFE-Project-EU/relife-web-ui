/**
 * BuildingInfoStep Component
 * Screen 1: Collects building information and triggers EPC estimation.
 */

import { Alert, Badge, Box, Grid, Stack, Text, Title } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { useCallback, useMemo, useState } from "react";
import {
  BuildingSelector,
  type BuildingSelectorInitialValue,
  type BuildingSelectorSelection,
} from "../../../../components/building-selector";
import {
  ErrorAlert,
  SelectionSummaryPanel,
  StepProgressFooter,
  type SelectionSummaryItem,
} from "../../../../components/shared";
import { useHomeAssistant } from "../../hooks/useHomeAssistant";
import { useHomeAssistantServices } from "../../hooks/useHomeAssistantServices";
import { auditLog } from "../../../../utils/auditLogger";
import { deriveConstructionYear } from "../../../../utils/apiMappings";

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

  const selectorInitialValue = useMemo<BuildingSelectorInitialValue>(
    () => ({
      mode: "map",
      coords: hasCoordinates
        ? {
            lat: state.building.lat ?? undefined,
            lng: state.building.lng ?? undefined,
          }
        : null,
      country: state.building.country || detectedCountry,
      category: state.building.buildingType || null,
      constructionPeriod: state.building.constructionPeriod || null,
      archetype:
        state.building.selectedArchetype ??
        state.building.tentativeArchetype ??
        null,
      floorArea: state.building.floorArea,
      numberOfFloors: state.building.numberOfFloors,
      apartmentLocation: state.building.apartmentLocation,
      modifications: state.building.modifications,
    }),
    [
      detectedCountry,
      hasCoordinates,
      state.building.apartmentLocation,
      state.building.buildingType,
      state.building.constructionPeriod,
      state.building.country,
      state.building.floorArea,
      state.building.lat,
      state.building.lng,
      state.building.modifications,
      state.building.numberOfFloors,
      state.building.selectedArchetype,
      state.building.tentativeArchetype,
    ],
  );

  const handleBuildingSelectionChange = useCallback(
    (selection: BuildingSelectorSelection | null) => {
      if (!selection) {
        dispatch({
          type: "SET_BUILDING",
          building: {
            country: "",
            lat: null,
            lng: null,
            buildingType: "",
            constructionPeriod: "",
            constructionYear: null,
            selectedArchetype: undefined,
            tentativeArchetype: undefined,
            isModified: false,
            modifications: undefined,
            floorArea: null,
            numberOfFloors: null,
            apartmentLocation: undefined,
            floorNumber: null,
          },
        });
        return;
      }

      dispatch({
        type: "SET_BUILDING",
        building: {
          country: selection.country,
          lat: selection.coords.lat,
          lng: selection.coords.lng,
          buildingType: selection.category,
          constructionPeriod: selection.constructionPeriod,
          constructionYear: deriveConstructionYear(
            selection.constructionPeriod,
          ),
          tentativeArchetype: selection.archetype,
          selectedArchetype: selection.archetype,
          isModified: Boolean(selection.modifications),
          modifications: selection.modifications,
          floorArea: selection.floorArea,
          numberOfFloors: selection.numberOfFloors,
          apartmentLocation: selection.apartmentLocation,
          floorNumber: selection.floorNumber ?? null,
        },
      });
    },
    [dispatch],
  );

  const handleEstimateEPC = async () => {
    if (!isValid) return;

    dispatch({ type: "START_ESTIMATION" });

    const auditCtx = auditLog.startRun("hra");
    auditLog.info("pipeline", "pipeline.run.start", {
      tool: "hra",
      stage: "building-info",
    });

    try {
      const result = await energy.estimateEPC(state.building, auditCtx);
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
      value: state.building.country || detectedCountry || undefined,
      complete: Boolean(state.building.country || detectedCountry),
      placeholder: "Choose reference or map location",
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
      placeholder: "Choose a reference",
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
      Choose a reference building or use the map matcher before continuing.
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
          Pick a typical home from the catalog, or place yours on the map and
          let the tool match a representative archetype.
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
            We match buildings to archetypes based on country, type, and
            construction period. Closer matches produce more reliable estimates.
            You can review the match before continuing.
          </Text>
        </Alert>
      )}

      {/* Two-column: selector + sticky summary */}
      <Grid gutter="lg">
        {/* Main column */}
        <Grid.Col span={{ base: 12, md: 8 }}>
          <BuildingSelector
            service={building}
            host="hra"
            adjustmentScope="limited"
            initialValue={selectorInitialValue}
            onSelectionChange={handleBuildingSelectionChange}
          />
        </Grid.Col>

        {/* Summary column */}
        <Grid.Col span={{ base: 12, md: 4 }}>
          <SelectionSummaryPanel
            status={
              <Badge
                size="sm"
                variant="light"
                color={archetypeDone ? "relife" : "gray"}
                tt="uppercase"
              >
                {archetypeDone ? "Matched" : "In progress"}
              </Badge>
            }
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
