import { useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  NumberInput,
  SimpleGrid,
  Stack,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { IconBolt, IconFlame } from "@tabler/icons-react";
import {
  tariffDescription,
  type EnergyTariff,
  type EnergyTariffOverrides,
} from "../../services/energyTariffService";
import { ConceptLabel } from "./ConceptLabel";
import { browserNumberSeparators } from "../../utils/formatters";

interface EnergyTariffPanelProps {
  gasTariff: EnergyTariff;
  electricityTariff: EnergyTariff;
  onApplyTariffs: (tariffs: EnergyTariffOverrides) => void | Promise<void>;
  isApplying?: boolean;
  canApply?: boolean;
  applyLabel?: string;
}

export function EnergyTariffPanel(props: EnergyTariffPanelProps) {
  const { gasTariff, electricityTariff } = props;
  return (
    <EnergyTariffForm
      key={`${gasTariff.eurPerKwh}:${gasTariff.reference.eurPerKwh}:${gasTariff.isUserValue}:${electricityTariff.eurPerKwh}:${electricityTariff.isUserValue}`}
      {...props}
    />
  );
}

function EnergyTariffForm({
  gasTariff,
  electricityTariff,
  onApplyTariffs,
  isApplying = false,
  canApply = true,
  applyLabel = "Apply tariffs",
}: EnergyTariffPanelProps) {
  const [draftGas, setDraftGas] = useState<number | string | null>(
    gasTariff.isUserValue ? gasTariff.eurPerKwh : null,
  );
  const [draftElectricity, setDraftElectricity] = useState<
    number | string | null
  >(electricityTariff.isUserValue ? electricityTariff.eurPerKwh : null);
  const gasValue = draftGas ?? gasTariff.reference.eurPerKwh ?? "";
  const electricityValue =
    draftElectricity ?? electricityTariff.reference.eurPerKwh ?? "";
  const gasNumber = Number(gasValue),
    electricityNumber = Number(electricityValue);
  const isDirty =
    gasNumber !== gasTariff.eurPerKwh ||
    (draftGas !== null) !== gasTariff.isUserValue ||
    electricityNumber !== electricityTariff.eurPerKwh ||
    (draftElectricity !== null) !== electricityTariff.isUserValue;
  const isDisabled =
    isApplying || gasTariff.isLoading || electricityTariff.isLoading;
  const hasMissingTariff =
    gasTariff.eurPerKwh === null || electricityTariff.eurPerKwh === null;
  const canSubmit =
    isDirty &&
    canApply &&
    !isDisabled &&
    Number.isFinite(gasNumber) &&
    gasNumber > 0 &&
    Number.isFinite(electricityNumber) &&
    electricityNumber > 0;
  const fields = [
    {
      fuel: "gas",
      tariff: gasTariff,
      draft: draftGas,
      value: gasValue,
      onChange: setDraftGas,
      icon: IconFlame,
    },
    {
      fuel: "electricity",
      tariff: electricityTariff,
      draft: draftElectricity,
      value: electricityValue,
      onChange: setDraftElectricity,
      icon: IconBolt,
    },
  ] as const;

  const handleApply = async () => {
    if (!canSubmit) return;
    await onApplyTariffs({
      gasTariffEurPerKwh: draftGas === null ? null : gasNumber,
      electricityTariffEurPerKwh:
        draftElectricity === null ? null : electricityNumber,
    });
  };

  return (
    <Card
      component="section"
      aria-label="Energy tariffs"
      withBorder
      radius="md"
      p="lg"
    >
      <Stack gap="md">
        <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm">
          <Group gap="sm" align="center">
            <ThemeIcon color="blue" variant="light" size="lg" radius="md">
              <IconBolt size={18} />
            </ThemeIcon>
            <Title order={4}>Energy tariffs</Title>
          </Group>
          <Badge
            variant="light"
            color={isDisabled ? "blue" : isDirty ? "yellow" : "gray"}
          >
            {gasTariff.isLoading || electricityTariff.isLoading
              ? "Loading"
              : isApplying
                ? "Updating"
                : hasMissingTariff
                  ? "Missing tariff"
                  : isDirty
                    ? "Unsaved changes"
                    : "Applied"}
          </Badge>
        </Group>
        {!isDisabled && hasMissingTariff && (
          <Alert color="yellow">Enter the missing tariff to continue.</Alert>
        )}
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          {fields.map(
            ({ fuel, tariff, draft, value, onChange, icon: Icon }) => (
              <Stack gap="xs" key={fuel}>
                <NumberInput
                  label={
                    <ConceptLabel
                      conceptId={`${fuel}-tariff`}
                      withUnit={false}
                    />
                  }
                  description={tariffDescription(fuel, tariff)}
                  value={value}
                  onChange={onChange}
                  min={0.001}
                  max={fuel === "gas" ? 1 : undefined}
                  step={0.001}
                  decimalScale={5}
                  suffix=" €/kWh"
                  size="sm"
                  disabled={isDisabled}
                  leftSection={<Icon size={16} />}
                  {...browserNumberSeparators}
                />
                {draft !== null && (
                  <Button
                    variant="subtle"
                    size="xs"
                    aria-label={`Reset ${fuel} tariff`}
                    onClick={() => onChange(null)}
                    disabled={isDisabled || tariff.reference.eurPerKwh === null}
                  >
                    Reset
                  </Button>
                )}
              </Stack>
            ),
          )}
        </SimpleGrid>
        <Group justify="flex-end">
          <Button
            onClick={() => void handleApply()}
            disabled={!canSubmit}
            loading={isApplying}
            size="sm"
          >
            {applyLabel}
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}
