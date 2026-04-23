import {
  Badge,
  Group,
  Pill,
  Stack,
  Text,
  ThemeIcon,
  type MantineColor,
} from "@mantine/core";
import {
  IconArrowDown,
  IconBolt,
  IconCircleMinus,
  IconInfoCircle,
  IconSolarPanel,
  IconTrendingUp,
} from "@tabler/icons-react";
import type {
  MeasureEffectKind,
  MeasureEffectStatement,
} from "../../constants/relifeConcepts";
import { measureEffectProfiles } from "../../constants/relifeConcepts";
import type { RenovationMeasureId } from "../../types/renovation";

const effectStyle: Record<
  MeasureEffectKind,
  {
    color: MantineColor;
    icon: typeof IconArrowDown;
  }
> = {
  lowers: { color: "green", icon: IconArrowDown },
  "may-improve": { color: "teal", icon: IconTrendingUp },
  "indirectly-lowers": { color: "green", icon: IconBolt },
  "does-not-lower": { color: "gray", icon: IconCircleMinus },
  generates: { color: "yellow", icon: IconSolarPanel },
  "reduces-grid-use": { color: "blue", icon: IconBolt },
  excluded: { color: "orange", icon: IconInfoCircle },
  "not-analyzed": { color: "gray", icon: IconInfoCircle },
};

interface MeasureEffectSummaryProps {
  measureId: RenovationMeasureId;
  compact?: boolean;
}

export function MeasureEffectSummary({
  measureId,
  compact = false,
}: MeasureEffectSummaryProps) {
  const profile = measureEffectProfiles[measureId];
  const statements = [...profile.affects, ...profile.doesNotAffect];

  return (
    <Stack gap="xs">
      <Text size="xs" c="dimmed">
        {profile.summary}
      </Text>
      <Pill.Group>
        {statements.map((statement) => (
          <EffectPill
            key={`${statement.kind}-${statement.label}`}
            statement={statement}
          />
        ))}
      </Pill.Group>
      {!compact && profile.caveat ? (
        <Text size="xs" c="dimmed">
          {profile.caveat}
        </Text>
      ) : null}
    </Stack>
  );
}

function EffectPill({ statement }: { statement: MeasureEffectStatement }) {
  const style = effectStyle[statement.kind];
  const Icon = style.icon;

  return (
    <Pill size="sm">
      <Group gap={4} wrap="nowrap">
        <ThemeIcon size={14} radius="xl" color={style.color} variant="light">
          <Icon size={10} />
        </ThemeIcon>
        <Text size="xs">{statement.label}</Text>
      </Group>
    </Pill>
  );
}

export function MeasureEffectBadges({
  measureIds,
}: {
  measureIds: RenovationMeasureId[];
}) {
  return (
    <Group gap="xs">
      {measureIds.map((measureId) => (
        <Badge key={measureId} variant="light" color="gray">
          {measureEffectProfiles[measureId].summary}
        </Badge>
      ))}
    </Group>
  );
}
