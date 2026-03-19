/**
 * BuildingTypeInputs Component
 * Provides building type and construction period with dynamic filtering based on archetype availability.
 */

import {
  Alert,
  Badge,
  Group,
  Loader,
  Select,
  SimpleGrid,
  Text,
} from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import type { PeriodAvailabilityResult } from "../../../../services/types";
import {
  constructionPeriodsEqual,
  normalizeConstructionPeriod,
} from "../../../../utils/apiMappings";
import { buildPeriodFallbackMessage } from "./archetypeUiMessaging";
import { useHomeAssistant } from "../../hooks/useHomeAssistant";
import { useHomeAssistantServices } from "../../hooks/useHomeAssistantServices";

export function BuildingTypeInputs() {
  const { state, dispatch } = useHomeAssistant();
  const { building } = useHomeAssistantServices();

  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availablePeriods, setAvailablePeriods] = useState<string[]>([]);
  const [periodAvailability, setPeriodAvailability] =
    useState<PeriodAvailabilityResult | null>(null);
  const [archetypeCount, setArchetypeCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showInfoAlert, setShowInfoAlert] = useState(true);
  const periodRequestIdRef = useRef(0);

  const hasCoordinates =
    state.building.lat !== null && state.building.lng !== null;

  // Load available categories when coordinates change
  useEffect(() => {
    const loadCategories = async () => {
      setIsLoading(true);
      try {
        const coords = hasCoordinates
          ? { lat: state.building.lat!, lng: state.building.lng! }
          : null;
        const categories = await building.getAvailableCategories(coords);
        setAvailableCategories(categories);

        // Clear building type if no longer available
        if (
          state.building.buildingType &&
          !categories.includes(state.building.buildingType)
        ) {
          dispatch({
            type: "UPDATE_BUILDING",
            field: "buildingType",
            value: "",
          });
        }
      } catch (error) {
        console.error("Failed to load categories:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCategories();
  }, [
    state.building.lat,
    state.building.lng,
    hasCoordinates,
    building,
    dispatch,
    state.building.buildingType,
  ]);

  // Load available periods when building type or coordinates change.
  // Filters by detected country so users only see periods available locally.
  useEffect(() => {
    const loadPeriods = async () => {
      const requestId = ++periodRequestIdRef.current;
      if (!state.building.buildingType) {
        setAvailablePeriods([]);
        setPeriodAvailability(null);
        return;
      }

      try {
        const detectedCountry = hasCoordinates
          ? building.detectCountryFromCoords({
              lat: state.building.lat!,
              lng: state.building.lng!,
            })
          : undefined;

        const result = await building.getAvailablePeriods(
          state.building.buildingType,
          detectedCountry ?? undefined,
        );
        if (requestId !== periodRequestIdRef.current) return;
        setAvailablePeriods(result.periods);
        setPeriodAvailability(result);

        const currentPeriod = normalizeConstructionPeriod(
          state.building.constructionPeriod,
        );
        const shouldReplacePeriod =
          !currentPeriod ||
          !result.periods.some((period) =>
            constructionPeriodsEqual(period, currentPeriod),
          );
        if (
          shouldReplacePeriod &&
          result.recommendedPeriod &&
          !constructionPeriodsEqual(
            state.building.constructionPeriod,
            result.recommendedPeriod,
          )
        ) {
          dispatch({
            type: "UPDATE_BUILDING",
            field: "constructionPeriod",
            value: result.recommendedPeriod,
          });
        }
      } catch (error) {
        console.error("Failed to load periods:", error);
        setPeriodAvailability(null);
      }
    };

    loadPeriods();
  }, [
    state.building.buildingType,
    state.building.lat,
    state.building.lng,
    hasCoordinates,
    building,
    dispatch,
    state.building.constructionPeriod,
  ]);

  // Count matching archetypes
  useEffect(() => {
    const countArchetypes = async () => {
      try {
        const count = await building.countMatchingArchetypes(
          state.building.buildingType || undefined,
          state.building.constructionPeriod || undefined,
          periodAvailability?.scope === "local"
            ? (periodAvailability.detectedCountry ?? undefined)
            : undefined,
        );
        setArchetypeCount(count);
      } catch (error) {
        console.error("Failed to count archetypes:", error);
      }
    };

    countArchetypes();
  }, [
    state.building.buildingType,
    state.building.constructionPeriod,
    building,
    periodAvailability,
  ]);

  const periodFallbackMessage = buildPeriodFallbackMessage(
    periodAvailability,
    state.building.buildingType,
  );

  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
      {/* Info alert */}
      {showInfoAlert && (
        <Alert
          variant="light"
          color="blue"
          icon={<IconInfoCircle size={16} />}
          withCloseButton
          onClose={() => setShowInfoAlert(false)}
          style={{ gridColumn: "1 / -1" }}
        >
          <Text size="sm" fw={500} mb={4}>
            How Building Matching Works
          </Text>
          <Text size="sm">
            Your building will be matched to reference archetypes from our
            database. Options shown are filtered based on what's available near
            your coordinates.
          </Text>
        </Alert>
      )}

      {periodFallbackMessage && (
        <Alert
          variant="light"
          color="yellow"
          icon={<IconInfoCircle size={16} />}
          style={{ gridColumn: "1 / -1" }}
        >
          <Text size="sm">{periodFallbackMessage}</Text>
        </Alert>
      )}

      {/* Loading state */}
      {isLoading && (
        <div
          style={{ gridColumn: "1 / -1", textAlign: "center", padding: "1rem" }}
        >
          <Loader size="sm" />
          <Text size="sm" c="dimmed" mt="xs">
            Loading available options...
          </Text>
        </div>
      )}

      {/* Building type */}
      {!isLoading && (
        <>
          <div>
            <Select
              label="Building Type"
              description={
                hasCoordinates
                  ? "Ordered by nearest archetypes to your location."
                  : "Enter coordinates first for location-based filtering."
              }
              placeholder="Choose building type"
              data={availableCategories.map((cat) => ({
                value: cat,
                label: cat,
              }))}
              value={state.building.buildingType}
              onChange={(value) => {
                if (value) {
                  dispatch({
                    type: "UPDATE_BUILDING",
                    field: "buildingType",
                    value,
                  });
                }
              }}
              required
              allowDeselect={false}
              disabled={!hasCoordinates}
            />
            {!hasCoordinates && (
              <Text size="xs" c="orange" mt={4}>
                Enter coordinates above to see available building types
              </Text>
            )}
          </div>

          {/* Construction period */}
          <div>
            <Group gap="xs" mb={4}>
              <Text size="sm" fw={500}>
                Construction Period
              </Text>
              {state.building.buildingType && archetypeCount > 0 && (
                <Badge size="sm" variant="light" color="blue">
                  {archetypeCount}{" "}
                  {periodAvailability?.scope === "fallback"
                    ? "fallback archetype"
                    : "local archetype"}
                  {archetypeCount !== 1 ? "s" : ""} available
                </Badge>
              )}
            </Group>
            <Select
              description="When was your building constructed?"
              placeholder="Choose construction period"
              data={availablePeriods.map((period) => ({
                value: period,
                label: period,
              }))}
              value={state.building.constructionPeriod}
              onChange={(value) => {
                if (value) {
                  dispatch({
                    type: "UPDATE_BUILDING",
                    field: "constructionPeriod",
                    value,
                  });
                }
              }}
              required
              allowDeselect={false}
              disabled={!state.building.buildingType}
            />
            {state.building.buildingType && availablePeriods.length === 0 && (
              <Text size="xs" c="red" mt={4}>
                No construction periods available for this building type
              </Text>
            )}
          </div>
        </>
      )}
    </SimpleGrid>
  );
}
