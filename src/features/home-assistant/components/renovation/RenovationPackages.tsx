/**
 * RenovationPackages Component
 * Displays the three renovation packages in a grid.
 */

import { Alert, Box, SimpleGrid, Text, Title } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { useHomeAssistantServices } from "../../hooks/useHomeAssistantServices";
import { PackageCard } from "./PackageCard";

export function RenovationPackages() {
  const { renovation } = useHomeAssistantServices();
  const packages = renovation.getPackages();

  return (
    <Box>
      <Title order={4} mb="xs">
        Renovation Packages
      </Title>
      <Text size="sm" c="dimmed" mb="md">
        Select one or more renovation packages to compare
      </Text>

      <Alert
        variant="light"
        color="blue"
        icon={<IconInfoCircle size={16} />}
        mb="lg"
      >
        Each package includes pre-validated renovation measures. You can
        customize the included measures and adjust the estimated cost.
      </Alert>

      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
        {packages.map((pkg) => (
          <PackageCard key={pkg.id} package={pkg} />
        ))}
      </SimpleGrid>
    </Box>
  );
}
