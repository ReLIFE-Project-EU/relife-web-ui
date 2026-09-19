import { ActionIcon, Box, Group, Popover, Stack, Text } from "@mantine/core";
import {
  IconArrowRight,
  IconHeartbeat,
  IconInfoCircle,
} from "@tabler/icons-react";
import { relifeConcepts } from "../../../../constants/relifeConcepts";
import type { RenovationScenario } from "../../context/types";
import { formatFixed } from "../../utils/formatters";
import shared from "../../../../components/shared/ResultsLayout.module.css";

const DAYS_PER_DALY = 365;
const ABSOLUTE_DECIMALS = 2;
const CHANGE_DECIMALS = 1;

interface ThermalHealthCardProps {
  current: RenovationScenario;
  selected: RenovationScenario;
}

interface HealthChange {
  direction: "fall" | "rise";
  effect: "fewer" | "more";
  magnitude: string;
  color: "green.8" | "red.8";
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
  const interpretation = getInterpretation(
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
        <Popover width={400} position="top-start" withArrow shadow="md">
          <Popover.Target>
            <ActionIcon
              aria-label={`Explain ${concept.label}`}
              color="gray"
              size="xs"
              variant="subtle"
            >
              <IconInfoCircle size={13} />
            </ActionIcon>
          </Popover.Target>
          <Popover.Dropdown
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
          </Popover.Dropdown>
        </Popover>
      </div>

      <Group align="center" gap="md" wrap="nowrap">
        <HealthValue label="Today" value={formatAbsoluteDays(todayDays)} />
        <IconArrowRight
          aria-hidden
          color="var(--mantine-color-gray-5)"
          size={18}
        />
        <HealthValue label="After" value={formatAbsoluteDays(afterDays)} />
      </Group>

      {avoidedDays !== undefined ? (
        <Text c={healthChange?.color ?? "dimmed"} fw={600} mt="sm" size="sm">
          {formatChange(avoidedDays, healthChange)}
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

function toHealthyLifeDays(daly: number | undefined): number | undefined {
  return daly === undefined ? undefined : daly * DAYS_PER_DALY;
}

function formatAbsoluteDays(value: number | undefined): string {
  if (value === undefined) return "Unavailable";
  if (value === 0) return "0.00 days lost";
  if (Math.abs(value) < 0.005) return "<0.01 days lost";
  return `≈${formatFixed(value, ABSOLUTE_DECIMALS)} days lost`;
}

function formatNumberForSentence(value: number, decimals: number): string {
  const threshold = 10 ** -decimals;
  if (value !== 0 && Math.abs(value) < threshold / 2) {
    return `<${formatFixed(threshold, decimals)}`;
  }
  return formatFixed(Math.abs(value), decimals);
}

function getHealthChange(
  avoidedDays: number | undefined,
): HealthChange | undefined {
  if (avoidedDays === undefined || avoidedDays === 0) return undefined;
  const isImprovement = avoidedDays > 0;
  return {
    direction: isImprovement ? "fall" : "rise",
    effect: isImprovement ? "fewer" : "more",
    magnitude: formatNumberForSentence(avoidedDays, CHANGE_DECIMALS),
    color: isImprovement ? "green.8" : "red.8",
  };
}

function formatChange(
  avoidedDays: number | undefined,
  change: HealthChange | undefined,
): string {
  if (avoidedDays === undefined) return "Unavailable";
  if (avoidedDays === 0) return "No modeled change";
  const approximation = change?.magnitude.startsWith("<") ? "" : "≈";
  return `${approximation}${change?.magnitude} ${change?.effect} days lost per person/year`;
}

function getInterpretation(
  todayDays: number | undefined,
  afterDays: number | undefined,
  avoidedDays: number | undefined,
  change: HealthChange | undefined,
): string | undefined {
  if (
    todayDays === undefined ||
    afterDays === undefined ||
    avoidedDays === undefined
  ) {
    return undefined;
  }
  if (avoidedDays === 0) {
    return "We show the result as days. The before-and-after values are the same, so there is no modeled change in healthy-life days lost per person over a year.";
  }
  return `We show the result as days. A ${change?.direction} from ${formatNumberForSentence(todayDays, ABSOLUTE_DECIMALS)} to ${formatNumberForSentence(afterDays, ABSOLUTE_DECIMALS)} means ${change?.magnitude} ${change?.effect} healthy-life days lost per person over a year.`;
}
