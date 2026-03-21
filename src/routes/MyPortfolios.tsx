/**
 * My Portfolios page - User's personal portfolio management.
 * Accessible via user menu dropdown.
 */

import { Container, Stack, Text, Title } from "@mantine/core";
import {
  PortfolioManager,
  PortfolioProvider,
} from "../features/portfolio-manager";

export const MyPortfolios = () => {
  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <Stack gap="md">
          <div>
            <Title order={1}>My Portfolios</Title>
          </div>
          <Text c="dimmed" size="lg" maw={760}>
            Manage your building data portfolios. Upload CSV files and organize
            them into reusable workspaces for later analysis in Portfolio
            Advisor.
          </Text>
        </Stack>

        <PortfolioProvider>
          <PortfolioManager />
        </PortfolioProvider>
      </Stack>
    </Container>
  );
};
