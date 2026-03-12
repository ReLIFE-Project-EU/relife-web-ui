/**
 * ManualAddPanel Component
 * Card for manually adding a building to the portfolio with archetype matching.
 */

import {
  Alert,
  Box,
  Button,
  Card,
  Collapse,
  Grid,
  Group,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { useDebouncedValue, useDisclosure } from "@mantine/hooks";
import {
  IconAlertTriangle,
  IconChevronDown,
  IconChevronUp,
  IconHome,
  IconInfoCircle,
  IconPlus,
} from "@tabler/icons-react";
import { useEffect, useReducer, useState } from "react";
import { checkAreaArchetypeMismatch } from "../../../../utils/inputSanityChecks";
import {
  countryFlag,
  countryNameToCode,
  formatArchetypeName,
} from "../../../../utils/archetypeLabels";
import type { BuildingModifications } from "../../../../types/archetype";
import { usePortfolioAdvisorServices } from "../../hooks/usePortfolioAdvisorServices";
import type { PRABuilding } from "../../context/types";
import { initialFormState, manualAddFormReducer } from "./manualAddFormReducer";
import type { ManualAddFormState } from "./manualAddFormReducer";
import { MODIFICATION_FIELDS } from "./modificationFieldConfig";
import { ArchetypeLocationMap } from "./ArchetypeLocationMap";
import { PRALocationMap } from "./PRALocationMap";

const APARTMENT_LOCATION_OPTIONS = [
  { value: "bottom", label: "Bottom floor" },
  { value: "middle", label: "Middle floor" },
  { value: "top", label: "Top floor" },
];

function derivePropertyType(category: string): string {
  const lower = category.toLowerCase();
  if (lower.includes("apartment")) return "apartment";
  if (lower.includes("semi")) return "semi-detached";
  if (lower.includes("single family") || lower.includes("detached"))
    return "detached";
  return "Other";
}

function getApartmentArchetypeCategory(categories: string[]): string {
  return (
    categories.find((c) => c.toLowerCase().includes("apartment")) ??
    categories.find((c) => c.toLowerCase().includes("multi family")) ??
    categories.find(
      (c) =>
        c.toLowerCase().includes("single family") ||
        c.toLowerCase().includes("residential"),
    ) ??
    categories[0] ??
    ""
  );
}

export function ManualAddPanel({
  onAdd,
}: {
  onAdd: (building: PRABuilding) => void;
}) {
  const { building: buildingService } = usePortfolioAdvisorServices();
  const [formState, dispatch] = useReducer(
    manualAddFormReducer,
    initialFormState,
  );
  const [categories, setCategories] = useState<string[]>([]);
  const [availablePeriods, setAvailablePeriods] = useState<string[]>([]);
  const [modificationsOpened, { toggle: toggleModifications }] =
    useDisclosure(false);
  const [showManualCoords, setShowManualCoords] = useState(false);

  const {
    name,
    category,
    constructionPeriod,
    propertyType,
    lat,
    lng,
    matchedArchetype,
    loadingArchetype,
    availableArchetypes,
    selectedArchetypeName,
  } = formState;

  const [debouncedLat] = useDebouncedValue(lat, 500);
  const [debouncedLng] = useDebouncedValue(lng, 500);

  // Immediately invalidate any stale archetype match when raw coordinates change,
  // before the debounce fires, so the Add button is disabled during the window.
  useEffect(() => {
    dispatch({ type: "CLEAR_ARCHETYPE" });
  }, [lat, lng]);

  // Load building categories
  useEffect(() => {
    buildingService
      .getAvailableCategories()
      .then(setCategories)
      .catch(() => {});
  }, [buildingService]);

  // Load available construction periods when category changes
  useEffect(() => {
    if (!category) return;
    buildingService
      .getAvailablePeriods(category)
      .then((periods) => {
        setAvailablePeriods(periods);
        // Clear selected period if it's no longer available
        if (constructionPeriod && !periods.includes(constructionPeriod)) {
          dispatch({
            type: "SET_FIELD",
            field: "constructionPeriod",
            value: null,
          });
        }
      })
      .catch(() => {});
  }, [buildingService, category, constructionPeriod]);

  // Auto-match archetype when category + period + coordinates are set
  useEffect(() => {
    if (
      !category ||
      !constructionPeriod ||
      typeof debouncedLat !== "number" ||
      typeof debouncedLng !== "number"
    ) {
      dispatch({ type: "CLEAR_ARCHETYPE" });
      dispatch({ type: "SET_LOADING_ARCHETYPE", loading: false });
      return;
    }

    const controller = new AbortController();
    dispatch({ type: "SET_LOADING_ARCHETYPE", loading: true });

    buildingService
      .findMatchingArchetype(category, constructionPeriod, {
        lat: debouncedLat,
        lng: debouncedLng,
      })
      .then(async (matched) => {
        if (controller.signal.aborted) return;
        if (!matched) {
          dispatch({ type: "CLEAR_ARCHETYPE" });
          dispatch({ type: "SET_LOADING_ARCHETYPE", loading: false });
          return;
        }

        const details = await buildingService.getArchetypeDetails({
          category: matched.category,
          country: matched.country,
          name: matched.name,
        });
        if (controller.signal.aborted) return;

        const allArchetypes = await buildingService.getArchetypes();
        if (controller.signal.aborted) return;

        const filtered = allArchetypes.filter(
          (a) => a.country === matched.country && a.category === category,
        );
        const detailsList = await Promise.all(
          filtered.map((a) =>
            buildingService.getArchetypeDetails({
              category: a.category,
              country: a.country,
              name: a.name,
            }),
          ),
        );
        if (controller.signal.aborted) return;

        dispatch({
          type: "SET_ARCHETYPE_RESULTS",
          matched: details,
          available: detailsList,
        });
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          dispatch({ type: "CLEAR_ARCHETYPE" });
          dispatch({ type: "SET_LOADING_ARCHETYPE", loading: false });
        }
      });

    return () => controller.abort();
  }, [
    buildingService,
    category,
    constructionPeriod,
    debouncedLat,
    debouncedLng,
  ]);

  // When user changes archetype manually
  useEffect(() => {
    if (!selectedArchetypeName) return;
    const selected = availableArchetypes.find(
      (a) => a.name === selectedArchetypeName,
    );
    if (selected) {
      dispatch({
        type: "SET_FIELD",
        field: "matchedArchetype",
        value: selected,
      });
    }
  }, [selectedArchetypeName, availableArchetypes]);

  const buildingTypeOptions = [
    { value: "Apartment", label: "Apartment" },
    ...categories
      .filter((c) => !c.toLowerCase().includes("apartment"))
      .map((c) => ({ value: c, label: c })),
  ];

  const buildingTypeValue =
    propertyType === "apartment" ? "Apartment" : category;

  // Detect when the user's selection doesn't match any backend category directly
  const categoryFallback =
    propertyType === "apartment" &&
    category &&
    !category.toLowerCase().includes("apartment")
      ? category
      : null;

  function handleBuildingTypeChange(value: string | null) {
    if (!value) return;
    if (value === "Apartment") {
      const aptCategory = getApartmentArchetypeCategory(categories);
      dispatch({ type: "SET_FIELD", field: "category", value: aptCategory });
      dispatch({
        type: "SET_FIELD",
        field: "propertyType",
        value: "apartment",
      });
    } else {
      dispatch({ type: "SET_FIELD", field: "category", value });
      dispatch({
        type: "SET_FIELD",
        field: "propertyType",
        value: derivePropertyType(value),
      });
      dispatch({ type: "SET_FIELD", field: "apartmentLocation", value: null });
    }
  }

  const isValid =
    name.trim() &&
    category &&
    constructionPeriod &&
    propertyType &&
    (propertyType !== "apartment" || formState.apartmentLocation !== null) &&
    typeof lat === "number" &&
    typeof lng === "number" &&
    !loadingArchetype &&
    matchedArchetype;

  const handleAdd = () => {
    if (!isValid || !matchedArchetype) return;

    const modifications: BuildingModifications = {};
    if (typeof formState.modFloorArea === "number")
      modifications.floorArea = formState.modFloorArea;
    if (typeof formState.modNumberOfFloors === "number")
      modifications.numberOfFloors = formState.modNumberOfFloors;
    if (typeof formState.modBuildingHeight === "number")
      modifications.buildingHeight = formState.modBuildingHeight;
    if (typeof formState.modWallUValue === "number")
      modifications.wallUValue = formState.modWallUValue;
    if (typeof formState.modRoofUValue === "number")
      modifications.roofUValue = formState.modRoofUValue;
    if (typeof formState.modWindowUValue === "number")
      modifications.windowUValue = formState.modWindowUValue;
    if (typeof formState.modHeatingSetpoint === "number")
      modifications.heatingSetpoint = formState.modHeatingSetpoint;
    if (typeof formState.modCoolingSetpoint === "number")
      modifications.coolingSetpoint = formState.modCoolingSetpoint;
    if (typeof formState.modOccupants === "number")
      modifications.numberOfOccupants = formState.modOccupants;

    const building: PRABuilding = {
      id: crypto.randomUUID(),
      name: name.trim(),
      source: "manual",
      category: category!,
      country: matchedArchetype.country,
      archetypeName: matchedArchetype.name,
      archetypeFloorArea: matchedArchetype.floorArea,
      modifications:
        Object.keys(modifications).length > 0 ? modifications : undefined,
      lat: lat as number,
      lng: lng as number,
      floorArea:
        typeof formState.modFloorArea === "number"
          ? formState.modFloorArea
          : matchedArchetype.floorArea,
      constructionPeriod: constructionPeriod!,
      numberOfFloors:
        typeof formState.modNumberOfFloors === "number"
          ? formState.modNumberOfFloors
          : matchedArchetype.numberOfFloors,
      propertyType: propertyType!,
      floorNumber: (() => {
        if (propertyType === "apartment" && formState.apartmentLocation) {
          const floors =
            typeof formState.modNumberOfFloors === "number"
              ? formState.modNumberOfFloors
              : matchedArchetype.numberOfFloors;
          if (formState.apartmentLocation === "bottom") return 0;
          if (formState.apartmentLocation === "middle")
            return Math.floor(floors / 2);
          return floors - 1;
        }
        return undefined;
      })(),
      validationStatus: "valid",
    };

    onAdd(building);
    dispatch({ type: "RESET_FORM" });
  };

  function handleMapClick(clickedLat: number, clickedLng: number) {
    const roundedLat = Math.round(clickedLat * 10000) / 10000;
    const roundedLng = Math.round(clickedLng * 10000) / 10000;
    dispatch({ type: "SET_FIELD", field: "lat", value: roundedLat });
    dispatch({ type: "SET_FIELD", field: "lng", value: roundedLng });
  }

  const geometryFields = MODIFICATION_FIELDS.filter(
    (f) => f.group === "geometry",
  );
  const thermalFields = MODIFICATION_FIELDS.filter(
    (f) => f.group === "thermal",
  );
  const setpointFields = MODIFICATION_FIELDS.filter(
    (f) => f.group === "setpoints",
  );
  const occupancyFields = MODIFICATION_FIELDS.filter(
    (f) => f.group === "occupancy",
  );

  return (
    <Card withBorder radius="md" p="lg">
      <Group mb="md">
        <IconPlus size={20} />
        <Title order={4}>Add Building Manually</Title>
      </Group>

      <Stack gap="md">
        {/* Section 1: Building identification */}
        <TextInput
          label="Building Name"
          placeholder="e.g., Office Building A"
          value={name}
          onChange={(e) =>
            dispatch({
              type: "SET_FIELD",
              field: "name",
              value: e.currentTarget.value,
            })
          }
          required
        />

        <Grid>
          <Grid.Col span={6}>
            <TextInput
              label="Country"
              placeholder="Auto-detected from coordinates"
              value={matchedArchetype?.country ?? ""}
              readOnly
              variant="filled"
              leftSection={(() => {
                const code = matchedArchetype?.country
                  ? countryNameToCode(matchedArchetype.country)
                  : undefined;
                return code ? (
                  <Text size="sm">{countryFlag(code)}</Text>
                ) : undefined;
              })()}
            />
          </Grid.Col>
          <Grid.Col span={6}>
            <Select
              label="Building Type"
              placeholder="Select building type"
              data={buildingTypeOptions}
              value={buildingTypeValue}
              onChange={handleBuildingTypeChange}
              searchable
              required
            />
          </Grid.Col>
        </Grid>

        {categoryFallback && (
          <Alert
            icon={<IconInfoCircle size={16} />}
            color="yellow"
            variant="light"
            p="xs"
          >
            <Text size="sm">
              No <strong>Apartment</strong> archetype is available. Using{" "}
              <strong>{categoryFallback}</strong> as the closest match.
              Simulation results will represent the entire building, not an
              individual unit.
            </Text>
          </Alert>
        )}

        <Grid>
          <Grid.Col span={6}>
            <Select
              label="Construction Period"
              placeholder="Select period"
              data={availablePeriods}
              value={constructionPeriod}
              onChange={(val) =>
                dispatch({
                  type: "SET_FIELD",
                  field: "constructionPeriod",
                  value: val as ManualAddFormState[keyof ManualAddFormState],
                })
              }
              required
            />
          </Grid.Col>
          {propertyType === "apartment" && (
            <Grid.Col span={6}>
              <Select
                label="Apartment Location"
                placeholder="Select floor position"
                data={APARTMENT_LOCATION_OPTIONS}
                value={formState.apartmentLocation}
                onChange={(val) =>
                  dispatch({
                    type: "SET_FIELD",
                    field: "apartmentLocation",
                    value: val as ManualAddFormState[keyof ManualAddFormState],
                  })
                }
                required
              />
            </Grid.Col>
          )}
        </Grid>

        <div>
          <Text size="sm" fw={500} mb={4}>
            Building Location
          </Text>
          <Text size="xs" c="dimmed" mb="xs">
            Click on the map to set the building location.
          </Text>
          <PRALocationMap
            lat={typeof lat === "number" ? lat : null}
            lng={typeof lng === "number" ? lng : null}
            onLocationChange={handleMapClick}
          />
        </div>

        {typeof lat === "number" && typeof lng === "number" && (
          <Text size="sm" c="dimmed">
            Selected:{" "}
            <Text span fw={500} c="dark">
              {lat.toFixed(4)}, {lng.toFixed(4)}
            </Text>
          </Text>
        )}

        <Button
          variant="subtle"
          size="xs"
          onClick={() => setShowManualCoords((v) => !v)}
          leftSection={
            showManualCoords ? (
              <IconChevronUp size={14} />
            ) : (
              <IconChevronDown size={14} />
            )
          }
        >
          {showManualCoords ? "Hide" : "Show"} manual coordinate input
        </Button>

        <Collapse in={showManualCoords}>
          <Grid>
            <Grid.Col span={6}>
              <NumberInput
                label="Latitude"
                placeholder="e.g., 37.98"
                value={lat}
                onChange={(val) =>
                  dispatch({
                    type: "SET_FIELD",
                    field: "lat",
                    value: val as ManualAddFormState[keyof ManualAddFormState],
                  })
                }
                min={-90}
                max={90}
                decimalScale={6}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <NumberInput
                label="Longitude"
                placeholder="e.g., 23.73"
                value={lng}
                onChange={(val) =>
                  dispatch({
                    type: "SET_FIELD",
                    field: "lng",
                    value: val as ManualAddFormState[keyof ManualAddFormState],
                  })
                }
                min={-180}
                max={180}
                decimalScale={6}
              />
            </Grid.Col>
          </Grid>
        </Collapse>

        {/* Section 2: Archetype match */}
        {matchedArchetype && (
          <Stack gap="sm">
            <Alert
              icon={<IconInfoCircle size={16} />}
              color="blue"
              variant="light"
            >
              <Text size="sm">
                An <strong>archetype</strong> is a reference building model that
                defines thermal characteristics, HVAC systems, and construction
                details used in energy simulation. Your building has been
                matched to the closest available archetype based on coordinates,
                category, and construction period. The country is automatically
                detected from the matched archetype.
              </Text>
            </Alert>

            <Card withBorder p="md" bg="gray.0">
              <Group mb="xs">
                <ThemeIcon size="lg" radius="md" variant="light" color="blue">
                  <IconHome size={20} />
                </ThemeIcon>
                <Text size="sm" fw={500}>
                  {formatArchetypeName(matchedArchetype.name)}
                </Text>
              </Group>

              <SimpleGrid cols={2} spacing="xs">
                <div>
                  <Text size="xs" c="dimmed">
                    Floor Area
                  </Text>
                  <Text size="sm" fw={500}>
                    {matchedArchetype.floorArea} m²
                  </Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed">
                    Floors
                  </Text>
                  <Text size="sm" fw={500}>
                    {matchedArchetype.numberOfFloors}
                  </Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed">
                    Wall U-value
                  </Text>
                  <Text size="sm" fw={500}>
                    {matchedArchetype.thermalProperties.wallUValue.toFixed(2)}{" "}
                    W/m²K
                  </Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed">
                    Roof U-value
                  </Text>
                  <Text size="sm" fw={500}>
                    {matchedArchetype.thermalProperties.roofUValue.toFixed(2)}{" "}
                    W/m²K
                  </Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed">
                    Window U-value
                  </Text>
                  <Text size="sm" fw={500}>
                    {matchedArchetype.thermalProperties.windowUValue.toFixed(2)}{" "}
                    W/m²K
                  </Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed">
                    Heating Setpoint
                  </Text>
                  <Text size="sm" fw={500}>
                    {matchedArchetype.setpoints.heatingSetpoint}°C
                  </Text>
                </div>
              </SimpleGrid>

              {typeof lat === "number" && typeof lng === "number" && (
                <ArchetypeLocationMap
                  userLat={lat}
                  userLng={lng}
                  archetypeCountry={matchedArchetype.country}
                />
              )}

              {availableArchetypes.length > 1 && (
                <Select
                  label="Change archetype"
                  placeholder="Select different archetype"
                  data={availableArchetypes.map((a) => ({
                    value: a.name,
                    label: formatArchetypeName(a.name),
                  }))}
                  value={selectedArchetypeName}
                  onChange={(val) =>
                    dispatch({
                      type: "SET_FIELD",
                      field: "selectedArchetypeName",
                      value:
                        val as ManualAddFormState[keyof ManualAddFormState],
                    })
                  }
                  mt="sm"
                  size="xs"
                />
              )}
            </Card>
          </Stack>
        )}

        {loadingArchetype && (
          <Text size="sm" c="dimmed">
            Loading archetype details...
          </Text>
        )}

        {/* Section 3: Customize simulation parameters */}
        {matchedArchetype && (
          <Box>
            <Button
              variant="subtle"
              size="sm"
              onClick={toggleModifications}
              rightSection={
                modificationsOpened ? (
                  <IconChevronUp size={16} />
                ) : (
                  <IconChevronDown size={16} />
                )
              }
              fullWidth
            >
              Customize simulation parameters (optional)
            </Button>

            <Collapse in={modificationsOpened}>
              <Stack
                gap="sm"
                mt="md"
                p="md"
                bg="gray.0"
                style={{ borderRadius: 8 }}
              >
                <Text size="xs" c="dimmed">
                  Optionally adjust these parameters to better reflect your
                  building's actual characteristics. Only modified values will
                  override the archetype defaults.
                </Text>

                <SimpleGrid cols={3} spacing="xs">
                  {geometryFields.map((cfg) => (
                    <NumberInput
                      key={cfg.field}
                      label={cfg.label}
                      placeholder={cfg.getPlaceholder(matchedArchetype)}
                      value={formState[cfg.field] as number | string}
                      onChange={(val) =>
                        dispatch({
                          type: "SET_FIELD",
                          field: cfg.field,
                          value:
                            val as ManualAddFormState[keyof ManualAddFormState],
                        })
                      }
                      min={cfg.min}
                      max={cfg.max}
                      step={cfg.step}
                      decimalScale={cfg.decimalScale}
                      size="xs"
                    />
                  ))}
                </SimpleGrid>

                {typeof formState.modFloorArea === "number" &&
                  checkAreaArchetypeMismatch(
                    formState.modFloorArea,
                    matchedArchetype.floorArea,
                  ).warning && (
                    <Alert
                      color="yellow"
                      icon={<IconAlertTriangle size={16} />}
                      variant="light"
                    >
                      {
                        checkAreaArchetypeMismatch(
                          formState.modFloorArea,
                          matchedArchetype.floorArea,
                        ).message
                      }
                    </Alert>
                  )}

                <Text size="xs" fw={500} mt="xs">
                  Thermal Envelope
                </Text>
                <SimpleGrid cols={3} spacing="xs">
                  {thermalFields.map((cfg) => (
                    <NumberInput
                      key={cfg.field}
                      label={cfg.label}
                      placeholder={cfg.getPlaceholder(matchedArchetype)}
                      value={formState[cfg.field] as number | string}
                      onChange={(val) =>
                        dispatch({
                          type: "SET_FIELD",
                          field: cfg.field,
                          value:
                            val as ManualAddFormState[keyof ManualAddFormState],
                        })
                      }
                      min={cfg.min}
                      max={cfg.max}
                      step={cfg.step}
                      decimalScale={cfg.decimalScale}
                      size="xs"
                    />
                  ))}
                </SimpleGrid>

                <Text size="xs" fw={500} mt="xs">
                  Temperature Setpoints
                </Text>
                <SimpleGrid cols={2} spacing="xs">
                  {setpointFields.map((cfg) => (
                    <NumberInput
                      key={cfg.field}
                      label={cfg.label}
                      placeholder={cfg.getPlaceholder(matchedArchetype)}
                      value={formState[cfg.field] as number | string}
                      onChange={(val) =>
                        dispatch({
                          type: "SET_FIELD",
                          field: cfg.field,
                          value:
                            val as ManualAddFormState[keyof ManualAddFormState],
                        })
                      }
                      min={cfg.min}
                      max={cfg.max}
                      size="xs"
                    />
                  ))}
                </SimpleGrid>

                {occupancyFields.map((cfg) => (
                  <NumberInput
                    key={cfg.field}
                    label={cfg.label}
                    placeholder={cfg.getPlaceholder(matchedArchetype)}
                    value={formState[cfg.field] as number | string}
                    onChange={(val) =>
                      dispatch({
                        type: "SET_FIELD",
                        field: cfg.field,
                        value:
                          val as ManualAddFormState[keyof ManualAddFormState],
                      })
                    }
                    min={cfg.min}
                    max={cfg.max}
                    size="xs"
                  />
                ))}
              </Stack>
            </Collapse>
          </Box>
        )}

        <Button
          leftSection={<IconPlus size={16} />}
          onClick={handleAdd}
          disabled={!isValid}
        >
          Add Building
        </Button>
      </Stack>
    </Card>
  );
}
