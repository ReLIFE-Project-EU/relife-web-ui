import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Group,
  NumberInput,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { IconBolt, IconFlame, IconLock } from "@tabler/icons-react";
import {
  ENERGY_TARIFF_DEFAULTS,
  FINANCIAL_ELECTRICITY_REFERENCE_EUR_PER_KWH,
} from "../../services/carrierSavingsService";
import { browserNumberSeparators, formatDecimal } from "../../utils/formatters";

const electricityDisplayValue = `${formatDecimal(FINANCIAL_ELECTRICITY_REFERENCE_EUR_PER_KWH)} €/kWh`;

interface EnergyTariffPanelProps {
  appliedGasTariff: number;
  onApplyGasTariff: (value: number) => void | Promise<void>;
  isApplying?: boolean;
  canApply?: boolean;
  applyLabel?: string;
  applyingLabel?: string;
}

export function EnergyTariffPanel({
  appliedGasTariff,
  onApplyGasTariff,
  isApplying = false,
  canApply = true,
  applyLabel = "Apply tariff",
  applyingLabel = "Applying tariff...",
}: EnergyTariffPanelProps) {
  const [draftGasTariff, setDraftGasTariff] = useState<number | "">(
    appliedGasTariff,
  );

  useEffect(() => {
    setDraftGasTariff(appliedGasTariff);
  }, [appliedGasTariff]);

  const draftValue = typeof draftGasTariff === "number" ? draftGasTariff : null;
  const isDirty =
    draftValue !== null && Math.abs(draftValue - appliedGasTariff) > 0.000_001;
  const isDraftAtDefault =
    draftValue !== null &&
    Math.abs(draftValue - ENERGY_TARIFF_DEFAULTS.gasEurPerKwh) < 0.000_001;
  const canSubmit =
    isDirty && draftValue !== null && draftValue > 0 && !isApplying && canApply;

  const statusBadge = isApplying ? (
    <Badge variant="light" color="blue">
      Updating
    </Badge>
  ) : isDirty ? (
    <Badge variant="light" color="yellow">
      Unsaved changes
    </Badge>
  ) : (
    <Badge variant="light" color="gray">
      Applied
    </Badge>
  );

  const statusText = isApplying
    ? applyingLabel
    : isDirty
      ? `Draft gas tariff: ${formatDecimal(draftValue ?? 0)} €/kWh. Applied: ${formatDecimal(appliedGasTariff)} €/kWh.`
      : `Gas tariff applied: ${formatDecimal(appliedGasTariff)} €/kWh.`;

  const handleApply = async () => {
    if (draftValue === null || draftValue <= 0) {
      return;
    }

    await onApplyGasTariff(draftValue);
  };

  const handleResetToDefault = () => {
    setDraftGasTariff(ENERGY_TARIFF_DEFAULTS.gasEurPerKwh);
  };

  return (
    <Card withBorder radius="md" p="lg">
      <Stack gap="md">
        <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm">
          <Group gap="sm" align="center">
            <ThemeIcon color="blue" variant="light" size="lg" radius="md">
              <IconBolt size={18} />
            </ThemeIcon>
            <div>
              <Title order={4}>Energy tariffs</Title>
              <Text size="sm" c="dimmed">
                Gas and grid electricity tariffs used to value annual savings
                for NPV, ROI, and payback.
              </Text>
            </div>
          </Group>
          {statusBadge}
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <NumberInput
            label="Natural gas tariff"
            description={ENERGY_TARIFF_DEFAULTS.gasSourceNote}
            value={draftGasTariff}
            onChange={(value) =>
              setDraftGasTariff(typeof value === "number" ? value : "")
            }
            min={0.001}
            max={1}
            step={0.001}
            decimalScale={3}
            fixedDecimalScale={false}
            suffix=" €/kWh"
            leftSection={<IconFlame size={16} />}
            size="sm"
            disabled={isApplying}
            {...browserNumberSeparators}
          />
          <TextInput
            label={
              <Group gap="xs" wrap="nowrap">
                <span>Electricity tariff</span>
                <Badge variant="light" color="blue" size="xs">
                  Financial model
                </Badge>
              </Group>
            }
            description="Fixed by the Financial service reference curve"
            value={electricityDisplayValue}
            readOnly
            variant="filled"
            leftSection={<IconBolt size={16} />}
            rightSection={<IconLock size={14} aria-hidden />}
            size="sm"
            styles={{
              input: {
                cursor: "default",
              },
            }}
          />
        </SimpleGrid>

        <Group justify="space-between" align="center" wrap="wrap" gap="sm">
          <Text size="xs" c="dimmed">
            {statusText}
          </Text>
          <Group gap="xs">
            {!isDraftAtDefault ? (
              <Button
                variant="subtle"
                size="sm"
                onClick={handleResetToDefault}
                disabled={isApplying}
              >
                Reset to default
              </Button>
            ) : null}
            <Button
              onClick={() => void handleApply()}
              loading={isApplying}
              disabled={!canSubmit}
            >
              {applyLabel}
            </Button>
          </Group>
        </Group>
      </Stack>
    </Card>
  );
}
