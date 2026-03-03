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
import { useDisclosure } from "@mantine/hooks";
import {
  IconAlertTriangle,
  IconChevronDown,
  IconChevronUp,
  IconHome,
  IconInfoCircle,
  IconPlus,
} from "@tabler/icons-react";
import { useEffect, useReducer, useState } from "react";
import { deriveConstructionPeriod } from "../../../../utils/apiMappings";
import { checkAreaArchetypeMismatch } from "../../../../utils/inputSanityChecks";
import type { BuildingModifications } from "../../../../types/archetype";
import { usePortfolioAdvisorServices } from "../../hooks/usePortfolioAdvisorServices";
import type { PRABuilding } from "../../context/types";
import { initialFormState, manualAddFormReducer } from "./manualAddFormReducer";
import type { ManualAddFormState } from "./manualAddFormReducer";
import { MODIFICATION_FIELDS } from "./modificationFieldConfig";

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
  const [modificationsOpened, { toggle: toggleModifications }] =
    useDisclosure(false);

  const {
    name,
    category,
    constructionYear,
    propertyType,
    lat,
    lng,
    matchedArchetype,
    loadingArchetype,
    availableArchetypes,
    selectedArchetypeName,
  } = formState;

  // Load building categories
  useEffect(() => {
    buildingService
      .getAvailableCategories()
      .then(setCategories)
      .catch(() => {});
  }, [buildingService]);

  // Auto-match archetype when category + year + coordinates are set
  useEffect(() => {
    if (
      !category ||
      !constructionYear ||
      typeof constructionYear !== "number" ||
      typeof lat !== "number" ||
      typeof lng !== "number"
    ) {
      dispatch({ type: "CLEAR_ARCHETYPE" });
      dispatch({ type: "SET_LOADING_ARCHETYPE", loading: false });
      return;
    }

    const controller = new AbortController();
    dispatch({ type: "SET_LOADING_ARCHETYPE", loading: true });
    const period = deriveConstructionPeriod(constructionYear);

    buildingService
      .findMatchingArchetype(category, period, { lat, lng })
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
  }, [buildingService, category, constructionYear, lat, lng]);

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
    typeof constructionYear === "number" &&
    constructionYear >= 1800 &&
    constructionYear <= 2030 &&
    propertyType &&
    (propertyType !== "apartment" || formState.apartmentLocation !== null) &&
    typeof lat === "number" &&
    typeof lng === "number" &&
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
      constructionYear: constructionYear as number,
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

        <Grid>
          <Grid.Col span={6}>
            <NumberInput
              label="Construction Year"
              placeholder="e.g., 1985"
              value={constructionYear}
              onChange={(val) =>
                dispatch({
                  type: "SET_FIELD",
                  field: "constructionYear",
                  value: val as ManualAddFormState[keyof ManualAddFormState],
                })
              }
              min={1800}
              max={2030}
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
              required
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
              required
            />
          </Grid.Col>
        </Grid>

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
                  {matchedArchetype.name}
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

              {availableArchetypes.length > 1 && (
                <Select
                  label="Change archetype"
                  placeholder="Select different archetype"
                  data={availableArchetypes.map((a) => ({
                    value: a.name,
                    label: a.name,
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
