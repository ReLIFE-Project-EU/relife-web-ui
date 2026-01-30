/**
 * BuildingInfoStep Component
 * Screen 1: Collects building information and triggers EPC estimation.
 */

import { Alert, Box, Divider, Stack, Text, Title } from "@mantine/core";
import {
  IconBuildingCommunity,
  IconHome,
  IconInfoCircle,
  IconMapPin,
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

      {/* Workflow info alert */}
      <Alert variant="light" color="blue" icon={<IconInfoCircle size={16} />}>
        <Text size="sm" fw={500} mb={4}>
          How this works:
        </Text>
        <Text size="sm">
          <strong>Step 1:</strong> Enter your building's location, type, and
          construction period to find a matching archetype.
          <br />
          <strong>Step 2:</strong> Review and select the matched archetype, then
          optionally modify parameters to better match your building.
        </Text>
      </Alert>

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
        primaryActionLabel="Estimate EPC"
        isLoading={state.isEstimating}
        primaryDisabled={!isValid}
      />
    </Stack>
  );
}
