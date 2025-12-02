import {
  Alert,
  Badge,
  Box,
  Code,
  Collapse,
  Divider,
  Group,
  Progress,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import {
  getOverallAssessment,
  getProfileDescription,
  getProgressColor,
  getScoreRating,
} from "../utils";

interface ScoreMetric {
  label: string;
  value: number;
  isLowerBetter?: boolean;
}

interface ResultDisplayProps {
  icon: React.ReactNode;
  kpiWeight: number;
  profileName: string;
  metrics: ScoreMetric[];
  explanation?: string;
  inputData?: object;
}

export const ResultDisplay = ({
  icon,
  kpiWeight,
  profileName,
  metrics,
  explanation,
  inputData,
}: ResultDisplayProps) => {
  const [technicalOpened, { toggle: toggleTechnical }] = useDisclosure(false);
  const [explainOpened, { toggle: toggleExplain }] = useDisclosure(false);

  const profileInfo = getProfileDescription(kpiWeight, metrics.length);
  const overallAssessment = getOverallAssessment(metrics);

  return (
    <Alert color="teal" title="Calculation Result" icon={icon} mt="md">
      <Stack gap="md">
        {/* Profile Impact Section */}
        <Box>
          <Group justify="space-between" mb="xs">
            <Text fw={500} size="sm">
              Profile Impact:
            </Text>
            <Badge color="blue" variant="light">
              {profileName}
            </Badge>
          </Group>
          <Text size="sm" c="dimmed">
            {profileInfo.description}
          </Text>
          <Group mt="xs" gap="xs">
            <Text size="xs" c="dimmed">
              Contribution to total project score:
            </Text>
            <Text size="xs" fw={600}>
              {profileInfo.percentage}%
            </Text>
            <Badge
              size="xs"
              color={profileInfo.emphasis === "High" ? "teal" : "gray"}
              variant="dot"
            >
              {profileInfo.emphasis} Priority
            </Badge>
          </Group>
        </Box>

        <Divider />

        {/* Performance Scores Section */}
        <Box>
          <Text fw={500} size="sm" mb="md">
            Performance Scores:
          </Text>
          <Stack gap="md">
            {metrics.map((metric) => {
              const rating = getScoreRating(metric.value);
              const color = getProgressColor(metric.value);

              return (
                <Box key={metric.label}>
                  <Group justify="space-between" mb={6}>
                    <Group gap="xs">
                      <Text size="sm" fw={500}>
                        {metric.label}
                      </Text>
                      <Badge
                        size="sm"
                        color={rating.color}
                        variant={rating.variant}
                      >
                        {rating.label}
                      </Badge>
                    </Group>
                    <Text size="sm" fw={600}>
                      {metric.value.toFixed(1)}%
                    </Text>
                  </Group>
                  <Progress
                    value={metric.value}
                    color={color}
                    size="lg"
                    radius="md"
                  />
                </Box>
              );
            })}
          </Stack>
        </Box>

        <Divider />

        <Box>
          <Text fw={500} size="sm" mb="xs">
            Overall Assessment:
          </Text>
          <Text size="sm" c="dimmed">
            {overallAssessment}
          </Text>
        </Box>

        {explanation && (
          <>
            <Divider />
            <Box>
              <UnstyledButton onClick={toggleExplain} w="100%">
                <Group justify="space-between">
                  <Text fw={500} size="sm" c="blue">
                    What does this mean?
                  </Text>
                  {explainOpened ? (
                    <IconChevronUp size={16} />
                  ) : (
                    <IconChevronDown size={16} />
                  )}
                </Group>
              </UnstyledButton>
              <Collapse in={explainOpened}>
                <Text size="sm" c="dimmed" mt="sm">
                  {explanation}
                </Text>
              </Collapse>
            </Box>
          </>
        )}

        {/* Technical Details Collapsible */}
        {inputData && (
          <>
            <Divider />
            <Box>
              <UnstyledButton onClick={toggleTechnical} w="100%">
                <Group justify="space-between">
                  <Text fw={500} size="sm" c="dimmed">
                    Technical Details
                  </Text>
                  {technicalOpened ? (
                    <IconChevronUp size={16} />
                  ) : (
                    <IconChevronDown size={16} />
                  )}
                </Group>
              </UnstyledButton>
              <Collapse in={technicalOpened}>
                <Box mt="sm">
                  <Text size="xs" fw={500} c="dimmed" mb="xs">
                    KPI Weight: {kpiWeight.toFixed(4)}
                  </Text>
                  <Text size="xs" fw={500} c="dimmed" mb="xs">
                    Input Parameters:
                  </Text>
                  <Code block>{JSON.stringify(inputData, null, 2)}</Code>
                </Box>
              </Collapse>
            </Box>
          </>
        )}
      </Stack>
    </Alert>
  );
};
