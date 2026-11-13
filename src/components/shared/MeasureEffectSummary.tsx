import { Box, Group, Pill, Text, type MantineColor } from "@mantine/core";
import {
  IconArrowDown,
  IconBolt,
  IconCircleMinus,
  IconInfoCircle,
  IconSolarPanel,
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
  "indirectly-lowers": { color: "green", icon: IconBolt },
  "does-not-lower": { color: "gray", icon: IconCircleMinus },
  generates: { color: "yellow", icon: IconSolarPanel },
  "reduces-grid-use": { color: "blue", icon: IconBolt },
  excluded: { color: "orange", icon: IconInfoCircle },
  "not-analyzed": { color: "gray", icon: IconInfoCircle },
};

interface MeasureEffectSummaryProps {
  measureId: RenovationMeasureId;
}

export function MeasureEffectSummary({ measureId }: MeasureEffectSummaryProps) {
  const profile = measureEffectProfiles[measureId];
  const statements = [...profile.affects, ...profile.doesNotAffect];

  return (
    <Pill.Group>
      {statements.map((statement) => (
        <EffectPill
          key={`${statement.kind}-${statement.label}`}
          statement={statement}
        />
      ))}
    </Pill.Group>
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
