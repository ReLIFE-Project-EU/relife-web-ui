import {
  Card,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import type { EstimationResult } from "../../../../types/renovation";
import {
  calculatePercentChange,
  formatCurrency,
  formatEnergyPerYear,
} from "../../utils/formatters";
import { DeltaValue } from "./DeltaValue";
import { EPCBadge } from "../../../../components/shared";

export function ReferenceAdjustedComparisonCard({
  estimation,
  floorArea,
}: {
  estimation: EstimationResult;
  floorArea?: number;
}) {
  const reference = estimation.referenceEstimation;

  if (!reference) {
    return null;
  }

  const referenceIntensity =
    floorArea && floorArea > 0
      ? reference.annualEnergyNeeds / floorArea
      : undefined;

  const adjustedIntensity =
    floorArea && floorArea > 0
      ? estimation.annualEnergyNeeds / floorArea
      : undefined;

  return (
    <Card withBorder radius="md" p="lg">
      <Stack gap="lg">
        <div>
          <Title order={3} mb="xs">
            Reference vs adjusted home
          </Title>
          <Text size="sm" c="dimmed">
            Comparison between the matched archetype and the adjusted home that
            was actually simulated.
          </Text>
        </div>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <Card withBorder radius="md" p="md" bg="gray.0">
            <Stack gap="sm">
              <Text size="sm" fw={600}>
                Reference archetype
              </Text>
              <Group justify="space-between">
                <Text size="sm">Estimated EPC</Text>
                <EPCBadge
                  epcClass={reference.estimatedEPC}
                  size="md"
                  energyIntensity={referenceIntensity}
                  estimated
                />
              </Group>
              <Group justify="space-between">
                <Text size="sm">Annual HVAC energy</Text>
                <Text size="sm" fw={500}>
                  {formatEnergyPerYear(reference.annualEnergyNeeds)}
                </Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm">Annual HVAC cost</Text>
                <Text size="sm" fw={500}>
                  {formatCurrency(reference.annualEnergyCost)}
                </Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm">Comfort index</Text>
                <Text size="sm" fw={500}>
                  {reference.comfortIndex}
                </Text>
              </Group>
            </Stack>
          </Card>

          <Card withBorder radius="md" p="md" bg="blue.0">
            <Stack gap="sm">
              <Text size="sm" fw={600}>
                Adjusted home
              </Text>
              <Group justify="space-between">
                <Text size="sm">Estimated EPC</Text>
                <Group gap="xs">
                  <EPCBadge
                    epcClass={estimation.estimatedEPC}
                    size="md"
                    energyIntensity={adjustedIntensity}
                    estimated
                  />
                  <Text size="xs" c="dimmed">
                    from {reference.estimatedEPC}
                  </Text>
                </Group>
              </Group>
              <Group justify="space-between">
                <Text size="sm">Annual HVAC energy</Text>
                <DeltaValue
                  value={estimation.annualEnergyNeeds}
                  delta={calculatePercentChange(
                    reference.annualEnergyNeeds,
                    estimation.annualEnergyNeeds,
                  )}
                  formatter={formatEnergyPerYear}
                  higherIsBetter={false}
                />
              </Group>
              <Group justify="space-between">
                <Text size="sm">Annual HVAC cost</Text>
                <DeltaValue
                  value={estimation.annualEnergyCost}
                  delta={calculatePercentChange(
                    reference.annualEnergyCost,
                    estimation.annualEnergyCost,
                  )}
                  formatter={formatCurrency}
                  higherIsBetter={false}
                />
              </Group>
              <Group justify="space-between">
                <Text size="sm">Comfort index</Text>
                <DeltaValue
                  value={estimation.comfortIndex}
                  delta={calculatePercentChange(
                    reference.comfortIndex,
                    estimation.comfortIndex,
                  )}
                  higherIsBetter
                />
              </Group>
            </Stack>
          </Card>
        </SimpleGrid>

        <Text size="sm" c="dimmed">
          {
            "We started from a standard building profile similar to yours, applied your specific details, ran an energy simulation, and calculated the results shown above."
          }
        </Text>
      </Stack>
    </Card>
  );
}
