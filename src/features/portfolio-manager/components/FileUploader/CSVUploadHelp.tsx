import {
  Badge,
  Anchor,
  Box,
  Code,
  Collapse,
  Divider,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Table,
  Text,
  ThemeIcon,
  UnstyledButton,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconChevronDown,
  IconChevronUp,
  IconColumns3,
  IconDownload,
  IconFileSpreadsheet,
  IconInfoCircle,
} from "@tabler/icons-react";
import { CONSTRUCTION_PERIODS } from "../../../../utils/apiMappings";
import {
  CSV_OPTIONAL_COLUMNS,
  CSV_REQUIRED_COLUMNS,
} from "../../../portfolio-advisor/constants";
import { CSV_VALID_MEASURE_IDS } from "../../../portfolio-advisor/services/csvParser";

const CSV_COLUMN_DETAILS: Record<
  | (typeof CSV_REQUIRED_COLUMNS)[number]
  | (typeof CSV_OPTIONAL_COLUMNS)[number]
  | "construction_year",
  { description: string; example?: string }
> = {
  building_name: {
    description: "Any non-empty display name for the building.",
    example: "Milan Central Office Block",
  },
  lat: {
    description: "Latitude in decimal degrees between -90 and 90.",
    example: "40.4168",
  },
  lng: {
    description: "Longitude in decimal degrees between -180 and 180.",
    example: "-3.7038",
  },
  category: {
    description:
      "Displayed building category. If you also provide archetype_name, this must match that archetype's category.",
    example: "Office",
  },
  country: {
    description:
      "Building country name, used for location-based matching and reporting.",
    example: "Italy",
  },
  floor_area: {
    description: "Gross floor area in square meters.",
    example: "9800",
  },
  construction_period: {
    description:
      "Accepted period label, a 4-digit year, or a YYYY-YYYY range. You can provide construction_year instead.",
    example: "1971-1990",
  },
  construction_year: {
    description:
      "Alternative to construction_period. Provide a single year between 1800 and 2030 and omit construction_period. The example CSV uses construction_period instead.",
  },
  number_of_floors: {
    description: "Integer value between 1 and 100.",
    example: "12",
  },
  property_type: {
    description:
      "Use apartment, detached, semi-detached, or terraced. Other values import, but map to Other in financial analysis.",
    example: "detached",
  },
  archetype_name: {
    description:
      "Optional exact archetype name. If provided, the app uses it directly instead of heuristic matching. The example CSV leaves this blank.",
  },
  floor_number: {
    description:
      "Optional integer floor number, mainly for apartments. Use 0 for ground floor if needed.",
    example: "4",
  },
  capex: {
    description:
      "Optional CAPEX in EUR. If provided, it overrides the global CAPEX for this building.",
    example: "1450000",
  },
  annual_maintenance_cost: {
    description:
      "Optional annual maintenance cost in EUR/year. If provided, it overrides the global maintenance cost for this building.",
    example: "52000",
  },
  measures: {
    description:
      "Optional semicolon-separated renovation measure IDs. Only accepted IDs are allowed. Some accepted IDs are imported but not analyzed in PRA scenarios.",
    example: "wall-insulation;roof-insulation;windows",
  },
};

const CSV_REFERENCE_ROWS = [
  ...CSV_REQUIRED_COLUMNS.map((column) => ({
    column,
    badgeLabel: "Required",
    badgeColor: "teal",
    ...CSV_COLUMN_DETAILS[column],
  })),
  {
    column: "construction_year",
    badgeLabel: "Alternative",
    badgeColor: "teal",
    ...CSV_COLUMN_DETAILS.construction_year,
  },
  ...CSV_OPTIONAL_COLUMNS.map((column) => ({
    column,
    badgeLabel: "Optional",
    badgeColor: "gray",
    ...CSV_COLUMN_DETAILS[column],
  })),
];

export function CSVUploadHelp() {
  const [opened, { toggle }] = useDisclosure(false);

  return (
    <Paper
      withBorder
      radius="lg"
      p="md"
      bg="rgba(230, 250, 245, 0.45)"
      style={{ borderColor: "var(--mantine-color-teal-2)" }}
    >
      <Stack gap="md">
        <UnstyledButton onClick={toggle}>
          <Group
            justify="space-between"
            gap="sm"
            align="flex-start"
            wrap="nowrap"
          >
            <Group gap="sm" wrap="nowrap">
              <ThemeIcon variant="filled" color="teal" radius="md">
                <IconInfoCircle size={16} />
              </ThemeIcon>
              <div>
                <Group gap="xs" wrap="nowrap">
                  <Text size="sm" fw={700} c="teal.9">
                    CSV upload guide
                  </Text>
                  <Badge color="teal" variant="filled" size="xs">
                    Help
                  </Badge>
                </Group>
                <Text size="sm" c="teal.8">
                  Expand for the sample file, column reference, and accepted
                  values.
                </Text>
              </div>
            </Group>
            {opened ? (
              <IconChevronUp size={16} />
            ) : (
              <IconChevronDown size={16} />
            )}
          </Group>
        </UnstyledButton>

        <Collapse in={opened}>
          <Stack gap="md">
            <Group justify="space-between" gap="sm" align="flex-start">
              <Text size="sm" c="teal.8">
                Prepare your portfolio CSV here before uploading it for later
                import into Portfolio Advisor.
              </Text>
              <Anchor
                href={`${import.meta.env.BASE_URL}portfolio_example.csv`}
                download="portfolio_example.csv"
                size="sm"
              >
                <Group gap={4} wrap="nowrap">
                  <IconDownload size={14} />
                  <Text span size="sm">
                    Download example CSV
                  </Text>
                </Group>
              </Anchor>
            </Group>

            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm">
              <Box
                p="sm"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.82)",
                  borderRadius: "var(--mantine-radius-md)",
                  border: "1px solid var(--mantine-color-teal-1)",
                }}
              >
                <Group gap="xs" mb={6} wrap="nowrap">
                  <ThemeIcon variant="light" color="teal" size="sm">
                    <IconColumns3 size={14} />
                  </ThemeIcon>
                  <Text size="sm" fw={600}>
                    Header matching
                  </Text>
                </Group>
                <Text size="sm" c="dimmed">
                  Column names are case-insensitive and must appear in the first
                  row.
                </Text>
              </Box>

              <Box
                p="sm"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.82)",
                  borderRadius: "var(--mantine-radius-md)",
                  border: "1px solid var(--mantine-color-teal-1)",
                }}
              >
                <Group gap="xs" mb={6} wrap="nowrap">
                  <ThemeIcon variant="light" color="teal" size="sm">
                    <IconFileSpreadsheet size={14} />
                  </ThemeIcon>
                  <Text size="sm" fw={600}>
                    CSV formatting
                  </Text>
                </Group>
                <Text size="sm" c="dimmed">
                  Use commas as separators and wrap values in double quotes when
                  they contain commas.
                </Text>
              </Box>
            </SimpleGrid>

            <Divider label="Column schema" labelPosition="left" c="teal.8" />

            <Paper withBorder radius="md" p="sm" bg="white">
              <Text size="xs" c="dimmed" mb="sm">
                Required, optional, and alternative fields in one compact
                reference.
              </Text>
              <Table.ScrollContainer minWidth={720}>
                <Table striped highlightOnHover withTableBorder>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Column</Table.Th>
                      <Table.Th>Type</Table.Th>
                      <Table.Th>Description</Table.Th>
                      <Table.Th>Example</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {CSV_REFERENCE_ROWS.map(
                      ({
                        column,
                        description,
                        example,
                        badgeLabel,
                        badgeColor,
                      }) => (
                        <Table.Tr key={column}>
                          <Table.Td>
                            <Code>{column}</Code>
                          </Table.Td>
                          <Table.Td>
                            <Badge color={badgeColor} variant="light">
                              {badgeLabel}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm">{description}</Text>
                          </Table.Td>
                          <Table.Td>
                            {example ? (
                              <Code>{example}</Code>
                            ) : (
                              <Text size="sm" c="dimmed">
                                —
                              </Text>
                            )}
                          </Table.Td>
                        </Table.Tr>
                      ),
                    )}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            </Paper>

            <Divider label="Accepted values" labelPosition="left" c="teal.8" />

            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm">
              <Box
                p="sm"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.82)",
                  borderRadius: "var(--mantine-radius-md)",
                  border: "1px solid var(--mantine-color-teal-1)",
                }}
              >
                <Text size="sm" fw={600} mb={6}>
                  construction_period accepted values
                </Text>
                <Text size="sm" c="dimmed">
                  Use one of these labels: {CONSTRUCTION_PERIODS.join(", ")}.
                  You can also provide a single year such as <Code>1984</Code>,
                  a year range such as <Code>1971-1990</Code>, or use{" "}
                  <Code>construction_year</Code> with a single year from 1800 to
                  2030 instead.
                </Text>
              </Box>

              <Box
                p="sm"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.82)",
                  borderRadius: "var(--mantine-radius-md)",
                  border: "1px solid var(--mantine-color-teal-1)",
                }}
              >
                <Text size="sm" fw={600} mb={6}>
                  measures accepted IDs
                </Text>
                <Group gap="xs">
                  {CSV_VALID_MEASURE_IDS.map((measureId) => (
                    <Code key={measureId}>{measureId}</Code>
                  ))}
                </Group>
              </Box>
            </SimpleGrid>
          </Stack>
        </Collapse>
      </Stack>
    </Paper>
  );
}
