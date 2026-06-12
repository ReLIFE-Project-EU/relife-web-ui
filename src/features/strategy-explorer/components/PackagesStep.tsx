import {
  Badge,
  Box,
  Card,
  Checkbox,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { StepNavigation } from "../../../components/shared/StepNavigation";
import { RSE_PACKAGE_IDS } from "../constants";
import {
  useRSEPackages,
  useStrategyExplorer,
} from "../hooks/useStrategyExplorer";
import { useRSEWorkflow } from "../hooks/useRSEWorkflow";
import { RSE_PACKAGES } from "../services/rsePackageCatalog";
import type { RSEPackageId } from "../types";
import { RSE_MEASURE_LABELS } from "./results/rseResultsVm";
import classes from "./StrategySteps.module.css";

export function PackagesStep() {
  const { state, dispatch } = useStrategyExplorer();
  const selectedPackages = useRSEPackages();
  const { run, isRunning } = useRSEWorkflow();

  const togglePackage = (packageId: RSEPackageId) => {
    const ids = selectedPackages.includes(packageId)
      ? selectedPackages.filter((id) => id !== packageId)
      : [...selectedPackages, packageId];
    dispatch({ type: "SET_PACKAGES", packageIds: ids });
  };

  const handlePrevious = () => {
    dispatch({ type: "SET_STEP", step: 1 });
  };

  const handleRunAnalysis = async () => {
    await run();
    if (!state.error) {
      dispatch({ type: "SET_STEP", step: 3 });
    }
  };

  return (
    <Stack gap="xl">
      <Box>
        <Title order={2} mb="xs">
          Renovation Packages
        </Title>
        <Text c="dimmed" size="sm">
          Select the packages to compare across your portfolio. They are
          compared head-to-head in the results.
        </Text>
      </Box>

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        {RSE_PACKAGE_IDS.map((packageId) => {
          const pkg = RSE_PACKAGES[packageId];
          const isSelected = selectedPackages.includes(packageId);

          return (
            <UnstyledButton
              key={packageId}
              onClick={() => togglePackage(packageId)}
              w="100%"
            >
              <Card
                withBorder
                radius="md"
                p="md"
                className={`${classes.selectCard} ${isSelected ? classes.on : ""}`}
              >
                <Group justify="space-between" align="center">
                  <Text fw={600}>{pkg.label}</Text>
                  <Checkbox
                    checked={isSelected}
                    onChange={() => togglePackage(packageId)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </Group>
                <Group gap={4} mt="sm">
                  {pkg.measureIds.map((measureId) => (
                    <Badge
                      key={measureId}
                      variant="light"
                      color="gray"
                      radius="sm"
                      size="sm"
                      tt="none"
                      fw={500}
                    >
                      {RSE_MEASURE_LABELS[measureId]}
                    </Badge>
                  ))}
                </Group>
              </Card>
            </UnstyledButton>
          );
        })}
      </SimpleGrid>

      <StepNavigation
        currentStep={2}
        totalSteps={4}
        onPrevious={handlePrevious}
        previousLabel="Back to goal"
        onPrimaryAction={handleRunAnalysis}
        primaryActionLabel="Run Analysis"
        isLoading={isRunning}
        primaryDisabled={selectedPackages.length === 0}
      />
    </Stack>
  );
}
