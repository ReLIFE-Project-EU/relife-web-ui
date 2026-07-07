import { useEffect, useState, type ReactNode } from "react";
import {
  Box,
  Card,
  Group,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import {
  IconRuler,
  IconStack2,
  IconTemperature,
  IconWindow,
} from "@tabler/icons-react";
import type { ArchetypeDetails } from "../../../../types/archetype";
import {
  formatArea,
  formatDecimal,
  formatNumber,
} from "../../../../utils/formatters";
import { archetypePortfolioService } from "../../services/archetypePortfolioService";
import type { RSEArchetypeRef } from "../../types";

/**
 * Lazily loads and displays the physical characteristics of a selected
 * archetype. The lookup is advisory: if it fails, the archetype remains
 * usable for analysis and a short note replaces the metrics.
 */
export function ArchetypeDetailsPanel({
  archetype,
}: {
  archetype: RSEArchetypeRef;
}) {
  const [details, setDetails] = useState<ArchetypeDetails | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    archetypePortfolioService
      .getArchetypeDetails(archetype)
      .then((loadedDetails) => {
        if (!cancelled) {
          setDetails(loadedDetails);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadFailed(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [archetype]);

  return (
    <Card withBorder bg="gray.0" radius="md" p="md">
      <Stack gap="sm">
        <Text
          size="10px"
          c="dimmed"
          tt="uppercase"
          fw={700}
          style={{ letterSpacing: "0.06em" }}
        >
          Characteristics
        </Text>

        {!details && !loadFailed ? (
          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xs">
            <Skeleton height={58} radius="sm" />
            <Skeleton height={58} radius="sm" />
            <Skeleton height={58} radius="sm" />
            <Skeleton height={58} radius="sm" />
          </SimpleGrid>
        ) : details ? (
          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xs">
            <ArchetypeMetric
              icon={<IconRuler size={14} />}
              label="Floor area"
              value={formatArea(details.floorArea)}
            />
            <ArchetypeMetric
              icon={<IconStack2 size={14} />}
              label="Floors"
              value={formatNumber(details.numberOfFloors)}
            />
            <ArchetypeMetric
              icon={<IconWindow size={14} />}
              label="Window area"
              value={formatArea(details.totalWindowArea)}
            />
            <ArchetypeMetric
              icon={<IconTemperature size={14} />}
              label="Heating setpoint"
              value={`${formatDecimal(details.setpoints.heatingSetpoint)} °C`}
            />
            <ArchetypeMetric
              icon={<IconRuler size={14} />}
              label="Wall U-value"
              value={`${formatDecimal(details.thermalProperties.wallUValue)} W/m²K`}
            />
            <ArchetypeMetric
              icon={<IconRuler size={14} />}
              label="Roof U-value"
              value={`${formatDecimal(details.thermalProperties.roofUValue)} W/m²K`}
            />
            <ArchetypeMetric
              icon={<IconWindow size={14} />}
              label="Window U-value"
              value={`${formatDecimal(details.thermalProperties.windowUValue)} W/m²K`}
            />
            <ArchetypeMetric
              icon={<IconRuler size={14} />}
              label="Floor height"
              value={`${formatDecimal(details.floorHeight)} m`}
            />
          </SimpleGrid>
        ) : loadFailed ? (
          <Text size="xs" c="dimmed">
            Characteristic details could not be loaded. The selected archetype
            can still be used for analysis.
          </Text>
        ) : null}
      </Stack>
    </Card>
  );
}

function ArchetypeMetric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Box
      p="xs"
      bg="white"
      style={{
        border: "1px solid var(--mantine-color-gray-2)",
        borderRadius: "var(--mantine-radius-sm)",
      }}
    >
      <Group gap="xs" wrap="nowrap" align="flex-start">
        <ThemeIcon size="sm" variant="light" color="gray">
          {icon}
        </ThemeIcon>
        <Box style={{ minWidth: 0 }}>
          <Text size="10px" c="dimmed" tt="uppercase" fw={700}>
            {label}
          </Text>
          <Text size="sm" fw={600}>
            {value}
          </Text>
        </Box>
      </Group>
    </Box>
  );
}
