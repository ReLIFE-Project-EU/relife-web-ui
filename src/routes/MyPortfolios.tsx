/**
 * My Portfolios page - User's personal portfolio management.
 * Accessible via user menu dropdown.
 */

import { Container, Stack, Text, Title } from "@mantine/core";
import { IconFolder } from "@tabler/icons-react";
import {
  PortfolioManager,
  PortfolioProvider,
} from "../features/portfolio-manager";

export const MyPortfolios = () => {
  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        {/* Page Header */}
        <Stack gap="xs">
          <Title order={1}>
            <IconFolder
              size={32}
              style={{ marginRight: 12, verticalAlign: "middle" }}
            />
            My Portfolios
          </Title>
          <Text c="dimmed" size="lg" maw={700}>
            Manage your building data portfolios. Upload CSV, Excel, or JSON
            files and organize them into portfolios for analysis.
          </Text>
        </Stack>

        {/* Portfolio Manager */}
        <PortfolioProvider>
          <PortfolioManager />
        </PortfolioProvider>
      </Stack>
    </Container>
  );
};
