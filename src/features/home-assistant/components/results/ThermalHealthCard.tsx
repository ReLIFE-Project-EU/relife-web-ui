import { ActionIcon, Box, Group, HoverCard, Stack, Text } from "@mantine/core";
import {
  IconArrowRight,
  IconHeartbeat,
  IconInfoCircle,
} from "@tabler/icons-react";
import { relifeConcepts } from "../../../../constants/relifeConcepts";
import type { RenovationScenario } from "../../context/types";
import {
  formatHealthyLifeDays,
  formatHealthChange,
  getHealthChange,
  getHealthInterpretation,
  toHealthyLifeDays,
} from "../../utils/formatters";
import shared from "../../../../components/shared/ResultsLayout.module.css";

interface ThermalHealthCardProps {
  current: RenovationScenario;
  selected: RenovationScenario;
}

export function ThermalHealthCard({
  current,
  selected,
}: ThermalHealthCardProps) {
  const concept = relifeConcepts["thermal-health-impact"];
  const todayDays = toHealthyLifeDays(current.annualThermalDalyPerPerson);
  const afterDays = toHealthyLifeDays(selected.annualThermalDalyPerPerson);
  const avoidedDays = toHealthyLifeDays(selected.avoidedThermalDalyPerPerson);
  const healthChange = getHealthChange(avoidedDays);
  const interpretation = getHealthInterpretation(
    todayDays,
    afterDays,
    avoidedDays,
    healthChange,
  );

  return (
    <div className={shared.miniCard} style={{ gridColumn: "1 / -1" }}>
      <div className={shared.miniLabel}>
        <IconHeartbeat color="var(--mantine-color-relife-7)" size={14} />
        {concept.label}
        <HoverCard width={400} position="top-start" withArrow shadow="md">
          <HoverCard.Target>
            <ActionIcon
              aria-label={`Explain ${concept.label}`}
              color="gray"
              size="xs"
              variant="subtle"
            >
              <IconInfoCircle size={13} />
            </ActionIcon>
          </HoverCard.Target>
          <HoverCard.Dropdown
            style={{ maxWidth: "calc(100vw - var(--mantine-spacing-xl))" }}
          >
            <Stack gap="sm">
              <Text size="sm" fw={700}>
                How to read this result
              </Text>
              <Text size="sm">{concept.description}</Text>
              <Text size="sm">{concept.professionalDetail}</Text>
              {interpretation ? <Text size="sm">{interpretation}</Text> : null}
              <Text size="sm">{concept.caveat}</Text>
            </Stack>
          </HoverCard.Dropdown>
        </HoverCard>
      </div>

      <Group align="center" gap="md" wrap="nowrap">
        <HealthValue label="Today" value={formatHealthyLifeDays(todayDays)} />
        <IconArrowRight
          aria-hidden
          color="var(--mantine-color-gray-5)"
          size={18}
        />
        <HealthValue label="After" value={formatHealthyLifeDays(afterDays)} />
      </Group>

      {avoidedDays !== undefined ? (
        <Text c={healthChange?.color ?? "dimmed"} fw={600} mt="sm" size="sm">
          {formatHealthChange(avoidedDays, healthChange)}
        </Text>
      ) : null}
    </div>
  );
}

function HealthValue({ label, value }: { label: string; value: string }) {
  return (
    <Box style={{ flex: 1, minWidth: 0 }}>
      <Text c="dimmed" size="xs">
        {label}
      </Text>
      <Text
        c="dark.9"
        fw={700}
        size="lg"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {value}
      </Text>
    </Box>
  );
}
