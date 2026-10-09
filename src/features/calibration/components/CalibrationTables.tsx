import { Group, Loader, Stack, Table, Text } from "@mantine/core";
import type { ReactNode } from "react";
import { ConceptExplainer } from "../../../components/shared/ConceptExplainer";
import { relifeConcepts } from "../../../constants/relifeConcepts";
import { RENOVATION_MEASURES } from "../../../services/mock/data/renovationMeasures";
import { formatCurrency, formatFixed } from "../../../utils/formatters";
import type { CalibrationResults } from "../hooks/useCalibration";
import {
  BUILDING_CASES,
  CALIBRATION_COUNTRIES,
  COST_PROBES,
  costCaseId,
} from "../referenceCases";
import type { CheckState } from "../services/calibrationService";
import { CalibrationCaseDetails } from "./CalibrationCaseDetails";

const number = (value: number | undefined, digits = 1) =>
  value !== undefined && Number.isFinite(value)
    ? formatFixed(value, digits)
    : "Unavailable";
const euros = formatCurrency;

function CheckValue<T>({
  state,
  running,
  children,
}: {
  state?: CheckState<T>;
  running: boolean;
  children: (value: T) => ReactNode;
}) {
  if (!state)
    return (
      <Text size="xs" c="dimmed">
        {running ? "Queued" : "Not run"}
      </Text>
    );
  if (state.status === "loading")
    return (
      <Group gap="xs">
        <Loader size="xs" />
        <Text size="xs">Running</Text>
      </Group>
    );
  if (state.status === "error")
    return (
      <Text size="xs" c="red" maw={260} style={{ overflowWrap: "anywhere" }}>
        Unavailable: {state.message}
      </Text>
    );
  return children(state.value);
}

interface TablesProps {
  results: CalibrationResults;
  running: boolean;
}

export function CalibrationCostTable({ results, running }: TablesProps) {
  return (
    <Table.ScrollContainer minWidth={720}>
      <Table striped highlightOnHover verticalSpacing="sm" captionSide="bottom">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Renovation</Table.Th>
            <Table.Th>Fixed quantity</Table.Th>
            {CALIBRATION_COUNTRIES.map((country) => (
              <Table.Th key={country}>{country}</Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {COST_PROBES.map((probe) => (
            <Table.Tr key={probe.measureId}>
              <Table.Td>
                {
                  RENOVATION_MEASURES.find(
                    (measure) => measure.id === probe.measureId,
                  )!.name
                }
              </Table.Td>
              <Table.Td>
                {probe.action.area_m2 !== undefined
                  ? `${probe.action.area_m2} m²`
                  : `${probe.action.capacity_kw} ${probe.measureId === "pv" ? "kWp" : "kW"}`}
              </Table.Td>
              {CALIBRATION_COUNTRIES.map((country) => (
                <Table.Td key={country}>
                  <CheckValue
                    state={results.costs[costCaseId(country, probe)]}
                    running={running}
                  >
                    {(value) => (
                      <Stack gap={2}>
                        <Text size="sm" fw={500}>
                          {euros(value.capex)}
                        </Text>
                        {value.euroPerM2 !== undefined && (
                          <Text size="xs" c="dimmed">
                            €{number(value.euroPerM2, 2)}/m²
                          </Text>
                        )}
                      </Stack>
                    )}
                  </CheckValue>
                </Table.Td>
              ))}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

export function CalibrationBuildingTables({ results, running }: TablesProps) {
  return (
    <>
      <Table.ScrollContainer minWidth={840}>
        <Table striped highlightOnHover verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Reference house</Table.Th>
              <Table.Th>Floor area (m²)</Table.Th>
              <Table.Th>Wall U-value</Table.Th>
              <Table.Th>Roof U-value</Table.Th>
              <Table.Th>Window U-value</Table.Th>
              <Table.Th>Infiltration (air changes/hour)</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {BUILDING_CASES.map((reference) => {
              const state = results.buildings[reference.name];
              return (
                <Table.Tr key={reference.name}>
                  <Table.Td>
                    <CalibrationCaseDetails
                      reference={reference}
                      results={results}
                    />
                  </Table.Td>
                  {state?.status === "success" ? (
                    <>
                      <Table.Td>{number(state.value.floorArea)}</Table.Td>
                      <Table.Td>
                        {number(state.value.thermalProperties.wallUValue, 2)}
                      </Table.Td>
                      <Table.Td>
                        {number(state.value.thermalProperties.roofUValue, 2)}
                      </Table.Td>
                      <Table.Td>
                        {number(state.value.thermalProperties.windowUValue, 2)}
                      </Table.Td>
                      <Table.Td>
                        {number(
                          state.value.bui.building_parameters.airflow_rates
                            .infiltration_rate,
                          2,
                        )}
                      </Table.Td>
                    </>
                  ) : (
                    <Table.Td colSpan={5}>
                      <CheckValue state={state} running={running}>
                        {() => null}
                      </CheckValue>
                    </Table.Td>
                  )}
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </>
  );
}

export function CalibrationEnergyTable({ results, running }: TablesProps) {
  return (
    <Table.ScrollContainer minWidth={840}>
      <Table striped highlightOnHover verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Reference house</Table.Th>
            <Table.Th>
              Heating demand{" "}
              <ConceptExplainer conceptId="annual-building-thermal-needs" />
            </Table.Th>
            <Table.Th>
              Cooling demand{" "}
              <ConceptExplainer conceptId="annual-building-thermal-needs" />
            </Table.Th>
            <Table.Th>
              {relifeConcepts["system-energy-consumption"].label}
              <Text size="xs" c="dimmed">
                Delivered energy{" "}
                <ConceptExplainer conceptId="system-energy-consumption" />
              </Text>
            </Table.Th>
            <Table.Th>
              {relifeConcepts["primary-energy"].label}{" "}
              <ConceptExplainer conceptId="primary-energy" />
            </Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {BUILDING_CASES.map((reference) => {
            const state = results.energy[reference.name];
            return (
              <Table.Tr key={reference.name}>
                <Table.Td>
                  <CalibrationCaseDetails
                    reference={reference}
                    results={results}
                  />
                </Table.Td>
                {state?.status === "success" ? (
                  <>
                    <Table.Td>{number(state.value.heating)}</Table.Td>
                    <Table.Td>{number(state.value.cooling)}</Table.Td>
                    <Table.Td>{number(state.value.delivered)}</Table.Td>
                    <Table.Td>{number(state.value.primary)}</Table.Td>
                  </>
                ) : (
                  <Table.Td colSpan={4}>
                    <CheckValue state={state} running={running}>
                      {() => null}
                    </CheckValue>
                  </Table.Td>
                )}
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}
