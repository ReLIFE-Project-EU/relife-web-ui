import {
  Alert,
  Badge,
  Button,
  Container,
  Group,
  Paper,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  IconDownload,
  IconInfoCircle,
  IconPlayerPlay,
} from "@tabler/icons-react";
import { ConceptExplainer } from "../components/shared/ConceptExplainer";
import { relifeConcepts } from "../constants/relifeConcepts";
import {
  CalibrationBuildingTables,
  CalibrationCostTable,
  CalibrationEnergyTable,
} from "../features/calibration/components/CalibrationTables";
import {
  buildCalibrationCsv,
  type CalibrationTableKind,
} from "../features/calibration/services/calibrationCsvExport";
import { useCalibration } from "../features/calibration/hooks/useCalibration";
import {
  BUILDING_CASES,
  CALIBRATION_COUNTRIES,
  COST_PROBES,
} from "../features/calibration/referenceCases";
import { downloadCsv } from "../utils/csvExport";

export function Calibration() {
  const calibration = useCalibration();
  const total =
    COST_PROBES.length * CALIBRATION_COUNTRIES.length + BUILDING_CASES.length;
  const csvButton = (kind: CalibrationTableKind, label: string) => (
    <Button
      variant="default"
      size="xs"
      leftSection={<IconDownload size={14} />}
      aria-label={`Download ${label} CSV`}
      disabled={
        calibration.running ||
        !calibration.completedAt ||
        !Object.values(calibration.results[kind]).some(
          (state) => state.status !== "loading",
        )
      }
      onClick={() => {
        if (calibration.completedAt) {
          downloadCsv(
            `relife-calibration-${kind}-${calibration.completedAt.toISOString().slice(0, 10)}.csv`,
            buildCalibrationCsv(
              kind,
              calibration.results,
              calibration.completedAt,
            ),
          );
        }
      }}
    >
      Download CSV
    </Button>
  );
  return (
    <Container size="xl">
      <Stack gap="lg">
        <Group justify="space-between" align="center">
          <Title order={1}>Calibration</Title>
          <Button
            leftSection={<IconPlayerPlay size={16} />}
            loading={calibration.running}
            disabled={calibration.running}
            onClick={() => void calibration.run()}
          >
            Run calibration
          </Button>
        </Group>
        <Alert
          color="relife"
          variant="light"
          icon={<IconInfoCircle size={20} />}
          title="Why this section"
        >
          A simulation can run without errors and still produce unrealistic
          results. These selected examples let you check renovation prices,
          building assumptions, and energy estimates against your experience. In
          other words, this is a small, representative sample of data you can
          use to spot anything clearly wrong that requires further
          investigation.
        </Alert>
        <Text size="sm" role="status" aria-live="polite">
          {calibration.running
            ? `${calibration.completed} of ${total} checks completed. Simulations may take several minutes.`
            : calibration.completedAt
              ? `${calibration.completed} of ${total} checks completed · ${calibration.failed} unavailable · Calculated ${calibration.completedAt.toLocaleString()}`
              : "Run calibration to load current data and calculate the reference cases."}
        </Text>
        {calibration.error && (
          <Alert color="red" title="Calibration run failed">
            {calibration.error}
          </Alert>
        )}
        <Paper withBorder p="md" radius="md">
          <Stack gap="sm">
            <Group justify="space-between">
              <Group gap="xs">
                <Title order={2} size="h4">
                  Renovation costs
                </Title>
                <Badge variant="light" color="gray" tt="none">
                  CAPEX · EUR
                </Badge>
                <ConceptExplainer conceptId="investment" />
              </Group>
              {csvButton("costs", "renovation costs")}
            </Group>
            <Text size="sm" c="dimmed">
              Compare the price of the same renovation and quantity across
              countries. Unusually high or low prices may point to a problem in
              the cost dataset.
            </Text>
            <CalibrationCostTable
              results={calibration.results}
              running={calibration.running}
            />
          </Stack>
        </Paper>
        <Paper withBorder p="md" radius="md">
          <Stack gap="sm">
            <Group justify="space-between">
              <Group gap="xs">
                <Title order={2} size="h4">
                  Reference-building characteristics
                </Title>
                <Badge variant="light" color="gray" tt="none">
                  U-values · W/m²K
                </Badge>
              </Group>
              {csvButton("buildings", "building characteristics")}
            </Group>
            <Text size="sm" c="dimmed">
              Check whether each reference house has a sensible size, insulation
              level, and air leakage. These inputs shape the energy estimates
              below.
            </Text>
            <CalibrationBuildingTables
              results={calibration.results}
              running={calibration.running}
            />
          </Stack>
        </Paper>
        <Paper withBorder p="md" radius="md">
          <Stack gap="sm">
            <Group justify="space-between">
              <Group gap="xs">
                <Title order={2} size="h4">
                  Baseline energy
                </Title>
                <Badge variant="light" color="gray" tt="none">
                  {relifeConcepts["energy-intensity"].unit}
                </Badge>
              </Group>
              {csvButton("energy", "baseline energy")}
            </Group>
            <Text size="sm" c="dimmed">
              Check whether energy needs and consumption look reasonable for
              each house. Unexpected differences between older and newer houses
              can point to problems with the inputs or the simulation.
            </Text>
            <CalibrationEnergyTable
              results={calibration.results}
              running={calibration.running}
            />
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}
