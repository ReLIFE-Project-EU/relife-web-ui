import {
  Badge,
  Box,
  Group,
  Pill,
  Stack,
  Text,
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
  showSummary?: boolean;
}

export function MeasureEffectSummary({
  measureId,
  compact = false,
  showSummary = !compact,
}: MeasureEffectSummaryProps) {
  const profile = measureEffectProfiles[measureId];
  const statements = [...profile.affects, ...profile.doesNotAffect];

  return (
    <Stack gap="xs">
      {showSummary ? (
        <Text size="xs" c="dimmed">
          {profile.summary}
        </Text>
      ) : null}
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
    <Pill
      size="sm"
      styles={{
        label: {
          display: "inline-flex",
          alignItems: "center",
          height: "100%",
          lineHeight: 1,
        },
      }}
    >
      <Group gap={4} wrap="nowrap" align="center" style={{ height: "100%" }}>
        <Box
          component="span"
          c={`${style.color}.6`}
          bg={`${style.color}.0`}
          style={{
            alignItems: "center",
            borderRadius: "50%",
            display: "inline-flex",
            flexShrink: 0,
            height: 14,
            justifyContent: "center",
            width: 14,
          }}
        >
          <Icon size={10} />
        </Box>
        <Text span size="xs" style={{ lineHeight: 1 }}>
          {statement.label}
        </Text>
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
