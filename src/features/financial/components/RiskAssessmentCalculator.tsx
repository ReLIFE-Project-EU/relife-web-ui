import {
  Alert,
  Box,
  Button,
  Card,
  Checkbox,
  Divider,
  Group,
  Image,
  LoadingOverlay,
  NumberInput,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconCalculator,
  IconChartBar,
  IconInfoCircle,
  IconPercentage,
} from "@tabler/icons-react";
import { useState } from "react";
import { financial } from "../../../api";
import type { RiskAssessmentResponse } from "../../../types/financial";

const AVAILABLE_INDICATORS = [
  { value: "NPV", label: "Net Present Value (NPV)" },
  { value: "IRR", label: "Internal Rate of Return (IRR)" },
  { value: "ROI", label: "Return on Investment (ROI)" },
  { value: "PBP", label: "Payback Period (PBP)" },
  { value: "DPP", label: "Discounted Payback Period (DPP)" },
];

const formatValue = (indicator: string, value: number): string => {
  if (indicator === "NPV") {
    return value.toLocaleString(undefined, {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    });
  }
  if (indicator === "IRR" || indicator === "ROI") {
    return `${(value * 100).toFixed(1)}%`;
  }
  if (indicator === "PBP" || indicator === "DPP") {
    return `${value.toFixed(1)} years`;
  }
  return value.toFixed(2);
};

export const RiskAssessmentCalculator = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RiskAssessmentResponse | null>(null);

  // Form state
  const [capex, setCapex] = useState<string | number>("");
  const [annualMaintenanceCost, setAnnualMaintenanceCost] = useState<
    string | number
  >("");
  const [annualEnergySavings, setAnnualEnergySavings] = useState<
    string | number
  >(27400);
  const [projectLifetime, setProjectLifetime] = useState<string | number>(20);
  const [loanAmount, setLoanAmount] = useState<string | number>(0);
  const [loanTerm, setLoanTerm] = useState<string | number>(0);
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>([
    "NPV",
    "IRR",
    "ROI",
    "PBP",
    "DPP",
  ]);

  const handleCalculate = async () => {
    if (loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const energySavings = Number(annualEnergySavings);
      const lifetime = Number(projectLifetime);

      if (!Number.isFinite(energySavings) || energySavings <= 0) {
        throw new Error("Annual energy savings must be a positive number.");
      }
      if (!Number.isFinite(lifetime) || lifetime < 1 || lifetime > 30) {
        throw new Error("Project lifetime must be between 1 and 30 years.");
      }

      const response = await financial.assessRisk({
        capex: capex !== "" ? Number(capex) : undefined,
        annual_maintenance_cost:
          annualMaintenanceCost !== ""
            ? Number(annualMaintenanceCost)
            : undefined,
        annual_energy_savings: energySavings,
        project_lifetime: lifetime,
        loan_amount: loanAmount !== "" ? Number(loanAmount) : 0,
        loan_term: loanTerm !== "" ? Number(loanTerm) : 0,
        output_level: "complete",
        indicators:
          selectedIndicators.length > 0 ? selectedIndicators : undefined,
      });

      setResult(response);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "An unknown error occurred",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleIndicatorToggle = (indicator: string) => {
    setSelectedIndicators((prev) =>
      prev.includes(indicator)
        ? prev.filter((i) => i !== indicator)
        : [...prev, indicator],
    );
  };

  return (
    <Box pos="relative">
      <LoadingOverlay
        visible={loading}
        zIndex={1000}
        overlayProps={{ radius: "sm", blur: 2 }}
      />
      <Stack gap="md">
        <Group>
          <IconChartBar size={24} />
          <Text fw={500} size="lg">
            Monte Carlo Risk Assessment
          </Text>
        </Group>

        <Alert variant="light" color="blue" icon={<IconInfoCircle size={16} />}>
          This calculator runs 10,000 Monte Carlo simulations to assess the
          financial risk and returns of your energy retrofit project. Results
          include median values (P50) and confidence intervals (P10-P90) for
          each indicator.
        </Alert>

        {/* Input Form */}
        <Card withBorder p="md">
          <Title order={5} mb="md">
            Project Parameters
          </Title>

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <NumberInput
              label="Capital Expenditure (€)"
              description="Total investment cost. Leave empty to use default."
              value={capex}
              onChange={setCapex}
              min={0}
              thousandSeparator=","
              placeholder="Optional"
            />
            <NumberInput
              label="Annual Maintenance Cost (€)"
              description="Yearly O&M expenses. Leave empty to use default."
              value={annualMaintenanceCost}
              onChange={setAnnualMaintenanceCost}
              min={0}
              thousandSeparator=","
              placeholder="Optional"
            />
            <NumberInput
              label="Annual Energy Savings (kWh)"
              description="Expected yearly energy savings from renovation."
              value={annualEnergySavings}
              onChange={setAnnualEnergySavings}
              min={1}
              thousandSeparator=","
              required
            />
            <NumberInput
              label="Project Lifetime (years)"
              description="Evaluation horizon (1-30 years)."
              value={projectLifetime}
              onChange={setProjectLifetime}
              min={1}
              max={30}
              required
            />
            <NumberInput
              label="Loan Amount (€)"
              description="Amount financed through loan. 0 for all-equity."
              value={loanAmount}
              onChange={setLoanAmount}
              min={0}
              thousandSeparator=","
            />
            <NumberInput
              label="Loan Term (years)"
              description="Loan repayment period."
              value={loanTerm}
              onChange={setLoanTerm}
              min={0}
              max={30}
            />
          </SimpleGrid>

          <Divider my="md" />

          <Title order={5} mb="sm">
            Indicators to Calculate
          </Title>
          <Group gap="lg">
            {AVAILABLE_INDICATORS.map((indicator) => (
              <Checkbox
                key={indicator.value}
                label={indicator.label}
                checked={selectedIndicators.includes(indicator.value)}
                onChange={() => handleIndicatorToggle(indicator.value)}
              />
            ))}
          </Group>
        </Card>

        <Button
          onClick={handleCalculate}
          leftSection={<IconCalculator size={16} />}
          size="md"
          disabled={loading || selectedIndicators.length === 0}
        >
          Run Risk Assessment
        </Button>

        {error && (
          <Alert color="red" title="Error" icon={<IconAlertCircle size={16} />}>
            {error}
          </Alert>
        )}

        {/* Results */}
        {result && (
          <Stack gap="md">
            {/* Point Forecasts */}
            <Card withBorder p="md">
              <Group mb="md">
                <IconPercentage size={20} />
                <Title order={5}>Point Forecasts (Median Values)</Title>
              </Group>
              <SimpleGrid cols={{ base: 2, sm: 3, md: 5 }}>
                {Object.entries(result.point_forecasts).map(([key, value]) => (
                  <Card key={key} withBorder p="sm" radius="md">
                    <Text size="xs" c="dimmed" tt="uppercase">
                      {key}
                    </Text>
                    <Text fw={700} size="lg">
                      {formatValue(key, value)}
                    </Text>
                  </Card>
                ))}
              </SimpleGrid>
            </Card>

            {/* Key Percentiles Table */}
            {result.key_percentiles && (
              <Card withBorder p="md">
                <Title order={5} mb="md">
                  Risk Profile (Percentiles)
                </Title>
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Indicator</Table.Th>
                      <Table.Th>P10 (Pessimistic)</Table.Th>
                      <Table.Th>P50 (Median)</Table.Th>
                      <Table.Th>P90 (Optimistic)</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {Object.entries(result.key_percentiles).map(
                      ([indicator, percentiles]) => (
                        <Table.Tr key={indicator}>
                          <Table.Td fw={500}>{indicator}</Table.Td>
                          <Table.Td>
                            {formatValue(indicator, percentiles.P10)}
                          </Table.Td>
                          <Table.Td>
                            {formatValue(indicator, percentiles.P50)}
                          </Table.Td>
                          <Table.Td>
                            {formatValue(indicator, percentiles.P90)}
                          </Table.Td>
                        </Table.Tr>
                      ),
                    )}
                  </Table.Tbody>
                </Table>
              </Card>
            )}

            {/* Probabilities */}
            {result.probabilities &&
              Object.keys(result.probabilities).length > 0 && (
                <Card withBorder p="md">
                  <Title order={5} mb="md">
                    Success Probabilities
                  </Title>
                  <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
                    {Object.entries(result.probabilities).map(
                      ([key, value]) => (
                        <Card
                          key={key}
                          withBorder
                          p="sm"
                          radius="md"
                          bg="teal.0"
                        >
                          <Text size="sm" c="dimmed">
                            {key}
                          </Text>
                          <Text fw={700} size="xl" c="teal.7">
                            {(value * 100).toFixed(1)}%
                          </Text>
                        </Card>
                      ),
                    )}
                  </SimpleGrid>
                </Card>
              )}

            {/* Visualizations */}
            {result.visualizations &&
              Object.keys(result.visualizations).length > 0 && (
                <Card withBorder p="md">
                  <Title order={5} mb="md">
                    Visualizations
                  </Title>
                  <SimpleGrid cols={{ base: 1, md: 2 }}>
                    {Object.entries(result.visualizations).map(
                      ([key, base64]) => (
                        <Box key={key}>
                          <Text size="sm" c="dimmed" mb="xs" tt="capitalize">
                            {key.replace(/_/g, " ")}
                          </Text>
                          <Image
                            src={base64}
                            alt={key}
                            radius="md"
                            fit="contain"
                          />
                        </Box>
                      ),
                    )}
                  </SimpleGrid>
                </Card>
              )}

            {/* Metadata */}
            <Card withBorder p="md" bg="gray.0">
              <Title order={6} mb="xs">
                Simulation Metadata
              </Title>
              <Text size="xs" c="dimmed">
                {JSON.stringify(result.metadata, null, 2)}
              </Text>
            </Card>
          </Stack>
        )}
      </Stack>
    </Box>
  );
};
