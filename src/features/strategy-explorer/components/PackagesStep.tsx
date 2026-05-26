import {
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
          Select the packages to compare across your portfolio.
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
                bg={isSelected ? "blue.0" : "white"}
                style={{
                  borderColor: isSelected
                    ? "var(--mantine-color-blue-7)"
                    : undefined,
                  borderWidth: isSelected ? 2 : 1,
                }}
              >
                <Group justify="space-between" align="center">
                  <Text fw={600}>{pkg.label}</Text>
                  <Checkbox
                    checked={isSelected}
                    onChange={() => togglePackage(packageId)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </Group>
                <Text size="sm" c="dimmed" mt={4}>
                  {pkg.measureIds.length} measures
                </Text>
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
