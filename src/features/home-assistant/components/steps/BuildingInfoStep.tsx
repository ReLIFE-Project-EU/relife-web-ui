/**
 * BuildingInfoStep Component
 * Screen 1: Collects building information and triggers EPC estimation.
 */

import { Alert, Box, Divider, Stack, Text, Title } from "@mantine/core";
import {
  IconHome,
  IconInfoCircle,
  IconMapPin,
  IconSettings,
  IconWindow,
} from "@tabler/icons-react";
import { useHomeAssistant } from "../../hooks/useHomeAssistant";
import { useHomeAssistantServices } from "../../hooks/useHomeAssistantServices";
import { ErrorAlert, SectionHeader, StepNavigation } from "../shared";
import {
  BuildingTypeInputs,
  LocationInputs,
  OpeningsInputs,
  SystemInputs,
} from "../building";

export function BuildingInfoStep() {
  const { state, dispatch } = useHomeAssistant();
  const { energy } = useHomeAssistantServices();

  // Validation
  const isValid =
    state.building.country &&
    state.building.climateZone &&
    state.building.buildingType &&
    state.building.floorArea !== null &&
    state.building.floorArea > 0 &&
    state.building.constructionPeriod &&
    state.building.heatingTechnology &&
    state.building.coolingTechnology &&
    state.building.hotWaterTechnology &&
    state.building.numberOfOpenings !== null &&
    state.building.numberOfOpenings > 0 &&
    state.building.glazingTechnology;

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

      {/* Info alert */}
      <Alert variant="light" color="blue" icon={<IconInfoCircle size={16} />}>
        Fill in the information below as accurately as possible. If you're
        unsure about some values, select the option that best matches your
        building.
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

      {/* Systems Section */}
      <Box>
        <SectionHeader
          icon={
            <IconSettings
              size={18}
              stroke={1.5}
              color="var(--mantine-color-dimmed)"
            />
          }
          label="Heating, Cooling & Hot Water Systems"
        />
        <SystemInputs />
      </Box>

      <Divider />

      {/* Openings Section */}
      <Box>
        <SectionHeader
          icon={
            <IconWindow
              size={18}
              stroke={1.5}
              color="var(--mantine-color-dimmed)"
            />
          }
          label="Windows & Openings"
        />
        <OpeningsInputs />
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
