import {
  Badge,
  Button,
  CloseButton,
  Group,
  Paper,
  Popover,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import {
  IconFlame,
  IconInfoCircle,
  IconMapPin,
  IconSnowflake,
} from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import { formatFixed } from "../../../utils/formatters";
import type { CalibrationResults } from "../hooks/useCalibration";
import type { BUILDING_CASES } from "../referenceCases";

interface Props {
  reference: (typeof BUILDING_CASES)[number];
  results: CalibrationResults;
}

export function CalibrationCaseDetails({ reference, results }: Props) {
  const [opened, { toggle, open, close }] = useDisclosure(false);
  const state = results.buildings[reference.name];
  const period = reference.period === "2011-now" ? "2011–present" : "1946–1969";

  return (
    <Stack gap={4}>
      <Text size="sm" fw={600}>
        {reference.country}
      </Text>
      <Text size="xs" c="dimmed">
        {period}
      </Text>
      <Popover
        opened={opened}
        onChange={(value) => (value ? open() : close())}
        onClose={close}
        width={380}
        position="bottom-start"
        withArrow
        shadow="sm"
        withinPortal
        trapFocus
        returnFocus
      >
        <Popover.Target>
          <Button
            variant="default"
            size="compact-xs"
            mt={4}
            w="fit-content"
            leftSection={<IconInfoCircle size={14} />}
            aria-label={`Case details: ${reference.country}, ${period}`}
            onClick={toggle}
          >
            Case details
          </Button>
        </Popover.Target>
        <Popover.Dropdown p="md" style={{ maxWidth: "calc(100vw - 32px)" }}>
          <Stack gap="md">
            <Group justify="space-between" align="flex-start" wrap="nowrap">
              <Stack gap={4}>
                <Group gap="xs">
                  <Text fw={600} size="lg">
                    {reference.country}
                  </Text>
                  <Badge variant="light" color="gray" tt="none">
                    {period}
                  </Badge>
                </Group>
                <Text size="xs" c="dimmed">
                  Single-family house
                </Text>
              </Stack>
              <CloseButton aria-label="Close case details" onClick={close} />
            </Group>
            {state?.status === "success" ? (
              <>
                <SimpleGrid cols={2} spacing="sm">
                  {[
                    {
                      label: "Heating setpoint",
                      value: state.value.setpoints.heatingSetpoint,
                      color: "orange",
                      Icon: IconFlame,
                    },
                    {
                      label: "Cooling setpoint",
                      value: state.value.setpoints.coolingSetpoint,
                      color: "blue",
                      Icon: IconSnowflake,
                    },
                  ].map(({ label, value, color, Icon }) => (
                    <Paper
                      key={label}
                      withBorder
                      p="sm"
                      bg={`var(--mantine-color-${color}-0)`}
                    >
                      <Group gap={6} mb={6} wrap="nowrap">
                        <ThemeIcon variant="light" color={color} size="sm">
                          <Icon size={14} />
                        </ThemeIcon>
                        <Text size="xs" c="dimmed">
                          {label}
                        </Text>
                      </Group>
                      <Text
                        size="xl"
                        fw={600}
                        style={{ fontVariantNumeric: "tabular-nums" }}
                      >
                        {formatFixed(value, 1)}{" "}
                        <Text span size="sm" c="dimmed">
                          °C
                        </Text>
                      </Text>
                    </Paper>
                  ))}
                </SimpleGrid>
                <Paper withBorder p="sm" bg="var(--mantine-color-gray-0)">
                  <Group justify="space-between" mb="xs">
                    <Group gap={6}>
                      <IconMapPin size={15} />
                      <Text size="sm" fw={500}>
                        Weather location
                      </Text>
                    </Group>
                    <Badge size="sm" variant="outline" color="gray">
                      PVGIS
                    </Badge>
                  </Group>
                  <SimpleGrid cols={2} spacing="sm">
                    <Stack gap={2}>
                      <Text size="xs" c="dimmed">
                        Latitude
                      </Text>
                      <Text size="sm" fw={500}>
                        {formatFixed(state.value.location.lat, 4)}°
                      </Text>
                    </Stack>
                    <Stack gap={2}>
                      <Text size="xs" c="dimmed">
                        Longitude
                      </Text>
                      <Text size="sm" fw={500}>
                        {formatFixed(state.value.location.lng, 4)}°
                      </Text>
                    </Stack>
                  </SimpleGrid>
                </Paper>
              </>
            ) : (
              <Text size="sm" c={state?.status === "error" ? "red" : "dimmed"}>
                {state?.status === "error"
                  ? `Unavailable: ${state.message}`
                  : state?.status === "loading"
                    ? "Loading inputs…"
                    : "Not run"}
              </Text>
            )}
            <Text
              size="xs"
              c="dimmed"
              ff="monospace"
              style={{ overflowWrap: "anywhere" }}
            >
              {reference.name}
            </Text>
          </Stack>
        </Popover.Dropdown>
      </Popover>
    </Stack>
  );
}
