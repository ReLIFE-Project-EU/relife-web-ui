import { Divider, NumberInput, SimpleGrid } from "@mantine/core";

interface MetricInputGroupProps {
  label: string;
  kpiLabel: string;
  kpiDescription: string;
  kpiValue: string | number;
  onKpiChange: (value: string | number) => void;
  minLabel?: string;
  minDescription?: string;
  minValue: string | number;
  onMinChange: (value: string | number) => void;
  maxLabel?: string;
  maxDescription?: string;
  maxValue: string | number;
  onMaxChange: (value: string | number) => void;
  prefix?: string;
  suffix?: string;
  min?: number;
  max?: number;
  thousandSeparator?: string;
}

export const MetricInputGroup = ({
  label,
  kpiLabel,
  kpiDescription,
  kpiValue,
  onKpiChange,
  minLabel = "Min Value",
  minDescription = "Minimum acceptable value",
  minValue,
  onMinChange,
  maxLabel = "Max Value",
  maxDescription = "Maximum acceptable value",
  maxValue,
  onMaxChange,
  prefix,
  suffix,
  min,
  max,
  thousandSeparator,
}: MetricInputGroupProps) => {
  return (
    <>
      <Divider label={label} labelPosition="left" />
      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        <NumberInput
          label={kpiLabel}
          description={kpiDescription}
          value={kpiValue}
          onChange={onKpiChange}
          prefix={prefix}
          suffix={suffix}
          min={min}
          max={max}
          thousandSeparator={thousandSeparator}
        />
        <NumberInput
          label={minLabel}
          description={minDescription}
          value={minValue}
          onChange={onMinChange}
          prefix={prefix}
          suffix={suffix}
          min={min}
          max={max}
          thousandSeparator={thousandSeparator}
        />
        <NumberInput
          label={maxLabel}
          description={maxDescription}
          value={maxValue}
          onChange={onMaxChange}
          prefix={prefix}
          suffix={suffix}
          min={min}
          max={max}
          thousandSeparator={thousandSeparator}
        />
      </SimpleGrid>
    </>
  );
};
