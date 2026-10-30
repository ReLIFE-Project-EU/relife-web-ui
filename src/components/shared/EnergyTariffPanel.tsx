import { useState } from "react";
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
import { FINANCIAL_ELECTRICITY_REFERENCE_EUR_PER_KWH } from "../../services/carrierSavingsService";
import {
  gasTariffDescription,
  type GasTariff,
} from "../../services/gasTariffService";
import { relifeConcepts } from "../../constants/relifeConcepts";
import {
  browserNumberSeparators,
  formatDecimal,
  formatFixed,
} from "../../utils/formatters";

const electricityDisplayValue = `${formatDecimal(FINANCIAL_ELECTRICITY_REFERENCE_EUR_PER_KWH)} €/kWh`;

interface EnergyTariffPanelProps {
  gasTariff: GasTariff;
  onApplyGasTariff: (value: number) => void | Promise<void>;
  onResetGasTariff: () => void | Promise<void>;
  isApplying?: boolean;
  canApply?: boolean;
  applyLabel?: string;
  applyingLabel?: string;
}

export function EnergyTariffPanel(props: EnergyTariffPanelProps) {
  const { gasTariff } = props;
  return (
    <EnergyTariffForm
      key={`${gasTariff.eurPerKwh}:${gasTariff.reference.eurPerKwh}:${gasTariff.isUserValue}`}
      {...props}
    />
  );
}

function EnergyTariffForm({
  gasTariff,
  onApplyGasTariff,
  onResetGasTariff,
  isApplying = false,
  canApply = true,
  applyLabel = "Apply tariff",
  applyingLabel = "Applying tariff...",
}: EnergyTariffPanelProps) {
  const appliedGasTariff = gasTariff.eurPerKwh;
  const referenceGasTariff = gasTariff.reference.eurPerKwh;
  const isUserValue = gasTariff.isUserValue;
  // Null follows the reference; an empty string is an incomplete user value.
  const [draftGasTariff, setDraftGasTariff] = useState<number | "" | null>(
    isUserValue ? appliedGasTariff : null,
  );
  const draftUsesReference = draftGasTariff === null;
  const draftValue =
    draftGasTariff === "" ? null : (draftGasTariff ?? referenceGasTariff);
  const isDirty =
    draftValue !== null &&
    (Math.abs(draftValue - appliedGasTariff) > 0.000_001 ||
      draftUsesReference === isUserValue);
  const isDisabled = isApplying || gasTariff.isLoading;
  const canSubmit =
    isDirty && draftValue !== null && draftValue > 0 && !isDisabled && canApply;

  const statusBadge = (
    <Badge
      variant="light"
      color={isDisabled ? "blue" : isDirty ? "yellow" : "gray"}
    >
      {gasTariff.isLoading
        ? "Loading"
        : isApplying
          ? "Updating"
          : isDirty
            ? "Unsaved changes"
            : "Applied"}
    </Badge>
  );

  const statusText = gasTariff.isLoading
    ? "Loading Eurostat reference gas price..."
    : isApplying
      ? applyingLabel
      : isDirty
        ? `Draft gas tariff: ${formatFixed(draftValue ?? 0, 5)} €/kWh. Applied: ${formatFixed(appliedGasTariff, 5)} €/kWh.`
        : `Gas tariff applied: ${formatFixed(appliedGasTariff, 5)} €/kWh.`;

  const handleApply = async () => {
    if (draftValue === null || draftValue <= 0) {
      return;
    }

    await (draftUsesReference
      ? onResetGasTariff()
      : onApplyGasTariff(draftValue));
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
            label={relifeConcepts["gas-tariff"].label}
            description={gasTariffDescription(gasTariff)}
            value={draftGasTariff ?? referenceGasTariff}
            onChange={(value) =>
              setDraftGasTariff(typeof value === "number" ? value : "")
            }
            min={0.001}
            max={1}
            step={0.001}
            decimalScale={5}
            fixedDecimalScale={false}
            suffix=" €/kWh"
            leftSection={<IconFlame size={16} />}
            size="sm"
            disabled={isDisabled}
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
            {!draftUsesReference ? (
              <Button
                variant="subtle"
                size="sm"
                onClick={() => setDraftGasTariff(null)}
                disabled={isDisabled}
              >
                {gasTariff.reference.source === "eurostat"
                  ? "Reset to Eurostat price"
                  : "Reset to default"}
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
