/**
 * BuildingInfoStep Component
 * Screen 1: Collects building information and triggers EPC estimation.
 */

import {
  Box,
  Card,
  Divider,
  Stack,
  Text,
  Timeline,
  Title,
} from "@mantine/core";
import {
  IconBuildingCommunity,
  IconHome,
  IconMapPin,
  IconSearch,
  IconSettings,
} from "@tabler/icons-react";
import { useHomeAssistant } from "../../hooks/useHomeAssistant";
import { useHomeAssistantServices } from "../../hooks/useHomeAssistantServices";
import { ErrorAlert, SectionHeader, StepNavigation } from "../shared";
import {
  ArchetypeSelector,
  BuildingTypeInputs,
  LocationInputs,
} from "../building";

export function BuildingInfoStep() {
  const { state, dispatch } = useHomeAssistant();
  const { energy } = useHomeAssistantServices();
  const hasSimulationAdjustments =
    state.building.isModified && state.building.modifications;

  // Validation - only require archetype selection fields
  const isValid =
    state.building.lat !== null &&
    state.building.lng !== null &&
    state.building.buildingType &&
    state.building.constructionPeriod &&
    state.building.selectedArchetype !== undefined;

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

  return (
    <Stack gap="xl">
      {/* Header */}
      <Box>
        <Title order={2} mb="xs">
          Provide Building Information
        </Title>
        <Text c="dimmed" size="sm">
          Enter details about your building to estimate its current energy
          performance.
        </Text>
      </Box>

      {/* Workflow info card */}
      <Card
        withBorder
        radius="md"
        p="lg"
        bg="var(--mantine-color-default-hover)"
      >
        <Text
          size="sm"
          fw={600}
          c="dimmed"
          tt="uppercase"
          style={{ letterSpacing: "0.05em" }}
          mb="md"
        >
          How this works
        </Text>
        <Timeline color="relife" active={-1} bulletSize={32} lineWidth={2}>
          <Timeline.Item
            bullet={<IconSearch size={16} stroke={1.75} />}
            title={
              <Text size="sm" fw={600}>
                Find your archetype
              </Text>
            }
          >
            <Text size="xs" c="dimmed" mt={4}>
              Enter your building's location, type, and construction period to
              find a matching reference archetype from the European building
              stock database.
            </Text>
          </Timeline.Item>
          <Timeline.Item
            bullet={<IconSettings size={16} stroke={1.75} />}
            title={
              <Text size="sm" fw={600}>
                Review and refine
              </Text>
            }
          >
            <Text size="xs" c="dimmed" mt={4}>
              Review and select the matched archetype, then optionally adjust
              parameters to better reflect your building's actual
              characteristics.
            </Text>
          </Timeline.Item>
        </Timeline>
      </Card>

      {/* Location Section */}
      <Box>
        <SectionHeader
          icon={
            <IconMapPin
              size={18}
              stroke={1.5}
              color="var(--mantine-color-dimmed)"
            />
          }
          label="Location"
        />
        <LocationInputs />
      </Box>

      <Divider />

      {/* Building Details Section */}
      <Box>
        <SectionHeader
          icon={
            <IconHome
              size={18}
              stroke={1.5}
              color="var(--mantine-color-dimmed)"
            />
          }
          label="Building Details"
        />
        <BuildingTypeInputs />
      </Box>

      <Divider />

      {/* Archetype Selection Section */}
      <Box>
        <SectionHeader
          icon={
            <IconBuildingCommunity
              size={18}
              stroke={1.5}
              color="var(--mantine-color-dimmed)"
            />
          }
          label="Building Archetype"
        />
        <ArchetypeSelector />
      </Box>

      {/* Error display */}
      <ErrorAlert error={state.error} title="Estimation Error" />

      {/* Navigation */}
      <StepNavigation
        currentStep={0}
        totalSteps={3}
        onPrimaryAction={handleEstimateEPC}
        primaryActionLabel={
          hasSimulationAdjustments
            ? "Estimate EPC for adjusted home"
            : "Estimate EPC"
        }
        isLoading={state.isEstimating}
        primaryDisabled={!isValid}
      />
    </Stack>
  );
}
