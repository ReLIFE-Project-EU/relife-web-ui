import { Container, Stack, Tabs, Text, Title } from "@mantine/core";
import {
  IconCash,
  IconChartLine,
  IconPercentage,
  IconReceipt,
  IconTrendingUp,
} from "@tabler/icons-react";
import { IICalculator } from "../features/financial/components/IICalculator";
import { IRRCalculator } from "../features/financial/components/IRRCalculator";
import { NPVCalculator } from "../features/financial/components/NPVCalculator";
import { OPEXCalculator } from "../features/financial/components/OPEXCalculator";
import { ROICalculator } from "../features/financial/components/ROICalculator";

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
            Evaluate project feasibility using standard financial metrics.
          </Text>
        </div>

        <Tabs defaultValue="npv" keepMounted={false}>
          <Tabs.List>
            <Tabs.Tab value="npv" leftSection={<IconChartLine size={14} />}>
              Net Present Value (NPV)
            </Tabs.Tab>
            <Tabs.Tab value="ii" leftSection={<IconCash size={14} />}>
              Initial Investment (II)
            </Tabs.Tab>
            <Tabs.Tab value="opex" leftSection={<IconReceipt size={14} />}>
              Operational Expenses (OPEX)
            </Tabs.Tab>
            <Tabs.Tab value="roi" leftSection={<IconPercentage size={14} />}>
              Return on Investment (ROI)
            </Tabs.Tab>
            <Tabs.Tab value="irr" leftSection={<IconTrendingUp size={14} />}>
              Internal Rate of Return (IRR)
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="npv" pt="md">
            <NPVCalculator />
          </Tabs.Panel>

          <Tabs.Panel value="ii" pt="md">
            <IICalculator />
          </Tabs.Panel>

          <Tabs.Panel value="opex" pt="md">
            <OPEXCalculator />
          </Tabs.Panel>

          <Tabs.Panel value="roi" pt="md">
            <ROICalculator />
          </Tabs.Panel>

          <Tabs.Panel value="irr" pt="md">
            <IRRCalculator />
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
};
