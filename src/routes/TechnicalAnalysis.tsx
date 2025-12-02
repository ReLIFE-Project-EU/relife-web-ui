import {
  Container,
  Group,
  SegmentedControl,
  Stack,
  Tabs,
  Text,
  Title,
} from "@mantine/core";
import {
  IconArmchair,
  IconBolt,
  IconCoins,
  IconLeaf,
  IconPlant2,
  IconUsers,
} from "@tabler/icons-react";
import { useState } from "react";
import { EECalculator } from "../features/technical/components/EECalculator";
import { FVCalculator } from "../features/technical/components/FVCalculator";
import { REICalculator } from "../features/technical/components/REICalculator";
import { SEICalculator } from "../features/technical/components/SEICalculator";
import { UCCalculator } from "../features/technical/components/UCCalculator";
import { DEFAULT_PROFILE } from "../features/technical/utils";

export const TechnicalAnalysis = () => {
  const [profile, setProfile] = useState<string>(DEFAULT_PROFILE);

  return (
    <Container size="xl">
      <Stack gap="lg">
        <div>
          <Title order={1}>Technical Analysis</Title>
          <Text size="lg" c="dimmed">
            Evaluate project technical performance using advanced indicators.
          </Text>
        </div>

        <Stack gap="xs">
          <Text size="sm" fw={500}>
            Optimization Profile
          </Text>
          <SegmentedControl
            value={profile}
            onChange={setProfile}
            data={[
              {
                value: "Environment-Oriented",
                label: (
                  <Group gap={8} wrap="nowrap" justify="center">
                    <IconLeaf size={16} />
                    <span>Environment</span>
                  </Group>
                ),
              },
              {
                value: "Comfort-Oriented",
                label: (
                  <Group gap={8} wrap="nowrap" justify="center">
                    <IconArmchair size={16} />
                    <span>Comfort</span>
                  </Group>
                ),
              },
              {
                value: "Financally-Oriented",
                label: (
                  <Group gap={8} wrap="nowrap" justify="center">
                    <IconCoins size={16} />
                    <span>Financial</span>
                  </Group>
                ),
              },
            ]}
            fullWidth
          />
          <Text size="xs" c="dimmed">
            Select the weighting profile for all calculations. This profile will
            be applied consistently across all technical indicators.
          </Text>
        </Stack>

        <Tabs defaultValue="ee" keepMounted={true}>
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
            <EECalculator profile={profile} />
          </Tabs.Panel>

          <Tabs.Panel value="rei" pt="md">
            <REICalculator profile={profile} />
          </Tabs.Panel>

          <Tabs.Panel value="sei" pt="md">
            <SEICalculator profile={profile} />
          </Tabs.Panel>

          <Tabs.Panel value="uc" pt="md">
            <UCCalculator profile={profile} />
          </Tabs.Panel>

          <Tabs.Panel value="fv" pt="md">
            <FVCalculator profile={profile} />
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
};
