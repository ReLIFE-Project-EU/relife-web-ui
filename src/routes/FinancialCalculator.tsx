import { Container, Stack, Tabs, Text, Title } from "@mantine/core";
import { IconChartBar, IconHome2 } from "@tabler/icons-react";
import { ARVCalculator } from "../features/financial/components/ARVCalculator";
import { RiskAssessmentCalculator } from "../features/financial/components/RiskAssessmentCalculator";

// ============================================================================
// Main Page Component
// ============================================================================

export const FinancialCalculator = () => {
  return (
    <Container size="xl">
      <Stack gap="lg">
        <div>
          <Title order={1}>Financial Calculator</Title>
          <Text size="lg" c="dimmed">
            Evaluate project feasibility using Monte Carlo risk assessment and
            property valuation.
          </Text>
        </div>

        <Tabs defaultValue="risk-assessment" keepMounted={false}>
          <Tabs.List>
            <Tabs.Tab
              value="risk-assessment"
              leftSection={<IconChartBar size={14} />}
            >
              Risk Assessment
            </Tabs.Tab>
            <Tabs.Tab value="arv" leftSection={<IconHome2 size={14} />}>
              Property Valuation (ARV)
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="risk-assessment" pt="md">
            <RiskAssessmentCalculator />
          </Tabs.Panel>

          <Tabs.Panel value="arv" pt="md">
            <ARVCalculator />
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
};
