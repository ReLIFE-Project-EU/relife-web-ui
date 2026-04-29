/**
 * BuildingTypeInputs Component
 * Provides building type and construction period with dynamic filtering based on archetype availability.
 */

import {
  Alert,
  Anchor,
  Badge,
  Box,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  UnstyledButton,
} from "@mantine/core";
import {
  IconArrowRight,
  IconBuilding,
  IconBuildingCommunity,
  IconBuildingSkyscraper,
  IconCalendarEvent,
  IconHome,
  IconInfoCircle,
} from "@tabler/icons-react";
import { useEffect, useRef, useState, type ComponentType } from "react";
import type { PeriodAvailabilityResult } from "../../../../services/types";
import {
  constructionPeriodsEqual,
  normalizeConstructionPeriod,
} from "../../../../utils/apiMappings";
import { buildPeriodFallbackMessage } from "./archetypeUiMessaging";
import { useHomeAssistant } from "../../hooks/useHomeAssistant";
import { useHomeAssistantServices } from "../../hooks/useHomeAssistantServices";

type IconType = ComponentType<{ size?: number; stroke?: number }>;

function getCategoryIcon(category: string): IconType {
  const lower = category.toLowerCase();
  if (lower.includes("apartment") || lower.includes("block"))
    return IconBuildingCommunity;
  if (lower.includes("multi")) return IconBuilding;
  if (lower.includes("terraced") || lower.includes("row"))
    return IconBuildingSkyscraper;
  return IconHome;
}

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

  const periodFallback = buildPeriodFallbackMessage(
    periodAvailability,
    state.building.buildingType,
  );

  const handleSeeAlternatives = () => {
    if (typeof document === "undefined") return;
    const target = document.getElementById("hra-archetype-section");
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const selectedType = state.building.buildingType;
  const selectedPeriod = state.building.constructionPeriod;

  return (
    <Stack gap="md">
      {showInfoAlert && (
        <Alert
          variant="light"
          color="blue"
          icon={<IconInfoCircle size={16} />}
          withCloseButton
          onClose={() => setShowInfoAlert(false)}
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

      {periodFallback && (
        <Alert
          variant="light"
          color="yellow"
          icon={<IconInfoCircle size={16} />}
          title={periodFallback.title}
        >
          <Stack gap="xs">
            <Text size="sm">
              We'll match the closest available archetype from the wider
              European catalog. The matched country and period are shown in the
              archetype card below — they may change as you adjust the
              construction period.
            </Text>
            <Anchor
              size="sm"
              component="button"
              type="button"
              onClick={handleSeeAlternatives}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                alignSelf: "flex-start",
              }}
            >
              See archetype <IconArrowRight size={14} />
            </Anchor>
          </Stack>
        </Alert>
      )}

      {isLoading && (
        <Group justify="center" py="md">
          <Loader size="sm" />
          <Text size="sm" c="dimmed">
            Loading available options...
          </Text>
        </Group>
      )}

      {!isLoading && (
        <>
          {/* Building type tile grid */}
          <Box>
            <Group gap={6} mb="xs">
              <IconHome size={14} color="var(--mantine-color-dimmed)" />
              <Text
                size="xs"
                fw={700}
                c="dimmed"
                tt="uppercase"
                style={{ letterSpacing: "0.07em" }}
              >
                Building type
              </Text>
            </Group>

            {!hasCoordinates ? (
              <Text size="sm" c="orange">
                Enter coordinates above to see available building types.
              </Text>
            ) : availableCategories.length === 0 ? (
              <Text size="sm" c="dimmed">
                No building types available for this location.
              </Text>
            ) : (
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
                {availableCategories.map((category) => {
                  const Icon = getCategoryIcon(category);
                  const isOn = selectedType === category;
                  return (
                    <UnstyledButton
                      key={category}
                      onClick={() =>
                        dispatch({
                          type: "UPDATE_BUILDING",
                          field: "buildingType",
                          value: category,
                        })
                      }
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 14px",
                        borderRadius: "var(--mantine-radius-md)",
                        border: `1.5px solid ${
                          isOn
                            ? "var(--mantine-color-relife-7)"
                            : "var(--mantine-color-default-border)"
                        }`,
                        background: isOn
                          ? "var(--mantine-color-relife-0)"
                          : "var(--mantine-color-body)",
                        boxShadow: isOn
                          ? "0 0 0 2px rgba(40,144,72,0.12)"
                          : undefined,
                        transition:
                          "border-color 120ms ease, background 120ms ease",
                      }}
                    >
                      <ThemeIcon
                        size={36}
                        radius="xl"
                        color={isOn ? "relife" : "gray"}
                        variant={isOn ? "filled" : "light"}
                      >
                        <Icon size={18} stroke={1.75} />
                      </ThemeIcon>
                      <Text fw={600} size="sm">
                        {category}
                      </Text>
                    </UnstyledButton>
                  );
                })}
              </SimpleGrid>
            )}
          </Box>

          {/* Construction period chips */}
          <Box>
            <Group gap="xs" mb="xs" align="center">
              <Group gap={6}>
                <IconCalendarEvent
                  size={14}
                  color="var(--mantine-color-dimmed)"
                />
                <Text
                  size="xs"
                  fw={700}
                  c="dimmed"
                  tt="uppercase"
                  style={{ letterSpacing: "0.07em" }}
                >
                  Construction period
                </Text>
              </Group>
              {selectedType && archetypeCount > 0 && (
                <Badge size="sm" variant="light" color="blue">
                  {archetypeCount}{" "}
                  {periodAvailability?.scope === "fallback"
                    ? "fallback archetype"
                    : "local archetype"}
                  {archetypeCount !== 1 ? "s" : ""} available
                </Badge>
              )}
            </Group>

            {!selectedType ? (
              <Text size="sm" c="dimmed">
                Pick a building type first.
              </Text>
            ) : availablePeriods.length === 0 ? (
              <Text size="sm" c="red">
                No construction periods available for this building type.
              </Text>
            ) : (
              <Group gap="xs">
                {availablePeriods.map((period) => {
                  const isOn = selectedPeriod === period;
                  return (
                    <UnstyledButton
                      key={period}
                      onClick={() =>
                        dispatch({
                          type: "UPDATE_BUILDING",
                          field: "constructionPeriod",
                          value: period,
                        })
                      }
                      style={{
                        padding: "9px 14px",
                        borderRadius: "var(--mantine-radius-md)",
                        border: `1.5px solid ${
                          isOn
                            ? "var(--mantine-color-relife-7)"
                            : "var(--mantine-color-default-border)"
                        }`,
                        background: isOn
                          ? "var(--mantine-color-relife-0)"
                          : "var(--mantine-color-body)",
                        boxShadow: isOn
                          ? "0 0 0 2px rgba(40,144,72,0.12)"
                          : undefined,
                        transition:
                          "border-color 120ms ease, background 120ms ease",
                      }}
                    >
                      <Text
                        fw={700}
                        size="sm"
                        c={isOn ? "relife.7" : undefined}
                      >
                        {period}
                      </Text>
                    </UnstyledButton>
                  );
                })}
              </Group>
            )}
          </Box>
        </>
      )}
    </Stack>
  );
}
