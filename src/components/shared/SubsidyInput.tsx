/**
 * Upfront subsidy input: the optional modifier that reduces CAPEX before the
 * financing type is applied. Accepts either a share of the renovation cost or
 * a fixed amount.
 *
 * Shared by HRA and PRA, so it is fully controlled — no tool context inside.
 * Both values are kept in state so switching mode does not discard the other
 * entry.
 */

import {
  Badge,
  Card,
  Group,
  NumberInput,
  SegmentedControl,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import { IconGift } from "@tabler/icons-react";
import { relifeConcepts } from "../../constants/relifeConcepts";
import type { IncentiveDetails, IncentiveMode } from "../../types/renovation";
import { browserNumberSeparators } from "../../utils/formatters";
import { ConceptExplainer } from "./ConceptExplainer";

const subsidy = relifeConcepts["upfront-subsidy"];

interface SubsidyInputProps {
  incentives: IncentiveDetails;
  onChange: (incentives: IncentiveDetails) => void;
  /** Clarifies what a fixed amount is applied to (a package, a building, …). */
  amountHelperText?: string;
}

export function SubsidyInput({
  incentives,
  onChange,
  amountHelperText,
}: SubsidyInputProps) {
  return (
    <Card withBorder radius="md" p="md" bg="gray.0">
      <Stack gap="md">
        <Group justify="space-between" align="flex-start" gap="sm">
          <Group gap="sm" align="flex-start">
            <ThemeIcon color="grape" variant="light" size="lg" radius="xl">
              <IconGift size={16} />
            </ThemeIcon>
            <div>
              <Text size="sm" fw={600}>
                {subsidy.label} <ConceptExplainer conceptId="upfront-subsidy" />
              </Text>
              <Text size="xs" c="dimmed">
                {subsidy.description}
              </Text>
            </div>
          </Group>
          <Badge variant="light" color="gray">
            Optional
          </Badge>
        </Group>

        <SegmentedControl
          size="xs"
          value={incentives.mode}
          onChange={(mode) =>
            onChange({ ...incentives, mode: mode as IncentiveMode })
          }
          data={[
            { value: "percentage", label: "Percentage" },
            { value: "amount", label: "Fixed amount" },
          ]}
        />

        {incentives.mode === "percentage" ? (
          <NumberInput
            label="Share of the renovation cost"
            value={incentives.upfrontPercentage}
            onChange={(value) =>
              onChange({
                ...incentives,
                upfrontPercentage: typeof value === "number" ? value : 0,
              })
            }
            suffix="%"
            min={0}
            max={100}
            step={1}
            clampBehavior="strict"
            size="sm"
            {...browserNumberSeparators}
          />
        ) : (
          <NumberInput
            label="Fixed amount"
            description={amountHelperText}
            value={incentives.upfrontAmount}
            onChange={(value) =>
              onChange({
                ...incentives,
                upfrontAmount: typeof value === "number" ? value : 0,
              })
            }
            prefix="€ "
            min={0}
            step={500}
            size="sm"
            {...browserNumberSeparators}
          />
        )}
      </Stack>
    </Card>
  );
}
