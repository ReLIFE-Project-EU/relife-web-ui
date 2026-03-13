/**
 * ArchetypeSelector Component
 *
 * Matches the user's building to a reference archetype and lets them either:
 * - use the archetype as-is, or
 * - apply a small set of homeowner-friendly adjustments before simulation.
 */

import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Collapse,
  Divider,
  Group,
  Loader,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconBuildingCommunity,
  IconCheck,
  IconEqual,
  IconHome,
  IconInfoCircle,
  IconMapPin,
  IconRuler,
  IconStack2,
} from "@tabler/icons-react";
import type { ArchetypeInfo } from "../../../../types/forecasting";
import type {
  ArchetypeDetails,
  BuildingModifications,
} from "../../../../types/archetype";
import {
  countryFlag,
  countryNameToCode,
  formatArchetypeName,
} from "../../../../utils/archetypeLabels";
import { validateModifications } from "../../../../utils/archetypeModifier";
import { checkAreaArchetypeMismatch } from "../../../../utils/inputSanityChecks";
import {
  formatArea,
  formatDecimal,
  formatNumber,
} from "../../utils/formatters";
import { useHomeAssistant } from "../../hooks/useHomeAssistant";
import { useHomeAssistantServices } from "../../hooks/useHomeAssistantServices";

type ApartmentLocation = "bottom" | "middle" | "top";

interface DraftState {
  floorArea: number | string;
  numberOfFloors: number | string;
  floorHeight: number | string;
  apartmentLocation: ApartmentLocation | null;
}

const APARTMENT_LOCATION_OPTIONS = [
  { value: "bottom", label: "Bottom floor" },
  { value: "middle", label: "Middle floor" },
  { value: "top", label: "Top floor" },
] as const;

function isApartmentLikeCategory(category: string): boolean {
  const normalized = category.toLowerCase();
  return normalized.includes("apartment");
}

function mapApartmentLocationToFloorNumber(
  location: ApartmentLocation,
  floors: number,
): number {
  if (location === "bottom") return 0;
  if (location === "middle") return Math.max(0, Math.floor(floors / 2));
  return Math.max(0, floors - 1);
}

function formatDelta(
  current: number,
  reference: number,
  suffix: string,
): string {
  const delta = current - reference;
  if (Math.abs(delta) < 0.05) {
    return "No change";
  }

  const sign = delta > 0 ? "+" : "";
  const value =
    suffix === "m"
      ? formatDecimal(delta)
      : Number.isInteger(delta)
        ? formatNumber(delta)
        : formatDecimal(delta);

  return `${sign}${value} ${suffix}`;
}

function formatComparisonValue(value: number, suffix: string): string {
  if (suffix === "m") {
    return `${formatDecimal(value)} m`;
  }
  if (suffix === "m²") {
    return `${formatNumber(value)} m²`;
  }
  return `${formatNumber(value)} ${suffix}`;
}

function getFloorAreaMax(details: ArchetypeDetails): number {
  return Math.max(1000, Math.ceil(details.floorArea * 3));
}

function buildDraftState(
  details: ArchetypeDetails,
  apartmentLocation?: ApartmentLocation,
  modifications?: BuildingModifications,
): DraftState {
  return {
    floorArea: modifications?.floorArea ?? details.floorArea,
    numberOfFloors: modifications?.numberOfFloors ?? details.numberOfFloors,
    floorHeight: modifications?.floorHeight ?? details.floorHeight,
    apartmentLocation: apartmentLocation ?? null,
  };
}

function buildAppliedChanges(
  details: ArchetypeDetails,
  draft: DraftState,
  isApartment: boolean,
): {
  modifications?: BuildingModifications;
  floorArea: number;
  numberOfFloors: number;
  apartmentLocation?: ApartmentLocation;
  floorNumber: number | null;
  simulationChanges: string[];
  contextChanges: string[];
} {
  const floorArea =
    typeof draft.floorArea === "number" ? draft.floorArea : details.floorArea;
  const numberOfFloors =
    typeof draft.numberOfFloors === "number"
      ? draft.numberOfFloors
      : details.numberOfFloors;
  const floorHeight =
    typeof draft.floorHeight === "number"
      ? draft.floorHeight
      : details.floorHeight;

  const modifications: BuildingModifications = {};
  const simulationChanges: string[] = [];
  const contextChanges: string[] = [];

  if (Math.abs(floorArea - details.floorArea) >= 0.05) {
    modifications.floorArea = floorArea;
    simulationChanges.push(
      `Floor area: ${formatArea(details.floorArea)} -> ${formatArea(floorArea)}`,
    );
  }

  if (numberOfFloors !== details.numberOfFloors) {
    modifications.numberOfFloors = numberOfFloors;
    simulationChanges.push(
      `Number of floors: ${details.numberOfFloors} -> ${numberOfFloors}`,
    );
  }

  if (Math.abs(floorHeight - details.floorHeight) >= 0.05) {
    modifications.floorHeight = floorHeight;
    simulationChanges.push(
      `Floor height: ${formatDecimal(details.floorHeight)} m -> ${formatDecimal(floorHeight)} m`,
    );
  }

  let floorNumber: number | null = null;
  if (isApartment && draft.apartmentLocation) {
    floorNumber = mapApartmentLocationToFloorNumber(
      draft.apartmentLocation,
      numberOfFloors,
    );
    contextChanges.push(`Apartment location: ${draft.apartmentLocation} floor`);
  }

  return {
    modifications:
      Object.keys(modifications).length > 0 ? modifications : undefined,
    floorArea,
    numberOfFloors,
    apartmentLocation: draft.apartmentLocation ?? undefined,
    floorNumber,
    simulationChanges,
    contextChanges,
  };
}

function ReferenceDeltaCard({
  currentValue,
  referenceValue,
  suffix,
}: {
  currentValue?: number;
  referenceValue: number;
  suffix: string;
}) {
  const resolvedCurrentValue =
    typeof currentValue === "number" ? currentValue : referenceValue;
  const isChanged = Math.abs(resolvedCurrentValue - referenceValue) >= 0.05;

  return (
    <Paper withBorder radius="md" p="sm" bg={isChanged ? "blue.0" : "gray.0"}>
      <Stack gap="xs">
        <Group justify="space-between" align="center">
          <Text size="xs" fw={600} c="dimmed" tt="uppercase">
            Change from reference
          </Text>
          <Badge color={isChanged ? "blue" : "gray"} variant="light">
            {isChanged ? "Adjusted" : "Unchanged"}
          </Badge>
        </Group>

        <SimpleGrid cols={2} spacing="xs">
          <Box>
            <Text size="xs" c="dimmed" mb={2}>
              Reference
            </Text>
            <Text size="sm" fw={600}>
              {formatComparisonValue(referenceValue, suffix)}
            </Text>
          </Box>
          <Box>
            <Text size="xs" c="dimmed" mb={2}>
              Current
            </Text>
            <Text size="sm" fw={600}>
              {formatComparisonValue(resolvedCurrentValue, suffix)}
            </Text>
          </Box>
        </SimpleGrid>

        <Group gap="xs" align="center">
          <ThemeIcon
            size="sm"
            radius="xl"
            variant="light"
            color={isChanged ? "blue" : "gray"}
          >
            <IconEqual size={14} />
          </ThemeIcon>
          <Text size="sm" fw={600} c={isChanged ? "blue.7" : "dimmed"}>
            {formatDelta(resolvedCurrentValue, referenceValue, suffix)}
          </Text>
        </Group>
      </Stack>
    </Paper>
  );
}

function DetailEvolutionRow({
  icon,
  label,
  referenceValue,
  currentValue,
}: {
  icon: React.ReactNode;
  label: string;
  referenceValue: string;
  currentValue?: string;
}) {
  const hasCurrentValue =
    Boolean(currentValue) && currentValue !== referenceValue;

  return (
    <Group gap="xs" wrap="nowrap" align="center">
      <ThemeIcon size="xs" variant="light" color="gray">
        {icon}
      </ThemeIcon>
      <Group gap={6} wrap="wrap">
        <Text size="sm" c="dimmed">
          {label}:
        </Text>
        <Text size="sm" fw={500}>
          {referenceValue}
        </Text>
        {hasCurrentValue ? (
          <Group gap={6} wrap="nowrap">
            <Text size="sm" c="dimmed">
              →
            </Text>
            <Badge color="blue" variant="light">
              {currentValue}
            </Badge>
          </Group>
        ) : null}
      </Group>
    </Group>
  );
}

function ArchetypeSummary({
  details,
  isSelected,
  isModified,
  onUseReference,
  draft,
  setDraft,
  onApplyAdjustments,
  appliedModifications,
  appliedApartmentLocation,
}: {
  details: ArchetypeDetails;
  isSelected: boolean;
  isModified: boolean;
  onUseReference: () => void;
  draft: DraftState;
  setDraft: Dispatch<SetStateAction<DraftState | null>>;
  onApplyAdjustments: () => void;
  appliedModifications?: BuildingModifications;
  appliedApartmentLocation?: ApartmentLocation;
}) {
  const [adjustmentsOpen, { toggle: toggleAdjustments }] = useDisclosure(false);

  const isApartment = isApartmentLikeCategory(details.category);
  const areaWarning =
    typeof draft.floorArea === "number"
      ? checkAreaArchetypeMismatch(draft.floorArea, details.floorArea)
      : { warning: false, message: "" };
  const appliedFloorArea = appliedModifications?.floorArea;
  const appliedNumberOfFloors = appliedModifications?.numberOfFloors;
  const appliedFloorHeight = appliedModifications?.floorHeight;

  const previewSummary = buildAppliedChanges(details, draft, isApartment);
  const validationResult = validateModifications(
    previewSummary.modifications ?? {},
    details,
  );

  return (
    <Card withBorder shadow="sm" radius="md" p="lg">
      <Stack gap="md">
        <Group justify="space-between" align="flex-start">
          <Stack gap={4}>
            <Group gap="xs">
              <ThemeIcon size="sm" variant="light" color="blue">
                <IconBuildingCommunity size={14} />
              </ThemeIcon>
              <Text fw={600} size="lg">
                {details.category}
              </Text>
            </Group>
            <Text size="sm" c="dimmed">
              {(() => {
                const code = countryNameToCode(details.country);
                const formattedName = formatArchetypeName(details.name);
                if (!code) return formattedName;
                // Avoid duplicating the country if formatArchetypeName already starts with it
                if (formattedName.startsWith(details.country)) {
                  return `${countryFlag(code)} ${formattedName}`;
                }
                return `${countryFlag(code)} ${details.country} · ${formattedName}`;
              })()}
            </Text>
          </Stack>
          {isSelected ? (
            <Badge color={isModified ? "teal" : "green"}>
              {isModified ? "Adjusted" : "Selected"}
            </Badge>
          ) : null}
        </Group>

        <Card withBorder bg="gray.0" radius="sm" p="sm">
          <Stack gap="xs">
            <DetailEvolutionRow
              icon={<IconRuler size={12} />}
              label="Floor area"
              referenceValue={formatArea(details.floorArea)}
              currentValue={
                appliedFloorArea !== undefined
                  ? formatArea(appliedFloorArea)
                  : undefined
              }
            />
            <DetailEvolutionRow
              icon={<IconStack2 size={12} />}
              label="Number of floors"
              referenceValue={`${details.numberOfFloors}`}
              currentValue={
                appliedNumberOfFloors !== undefined
                  ? `${appliedNumberOfFloors}`
                  : undefined
              }
            />
            <DetailEvolutionRow
              icon={<IconRuler size={12} />}
              label="Floor height"
              referenceValue={`${formatDecimal(details.floorHeight)} m`}
              currentValue={
                appliedFloorHeight !== undefined
                  ? `${formatDecimal(appliedFloorHeight)} m`
                  : undefined
              }
            />
            <DetailEvolutionRow
              icon={<IconStack2 size={12} />}
              label="Building height"
              referenceValue={`${formatDecimal(details.floorHeight * details.numberOfFloors)} m`}
              currentValue={
                appliedFloorHeight !== undefined || appliedNumberOfFloors !== undefined
                  ? `${formatDecimal((appliedFloorHeight ?? details.floorHeight) * (appliedNumberOfFloors ?? details.numberOfFloors))} m`
                  : undefined
              }
            />
            {isApartment ? (
              <DetailEvolutionRow
                icon={<IconHome size={12} />}
                label="Apartment location"
                referenceValue="Not specified"
                currentValue={appliedApartmentLocation}
              />
            ) : null}
          </Stack>
        </Card>

        <Alert color="blue" variant="light" icon={<IconInfoCircle size={16} />}>
          <Text size="sm">
            This reference home is the closest archetype for your location,
            building type, and construction period. You can use it directly or
            adjust a small set of fields to better match your building.
          </Text>
        </Alert>

        <Group grow>
          <Button
            variant={isSelected && !isModified ? "filled" : "default"}
            leftSection={<IconCheck size={16} />}
            onClick={onUseReference}
          >
            Use reference home
          </Button>
          <Button
            variant="light"
            leftSection={<IconHome size={16} />}
            onClick={toggleAdjustments}
          >
            {adjustmentsOpen ? "Hide adjustments" : "Adjust to my home"}
          </Button>
        </Group>

        <Collapse in={adjustmentsOpen}>
          <Stack gap="md">
            <Divider />
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <NumberInput
                label="Floor area (m²)"
                description={`Reference: ${formatArea(details.floorArea)}`}
                value={draft.floorArea}
                onChange={(value) =>
                  setDraft((current) =>
                    current ? { ...current, floorArea: value } : current,
                  )
                }
                min={10}
                max={getFloorAreaMax(details)}
              />
              <ReferenceDeltaCard
                currentValue={
                  typeof draft.floorArea === "number"
                    ? draft.floorArea
                    : undefined
                }
                referenceValue={details.floorArea}
                suffix="m²"
              />
              <NumberInput
                label="Number of floors"
                description={`Reference: ${details.numberOfFloors}`}
                value={draft.numberOfFloors}
                onChange={(value) =>
                  setDraft((current) => ({
                    ...(current ?? draft),
                    numberOfFloors: value,
                  }))
                }
                min={1}
                max={20}
              />
              <ReferenceDeltaCard
                currentValue={
                  typeof draft.numberOfFloors === "number"
                    ? draft.numberOfFloors
                    : undefined
                }
                referenceValue={details.numberOfFloors}
                suffix="floors"
              />
              <NumberInput
                label="Floor height (m)"
                description={`Reference: ${formatDecimal(details.floorHeight)} m`}
                value={draft.floorHeight}
                onChange={(value) =>
                  setDraft((current) => ({
                    ...(current ?? draft),
                    floorHeight: value,
                  }))
                }
                min={2}
                max={6}
                step={0.1}
                decimalScale={1}
              />
              <ReferenceDeltaCard
                currentValue={
                  typeof draft.floorHeight === "number"
                    ? draft.floorHeight
                    : undefined
                }
                referenceValue={details.floorHeight}
                suffix="m"
              />
            </SimpleGrid>

            {isApartment ? (
              <Select
                label="Apartment location"
                description="Used for property context only. It does not change the energy simulation."
                placeholder="Select floor position"
                data={APARTMENT_LOCATION_OPTIONS.map((option) => ({
                  value: option.value,
                  label: option.label,
                }))}
                value={draft.apartmentLocation}
                onChange={(value) =>
                  setDraft((current) => ({
                    ...(current ?? draft),
                    apartmentLocation:
                      (value as ApartmentLocation | null) ?? null,
                  }))
                }
                clearable
              />
            ) : null}

            {areaWarning.warning ? (
              <Alert
                color="yellow"
                variant="light"
                icon={<IconInfoCircle size={16} />}
              >
                <Text size="sm">{areaWarning.message}</Text>
              </Alert>
            ) : null}

            {!validationResult.isValid ? (
              <Alert
                color="red"
                variant="light"
                icon={<IconInfoCircle size={16} />}
              >
                <Stack gap={4}>
                  {validationResult.errors.map((error) => (
                    <Text key={`${error.field}-${error.message}`} size="sm">
                      {error.message}
                    </Text>
                  ))}
                </Stack>
              </Alert>
            ) : null}
            <Text size="sm" c="dimmed">
              {isApartment
                ? "Geometry changes affect the energy simulation. Apartment location is kept only for property and financial context."
                : "Geometry changes affect the energy simulation."}
            </Text>

            <Button
              onClick={onApplyAdjustments}
              disabled={!validationResult.isValid}
            >
              Apply adjustments
            </Button>
          </Stack>
        </Collapse>
      </Stack>
    </Card>
  );
}

function ArchetypePlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card withBorder radius="md" p="lg" bg="gray.0">
      <Stack gap="sm">
        <Group gap="xs">
          <ThemeIcon size="sm" variant="light" color="gray">
            <IconMapPin size={14} />
          </ThemeIcon>
          <Text fw={600}>{title}</Text>
        </Group>
        <Text size="sm" c="dimmed">
          {description}
        </Text>
      </Stack>
    </Card>
  );
}

export function ArchetypeSelector() {
  const { state, dispatch } = useHomeAssistant();
  const { building } = useHomeAssistantServices();

  const [matchedArchetype, setMatchedArchetype] =
    useState<ArchetypeInfo | null>(null);
  const [archetypeDetails, setArchetypeDetails] =
    useState<ArchetypeDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftState | null>(null);

  const { lat, lng, buildingType, constructionPeriod } = state.building;
  const canSearch =
    lat !== null && lng !== null && buildingType && constructionPeriod;

  const isCurrentSelectionValid =
    state.building.selectedArchetype &&
    matchedArchetype &&
    state.building.selectedArchetype.name === matchedArchetype.name &&
    state.building.selectedArchetype.country === matchedArchetype.country &&
    state.building.selectedArchetype.category === matchedArchetype.category;

  useEffect(() => {
    if (!archetypeDetails) {
      setDraft(null);
      return;
    }

    setDraft(
      buildDraftState(
        archetypeDetails,
        state.building.apartmentLocation,
        state.building.modifications,
      ),
    );
  }, [
    archetypeDetails,
    state.building.apartmentLocation,
    state.building.modifications,
  ]);

  useEffect(() => {
    if (!canSearch) {
      setMatchedArchetype(null);
      setArchetypeDetails(null);
      setDraft(null);
      dispatch({
        type: "SET_BUILDING",
        building: {
          tentativeArchetype: undefined,
        },
      });
      return;
    }

    const findArchetype = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const match = await building.findMatchingArchetype(
          buildingType,
          constructionPeriod,
          { lat: lat!, lng: lng! },
        );

        if (!match) {
          setMatchedArchetype(null);
          setArchetypeDetails(null);
          setDraft(null);
          dispatch({
            type: "SET_BUILDING",
            building: {
              tentativeArchetype: undefined,
            },
          });
          setError("No matching archetype found for your selections.");
          return;
        }

        const details = await building.getArchetypeDetails(match);
        setMatchedArchetype(match);
        setArchetypeDetails(details);
        dispatch({
          type: "SET_BUILDING",
          building: {
            tentativeArchetype: {
              name: match.name,
              category: match.category,
              country: match.country,
            },
          },
        });

        if (
          !state.building.selectedArchetype ||
          state.building.selectedArchetype.name !== match.name ||
          state.building.selectedArchetype.country !== match.country
        ) {
          dispatch({
            type: "SET_BUILDING",
            building: {
              country: match.country,
              tentativeArchetype: {
                name: match.name,
                category: match.category,
                country: match.country,
              },
              selectedArchetype: undefined,
              floorArea: null,
              numberOfFloors: null,
              apartmentLocation: undefined,
              floorNumber: null,
              isModified: false,
              modifications: undefined,
            },
          });
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to find archetype",
        );
        setMatchedArchetype(null);
        setArchetypeDetails(null);
        setDraft(null);
        dispatch({
          type: "SET_BUILDING",
          building: {
            tentativeArchetype: undefined,
          },
        });
      } finally {
        setIsLoading(false);
      }
    };

    findArchetype();
  }, [
    building,
    buildingType,
    canSearch,
    constructionPeriod,
    dispatch,
    lat,
    lng,
    state.building.selectedArchetype,
  ]);

  const handleUseReference = useCallback(() => {
    if (!matchedArchetype || !archetypeDetails) return;

    dispatch({
      type: "SET_BUILDING",
      building: {
        tentativeArchetype: {
          name: matchedArchetype.name,
          category: matchedArchetype.category,
          country: matchedArchetype.country,
        },
        selectedArchetype: {
          name: matchedArchetype.name,
          category: matchedArchetype.category,
          country: matchedArchetype.country,
        },
        floorArea: archetypeDetails.floorArea,
        numberOfFloors: archetypeDetails.numberOfFloors,
        apartmentLocation: undefined,
        floorNumber: null,
        isModified: false,
        modifications: undefined,
      },
    });

    setDraft(buildDraftState(archetypeDetails));
  }, [archetypeDetails, dispatch, matchedArchetype]);

  const handleApplyAdjustments = useCallback(() => {
    if (!matchedArchetype || !archetypeDetails || !draft) return;

    const isApartment = isApartmentLikeCategory(archetypeDetails.category);
    const summary = buildAppliedChanges(archetypeDetails, draft, isApartment);

    dispatch({
      type: "SET_BUILDING",
      building: {
        tentativeArchetype: {
          name: matchedArchetype.name,
          category: matchedArchetype.category,
          country: matchedArchetype.country,
        },
        selectedArchetype: {
          name: matchedArchetype.name,
          category: matchedArchetype.category,
          country: matchedArchetype.country,
        },
        floorArea: summary.floorArea,
        numberOfFloors: summary.numberOfFloors,
        apartmentLocation: summary.apartmentLocation,
        floorNumber: summary.floorNumber,
        isModified: summary.modifications !== undefined,
        modifications: summary.modifications,
      },
    });
  }, [archetypeDetails, dispatch, draft, matchedArchetype]);

  if (!canSearch) {
    return (
      <ArchetypePlaceholder
        title="Reference home pending"
        description="Set your building location, type, and construction period to see the best matching reference archetype here."
      />
    );
  }

  if (isLoading) {
    return (
      <Card withBorder shadow="sm" radius="md" p="lg">
        <Group justify="center" gap="md" py="xl">
          <Loader size="sm" />
          <Text size="sm" c="dimmed">
            Finding best matching archetype...
          </Text>
        </Group>
      </Card>
    );
  }

  if (error) {
    return (
      <Stack gap="sm">
        <ArchetypePlaceholder
          title="No tentative archetype yet"
          description="Try adjusting the map location or the building details to find a reference home you can review before accepting."
        />
        <Alert
          variant="light"
          color="red"
          icon={<IconInfoCircle size={16} />}
          title="No Archetype Found"
        >
          <Text size="sm" mb="xs">
            {error}
          </Text>
          <Text size="sm" c="dimmed">
            Try adjusting your coordinates, building type, or construction
            period.
          </Text>
        </Alert>
      </Stack>
    );
  }

  if (!matchedArchetype || !archetypeDetails || !draft) {
    return (
      <ArchetypePlaceholder
        title="No tentative archetype yet"
        description="Adjust the map location or the building details to surface a matching reference home here."
      />
    );
  }

  return (
    <ArchetypeSummary
      details={archetypeDetails}
      isSelected={Boolean(isCurrentSelectionValid)}
      isModified={Boolean(state.building.isModified)}
      onUseReference={handleUseReference}
      draft={draft}
      setDraft={setDraft}
      onApplyAdjustments={handleApplyAdjustments}
      appliedModifications={state.building.modifications}
      appliedApartmentLocation={state.building.apartmentLocation}
    />
  );
}
