import { Container, Stack, Tabs, Text, Title } from "@mantine/core";
import {
  IconBolt,
  IconCoins,
  IconLeaf,
  IconPlant2,
  IconUsers,
} from "@tabler/icons-react";
import { EECalculator } from "../features/technical/components/EECalculator";
import { FVCalculator } from "../features/technical/components/FVCalculator";
import { REICalculator } from "../features/technical/components/REICalculator";
import { SEICalculator } from "../features/technical/components/SEICalculator";
import { UCCalculator } from "../features/technical/components/UCCalculator";

export const TechnicalAnalysis = () => {
  return (
    <Container size="xl">
      <Stack gap="lg">
        <div>
          <Title order={1}>Technical Analysis</Title>
          <Text size="lg" c="dimmed">
            Evaluate project technical performance using advanced indicators.
          </Text>
        </div>

        <Tabs defaultValue="ee" keepMounted={false}>
          <Tabs.List>
            <Tabs.Tab value="ee" leftSection={<IconBolt size={14} />}>
              Energy Efficiency (EE)
            </Tabs.Tab>
            <Tabs.Tab value="rei" leftSection={<IconLeaf size={14} />}>
              Renewable Energy Index (REI)
            </Tabs.Tab>
            <Tabs.Tab value="sei" leftSection={<IconPlant2 size={14} />}>
              Sustainability Environmental Index (SEI)
            </Tabs.Tab>
            <Tabs.Tab value="uc" leftSection={<IconUsers size={14} />}>
              User Comfort (UC)
            </Tabs.Tab>
            <Tabs.Tab value="fv" leftSection={<IconCoins size={14} />}>
              Financial Viability (FV)
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="ee" pt="md">
            <EECalculator />
          </Tabs.Panel>

          <Tabs.Panel value="rei" pt="md">
            <REICalculator />
          </Tabs.Panel>

          <Tabs.Panel value="sei" pt="md">
            <SEICalculator />
          </Tabs.Panel>

          <Tabs.Panel value="uc" pt="md">
            <UCCalculator />
          </Tabs.Panel>

          <Tabs.Panel value="fv" pt="md">
            <FVCalculator />
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
};
