/**
 * ArchetypeSelector Component
 *
 * Displays the matched archetype based on user's country, location, building type,
 * and construction period selections. Allows user to confirm selection.
 */

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Collapse,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconBuildingCommunity,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconFlame,
  IconInfoCircle,
  IconRuler,
  IconSnowflake,
  IconThermometer,
  IconWindow,
} from "@tabler/icons-react";
import type { ArchetypeInfo } from "../../../../types/forecasting";
import type { ArchetypeDetails } from "../../../../types/archetype";
import { useHomeAssistant } from "../../hooks/useHomeAssistant";
import { useHomeAssistantServices } from "../../hooks/useHomeAssistantServices";

interface ArchetypeSummaryProps {
  details: ArchetypeDetails;
  isSelected: boolean;
  onSelect: () => void;
}

function ArchetypeSummary({
  details,
  isSelected,
  onSelect,
}: ArchetypeSummaryProps) {
  const [detailsOpen, { toggle: toggleDetails }] = useDisclosure(false);

  return (
    <Card withBorder shadow="sm" radius="md" p="lg">
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between" align="flex-start">
          <Stack gap={4}>
            <Group gap="xs">
              <ThemeIcon size="sm" variant="light" color="blue">
                <IconBuildingCommunity size={14} />
              </ThemeIcon>
              <Text fw={600} size="lg">
                {details.category}
              </Text>
            </Group>
            <Text size="sm" c="dimmed">
              {details.country} • {details.name}
            </Text>
          </Stack>
          {isSelected && (
            <Badge color="green" leftSection={<IconCheck size={12} />}>
              Selected
            </Badge>
          )}
        </Group>

        {/* Key metrics */}
        <SimpleGrid cols={2} spacing="sm">
          <Group gap="xs">
            <ThemeIcon size="xs" variant="light" color="gray">
              <IconRuler size={12} />
            </ThemeIcon>
            <Text size="sm">
              <Text span fw={500}>
                {details.floorArea.toFixed(0)}
              </Text>{" "}
              m² floor area
            </Text>
          </Group>
          <Group gap="xs">
            <ThemeIcon size="xs" variant="light" color="gray">
              <IconWindow size={12} />
            </ThemeIcon>
            <Text size="sm">
              <Text span fw={500}>
                {details.totalWindowArea.toFixed(1)}
              </Text>{" "}
              m² windows
            </Text>
          </Group>
          <Group gap="xs">
            <ThemeIcon size="xs" variant="light" color="red">
              <IconFlame size={12} />
            </ThemeIcon>
            <Text size="sm">
              Heating:{" "}
              <Text span fw={500}>
                {details.setpoints.heatingSetpoint}°C
              </Text>
            </Text>
          </Group>
          <Group gap="xs">
            <ThemeIcon size="xs" variant="light" color="blue">
              <IconSnowflake size={12} />
            </ThemeIcon>
            <Text size="sm">
              Cooling:{" "}
              <Text span fw={500}>
                {details.setpoints.coolingSetpoint}°C
              </Text>
            </Text>
          </Group>
        </SimpleGrid>

        {/* Thermal properties section */}
        <Button
          variant="subtle"
          size="xs"
          onClick={toggleDetails}
          rightSection={
            detailsOpen ? (
              <IconChevronUp size={14} />
            ) : (
              <IconChevronDown size={14} />
            )
          }
          justify="flex-start"
          px={0}
        >
          {detailsOpen ? "Hide" : "Show"} thermal properties
        </Button>

        <Collapse in={detailsOpen}>
          <Card withBorder bg="gray.0" radius="sm" p="sm">
            <Stack gap="xs">
              <Group gap="xs">
                <ThemeIcon size="xs" variant="light" color="orange">
                  <IconThermometer size={12} />
                </ThemeIcon>
                <Text size="sm" c="dimmed">
                  U-values (W/m²K):
                </Text>
              </Group>
              <SimpleGrid cols={3} spacing="xs">
                <Text size="xs">
                  Wall:{" "}
                  <Text span fw={500}>
                    {details.thermalProperties.wallUValue.toFixed(2)}
                  </Text>
                </Text>
                <Text size="xs">
                  Roof:{" "}
                  <Text span fw={500}>
                    {details.thermalProperties.roofUValue.toFixed(2)}
                  </Text>
                </Text>
                <Text size="xs">
                  Window:{" "}
                  <Text span fw={500}>
                    {details.thermalProperties.windowUValue.toFixed(2)}
                  </Text>
                </Text>
              </SimpleGrid>
              <Text size="xs" c="dimmed" mt="xs">
                {details.numberOfFloors} floor(s) •{" "}
                {details.buildingHeight.toFixed(1)}m height • Location:{" "}
                {details.location.lat.toFixed(2)}°,{" "}
                {details.location.lng.toFixed(2)}°
              </Text>
            </Stack>
          </Card>
        </Collapse>

        {/* Action button */}
        {!isSelected ? (
          <Button
            color="blue"
            onClick={onSelect}
            leftSection={<IconCheck size={16} />}
          >
            Select This Archetype
          </Button>
        ) : (
          <Text size="sm" c="dimmed" ta="center">
            This archetype is selected. You can proceed to estimate EPC.
          </Text>
        )}
      </Stack>
    </Card>
  );
}

export function ArchetypeSelector() {
  const { state, dispatch } = useHomeAssistant();
  const { building } = useHomeAssistantServices();

  const [matchedArchetype, setMatchedArchetype] =
    useState<ArchetypeInfo | null>(null);
  const [archetypeDetails, setArchetypeDetails] =
    useState<ArchetypeDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { lat, lng, buildingType, constructionPeriod } = state.building;

  // Check if we have all required fields to search for archetypes
  const canSearch =
    lat !== null && lng !== null && buildingType && constructionPeriod;

  // Check if current selection matches the form fields
  const isCurrentSelectionValid =
    state.building.selectedArchetype &&
    state.building.selectedArchetype.category === buildingType;

  // Find matching archetype when inputs change
  useEffect(() => {
    if (!canSearch) {
      setMatchedArchetype(null);
      setArchetypeDetails(null);
      return;
    }

    const findArchetype = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const match = await building.findMatchingArchetype(
          buildingType,
          constructionPeriod,
          { lat: lat!, lng: lng! },
        );

        if (match) {
          setMatchedArchetype(match);
          const details = await building.getArchetypeDetails(match);
          setArchetypeDetails(details);

          // Auto-populate country from matched archetype and clear selection if archetype changed
          if (
            !state.building.selectedArchetype ||
            state.building.selectedArchetype.name !== match.name ||
            state.building.selectedArchetype.country !== match.country
          ) {
            dispatch({
              type: "SET_BUILDING",
              building: {
                country: match.country, // Set country from matched archetype
                selectedArchetype: undefined, // Clear selection
              },
            });
          }
        } else {
          setMatchedArchetype(null);
          setArchetypeDetails(null);
          setError("No matching archetype found for your selections.");
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to find archetype",
        );
        setMatchedArchetype(null);
        setArchetypeDetails(null);
      } finally {
        setIsLoading(false);
      }
    };

    findArchetype();
  }, [
    canSearch,
    lat,
    lng,
    buildingType,
    constructionPeriod,
    building,
    dispatch,
    state.building.selectedArchetype,
  ]);

  const handleSelect = useCallback(() => {
    if (!matchedArchetype) return;

    dispatch({
      type: "SET_BUILDING",
      building: {
        selectedArchetype: {
          name: matchedArchetype.name,
          category: matchedArchetype.category,
          country: matchedArchetype.country,
        },
        // Also update floor area from archetype
        floorArea: archetypeDetails?.floorArea ?? null,
        numberOfFloors: archetypeDetails?.numberOfFloors ?? null,
        isModified: false,
      },
    });
  }, [matchedArchetype, archetypeDetails, dispatch]);

  // Don't render if not enough data
  if (!canSearch) {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <Card withBorder shadow="sm" radius="md" p="lg">
        <Group justify="center" gap="md" py="xl">
          <Loader size="sm" />
          <Text size="sm" c="dimmed">
            Finding best matching archetype...
          </Text>
        </Group>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert
        variant="light"
        color="red"
        icon={<IconInfoCircle size={16} />}
        title="No Archetype Found"
      >
        <Text size="sm" mb="xs">
          {error}
        </Text>
        <Text size="sm" c="dimmed">
          <strong>Try:</strong>
          <br />• Adjusting your coordinates slightly
          <br />• Selecting a different building type or construction period
          <br />• Contact support if you believe this location should be
          supported
        </Text>
      </Alert>
    );
  }

  // No match found
  if (!matchedArchetype || !archetypeDetails) {
    return (
      <Alert variant="light" color="yellow" icon={<IconInfoCircle size={16} />}>
        <Text size="sm">
          No archetype matches your current selections. Please adjust your
          country, building type, or construction period.
        </Text>
      </Alert>
    );
  }

  // Show matched archetype
  return (
    <ArchetypeSummary
      details={archetypeDetails}
      isSelected={isCurrentSelectionValid ?? false}
      onSelect={handleSelect}
    />
  );
}
