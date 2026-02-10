/**
 * BuildingPortfolioStep Component
 * Step 0: Two-panel building input (CSV import + manual add) with building table.
 */

import {
  ActionIcon,
  Alert,
  Badge,
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
  Table,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconAlertCircle,
  IconChevronDown,
  IconChevronUp,
  IconFileSpreadsheet,
  IconHome,
  IconInfoCircle,
  IconPencil,
  IconPlus,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import { portfolioApi } from "../../../portfolio-manager/api/portfolioApi";
import { fileApi } from "../../../portfolio-manager/api/fileApi";
import type {
  Portfolio,
  PortfolioFile,
} from "../../../portfolio-manager/types";
import { parseCSV } from "../../services/csvParser";
import { usePortfolioAdvisor } from "../../hooks/usePortfolioAdvisor";
import { usePortfolioAdvisorServices } from "../../hooks/usePortfolioAdvisorServices";
import { StepNavigation } from "../../../../components/shared/StepNavigation";
import type { PRABuilding } from "../../context/types";
import type {
  ArchetypeDetails,
  BuildingModifications,
} from "../../../../types/archetype";
import { deriveConstructionPeriod } from "../../../../utils/apiMappings";

// ─────────────────────────────────────────────────────────────────────────────
// Property Type Options
// ─────────────────────────────────────────────────────────────────────────────

const PROPERTY_TYPE_OPTIONS = [
  { value: "apartment", label: "Apartment" },
  { value: "detached", label: "Detached House" },
  { value: "semi-detached", label: "House" },
  { value: "Other", label: "Other" },
];

// ─────────────────────────────────────────────────────────────────────────────
// CSV Import Panel
// ─────────────────────────────────────────────────────────────────────────────

function CSVImportPanel({
  onImport,
}: {
  onImport: (buildings: PRABuilding[]) => void;
}) {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [files, setFiles] = useState<PortfolioFile[]>([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(
    null,
  );
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [portfolioError, setPortfolioError] = useState<string | null>(null);

  // Load portfolios
  useEffect(() => {
    portfolioApi
      .list()
      .then(setPortfolios)
      .catch((e: unknown) =>
        setPortfolioError(
          e instanceof Error ? e.message : "Failed to load portfolios",
        ),
      );
  }, []);

  // Load files when portfolio changes
  useEffect(() => {
    if (!selectedPortfolioId) {
      setFiles([]);
      setSelectedFileId(null);
      return;
    }
    fileApi
      .listByPortfolio(selectedPortfolioId)
      .then((f) => {
        setFiles(f);
        setSelectedFileId(null);
      })
      .catch(() => setFiles([]));
  }, [selectedPortfolioId]);

  const handleImport = async () => {
    if (!selectedFileId) return;
    const file = files.find((f) => f.id === selectedFileId);
    if (!file) return;

    setLoading(true);
    setImportErrors([]);

    try {
      const blob = await fileApi.download(file);
      const text = await blob.text();
      const result = parseCSV(text);

      if (result.errors.length > 0) {
        setImportErrors(result.errors);
      }

      if (result.buildings.length > 0) {
        onImport(result.buildings);
      }
    } catch (e: unknown) {
      setImportErrors([
        e instanceof Error ? e.message : "Failed to import file",
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card withBorder radius="md" p="lg">
      <Group mb="md">
        <IconFileSpreadsheet size={20} />
        <Title order={4}>Import from Portfolio</Title>
      </Group>

      {portfolioError && (
        <Alert color="yellow" mb="sm" icon={<IconAlertCircle size={16} />}>
          {portfolioError}
        </Alert>
      )}

      <Stack gap="sm">
        <Select
          label="Select Portfolio"
          placeholder="Choose a portfolio"
          data={portfolios.map((p) => ({ value: p.id, label: p.name }))}
          value={selectedPortfolioId}
          onChange={setSelectedPortfolioId}
          clearable
        />

        <Select
          label="Select File"
          placeholder="Choose a CSV file"
          data={files.map((f) => ({
            value: f.id,
            label: f.originalFilename,
          }))}
          value={selectedFileId}
          onChange={setSelectedFileId}
          disabled={!selectedPortfolioId || files.length === 0}
          clearable
        />

        <Button
          leftSection={<IconUpload size={16} />}
          onClick={handleImport}
          loading={loading}
          disabled={!selectedFileId}
        >
          Import Buildings
        </Button>

        {importErrors.length > 0 && (
          <Alert
            color="red"
            icon={<IconAlertCircle size={16} />}
            title="Import Errors"
          >
            {importErrors.map((err, i) => (
              <Text key={i} size="sm">
                {err}
              </Text>
            ))}
          </Alert>
        )}
      </Stack>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Manual Add Panel
// ─────────────────────────────────────────────────────────────────────────────

function ManualAddPanel({ onAdd }: { onAdd: (building: PRABuilding) => void }) {
  const { building: buildingService } = usePortfolioAdvisorServices();
  const [categories, setCategories] = useState<string[]>([]);
  const [countries, setCountries] = useState<
    { value: string; label: string }[]
  >([]);

  // Section 1: Building identification
  const [name, setName] = useState("");
  const [country, setCountry] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [constructionYear, setConstructionYear] = useState<number | string>("");
  const [propertyType, setPropertyType] = useState<string | null>(null);
  const [lat, setLat] = useState<number | string>("");
  const [lng, setLng] = useState<number | string>("");

  // Section 2: Archetype matching
  const [matchedArchetype, setMatchedArchetype] =
    useState<ArchetypeDetails | null>(null);
  const [loadingArchetype, setLoadingArchetype] = useState(false);
  const [availableArchetypes, setAvailableArchetypes] = useState<
    ArchetypeDetails[]
  >([]);
  const [selectedArchetypeName, setSelectedArchetypeName] = useState<
    string | null
  >(null);

  // Section 3: Modifications
  const [modificationsOpened, { toggle: toggleModifications }] =
    useDisclosure(false);
  const [modFloorArea, setModFloorArea] = useState<number | string>("");
  const [modNumberOfFloors, setModNumberOfFloors] = useState<number | string>(
    "",
  );
  const [modBuildingHeight, setModBuildingHeight] = useState<number | string>(
    "",
  );
  const [modWallUValue, setModWallUValue] = useState<number | string>("");
  const [modRoofUValue, setModRoofUValue] = useState<number | string>("");
  const [modWindowUValue, setModWindowUValue] = useState<number | string>("");
  const [modHeatingSetpoint, setModHeatingSetpoint] = useState<number | string>(
    "",
  );
  const [modCoolingSetpoint, setModCoolingSetpoint] = useState<number | string>(
    "",
  );
  const [modOccupants, setModOccupants] = useState<number | string>("");

  // Load building options
  useEffect(() => {
    buildingService
      .getOptions()
      .then((opts) => setCountries(opts.countries))
      .catch(() => {});
    buildingService
      .getAvailableCategories()
      .then(setCategories)
      .catch(() => {});
  }, [buildingService]);

  // Auto-match archetype when country + category + year are set
  useEffect(() => {
    if (
      !country ||
      !category ||
      !constructionYear ||
      typeof constructionYear !== "number"
    ) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMatchedArchetype(null);
      setAvailableArchetypes([]);
      setSelectedArchetypeName(null);
      return;
    }

    setLoadingArchetype(true);
    const period = deriveConstructionPeriod(constructionYear);

    buildingService
      .findMatchingArchetype(
        category,
        period,
        typeof lat === "number" && typeof lng === "number"
          ? { lat, lng }
          : null,
      )
      .then(async (matched) => {
        if (!matched) {
          setMatchedArchetype(null);
          return;
        }

        // Fetch full archetype details
        const details = await buildingService.getArchetypeDetails({
          category: matched.category,
          country: matched.country,
          name: matched.name,
        });
        setMatchedArchetype(details);
        setSelectedArchetypeName(details.name);

        // Fetch all archetypes for this country + category for override dropdown
        const allArchetypes = await buildingService.getArchetypes();
        const filtered = allArchetypes.filter(
          (a) => a.country === country && a.category === category,
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
        setAvailableArchetypes(detailsList);
      })
      .catch(() => {
        setMatchedArchetype(null);
        setAvailableArchetypes([]);
      })
      .finally(() => setLoadingArchetype(false));
  }, [buildingService, country, category, constructionYear, lat, lng]);

  // When user changes archetype manually
  useEffect(() => {
    if (!selectedArchetypeName) return;
    const selected = availableArchetypes.find(
      (a) => a.name === selectedArchetypeName,
    );
    if (selected) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMatchedArchetype(selected);
    }
  }, [selectedArchetypeName, availableArchetypes]);

  const isValid =
    name.trim() &&
    country &&
    category &&
    typeof constructionYear === "number" &&
    constructionYear >= 1800 &&
    constructionYear <= 2030 &&
    propertyType &&
    typeof lat === "number" &&
    typeof lng === "number" &&
    matchedArchetype;

  const handleAdd = () => {
    if (!isValid || !matchedArchetype) return;

    // Collect modifications (only non-empty fields)
    const modifications: BuildingModifications = {};
    if (typeof modFloorArea === "number")
      modifications.floorArea = modFloorArea;
    if (typeof modNumberOfFloors === "number")
      modifications.numberOfFloors = modNumberOfFloors;
    if (typeof modBuildingHeight === "number")
      modifications.buildingHeight = modBuildingHeight;
    if (typeof modWallUValue === "number")
      modifications.wallUValue = modWallUValue;
    if (typeof modRoofUValue === "number")
      modifications.roofUValue = modRoofUValue;
    if (typeof modWindowUValue === "number")
      modifications.windowUValue = modWindowUValue;
    if (typeof modHeatingSetpoint === "number")
      modifications.heatingSetpoint = modHeatingSetpoint;
    if (typeof modCoolingSetpoint === "number")
      modifications.coolingSetpoint = modCoolingSetpoint;
    if (typeof modOccupants === "number")
      modifications.numberOfOccupants = modOccupants;

    const building: PRABuilding = {
      id: crypto.randomUUID(),
      name: name.trim(),
      source: "manual",
      category: category!,
      country: country!,
      archetypeName: matchedArchetype.name,
      modifications:
        Object.keys(modifications).length > 0 ? modifications : undefined,
      lat: lat as number,
      lng: lng as number,
      floorArea:
        typeof modFloorArea === "number"
          ? modFloorArea
          : matchedArchetype.floorArea,
      constructionYear: constructionYear as number,
      numberOfFloors:
        typeof modNumberOfFloors === "number"
          ? modNumberOfFloors
          : matchedArchetype.numberOfFloors,
      propertyType: propertyType!,
      validationStatus: "valid",
    };

    onAdd(building);

    // Reset form
    setName("");
    setCountry(null);
    setCategory(null);
    setConstructionYear("");
    setPropertyType(null);
    setLat("");
    setLng("");
    setMatchedArchetype(null);
    setSelectedArchetypeName(null);
    setModFloorArea("");
    setModNumberOfFloors("");
    setModBuildingHeight("");
    setModWallUValue("");
    setModRoofUValue("");
    setModWindowUValue("");
    setModHeatingSetpoint("");
    setModCoolingSetpoint("");
    setModOccupants("");
  };

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
          onChange={(e) => setName(e.currentTarget.value)}
          required
        />

        <Grid>
          <Grid.Col span={6}>
            <Select
              label="Country"
              placeholder="Select country"
              data={countries}
              value={country}
              onChange={setCountry}
              searchable
              required
            />
          </Grid.Col>
          <Grid.Col span={6}>
            <Select
              label="Category"
              placeholder="Select category"
              data={categories.map((c) => ({ value: c, label: c }))}
              value={category}
              onChange={setCategory}
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
              onChange={setConstructionYear}
              min={1800}
              max={2030}
              required
            />
          </Grid.Col>
          <Grid.Col span={6}>
            <Select
              label="Property Type"
              placeholder="Select type"
              data={PROPERTY_TYPE_OPTIONS}
              value={propertyType}
              onChange={setPropertyType}
              required
            />
          </Grid.Col>
        </Grid>

        <Grid>
          <Grid.Col span={6}>
            <NumberInput
              label="Latitude"
              placeholder="e.g., 37.98"
              value={lat}
              onChange={setLat}
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
              onChange={setLng}
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
                matched to the closest available archetype based on country,
                category, and construction period.
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
                  onChange={setSelectedArchetypeName}
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
                  <NumberInput
                    label="Floor Area (m²)"
                    placeholder={`Default: ${matchedArchetype.floorArea}`}
                    value={modFloorArea}
                    onChange={setModFloorArea}
                    min={10}
                    max={1000}
                    size="xs"
                  />
                  <NumberInput
                    label="Number of Floors"
                    placeholder={`Default: ${matchedArchetype.numberOfFloors}`}
                    value={modNumberOfFloors}
                    onChange={setModNumberOfFloors}
                    min={1}
                    max={20}
                    size="xs"
                  />
                  <NumberInput
                    label="Building Height (m)"
                    placeholder={`Default: ${matchedArchetype.buildingHeight}`}
                    value={modBuildingHeight}
                    onChange={setModBuildingHeight}
                    min={2}
                    max={60}
                    size="xs"
                  />
                </SimpleGrid>

                <Text size="xs" fw={500} mt="xs">
                  Thermal Envelope
                </Text>
                <SimpleGrid cols={3} spacing="xs">
                  <NumberInput
                    label="Wall U-value (W/m²K)"
                    placeholder={`Default: ${matchedArchetype.thermalProperties.wallUValue.toFixed(2)}`}
                    value={modWallUValue}
                    onChange={setModWallUValue}
                    min={0.1}
                    max={5.0}
                    step={0.1}
                    decimalScale={2}
                    size="xs"
                  />
                  <NumberInput
                    label="Roof U-value (W/m²K)"
                    placeholder={`Default: ${matchedArchetype.thermalProperties.roofUValue.toFixed(2)}`}
                    value={modRoofUValue}
                    onChange={setModRoofUValue}
                    min={0.1}
                    max={5.0}
                    step={0.1}
                    decimalScale={2}
                    size="xs"
                  />
                  <NumberInput
                    label="Window U-value (W/m²K)"
                    placeholder={`Default: ${matchedArchetype.thermalProperties.windowUValue.toFixed(2)}`}
                    value={modWindowUValue}
                    onChange={setModWindowUValue}
                    min={0.1}
                    max={5.0}
                    step={0.1}
                    decimalScale={2}
                    size="xs"
                  />
                </SimpleGrid>

                <Text size="xs" fw={500} mt="xs">
                  Temperature Setpoints
                </Text>
                <SimpleGrid cols={2} spacing="xs">
                  <NumberInput
                    label="Heating Setpoint (°C)"
                    placeholder={`Default: ${matchedArchetype.setpoints.heatingSetpoint}`}
                    value={modHeatingSetpoint}
                    onChange={setModHeatingSetpoint}
                    min={15}
                    max={22}
                    size="xs"
                  />
                  <NumberInput
                    label="Cooling Setpoint (°C)"
                    placeholder={`Default: ${matchedArchetype.setpoints.coolingSetpoint}`}
                    value={modCoolingSetpoint}
                    onChange={setModCoolingSetpoint}
                    min={24}
                    max={30}
                    size="xs"
                  />
                </SimpleGrid>

                <NumberInput
                  label="Number of Occupants"
                  placeholder="Default: archetype value"
                  value={modOccupants}
                  onChange={setModOccupants}
                  min={1}
                  max={50}
                  size="xs"
                />
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

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function BuildingPortfolioStep() {
  const { state, dispatch } = usePortfolioAdvisor();

  const handleCSVImport = useCallback(
    (buildings: PRABuilding[]) => {
      dispatch({
        type: "SET_BUILDINGS",
        buildings: [...state.buildings, ...buildings],
      });
    },
    [dispatch, state.buildings],
  );

  const handleManualAdd = useCallback(
    (building: PRABuilding) => {
      dispatch({ type: "ADD_BUILDING", building });
    },
    [dispatch],
  );

  const handleRemove = useCallback(
    (buildingId: string) => {
      dispatch({ type: "REMOVE_BUILDING", buildingId });
    },
    [dispatch],
  );

  const handleNext = () => {
    if (state.buildings.length > 0) {
      dispatch({ type: "SET_STEP", step: 1 });
    }
  };

  return (
    <Stack gap="xl">
      {/* Header */}
      <Box>
        <Title order={2} mb="xs">
          Building Portfolio
        </Title>
        <Text c="dimmed" size="sm">
          Import buildings from a CSV file or add them manually.
        </Text>
      </Box>

      {/* Two-panel input */}
      <Grid>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <CSVImportPanel onImport={handleCSVImport} />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <ManualAddPanel onAdd={handleManualAdd} />
        </Grid.Col>
      </Grid>

      {/* Building Table */}
      {state.buildings.length > 0 && (
        <Card withBorder radius="md" p="lg">
          <Group justify="space-between" mb="md">
            <Title order={4}>
              Buildings{" "}
              <Badge color="teal" variant="light" ml="xs">
                {state.buildings.length}
              </Badge>
            </Title>
          </Group>

          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Category</Table.Th>
                <Table.Th>Country</Table.Th>
                <Table.Th>Floor Area (m2)</Table.Th>
                <Table.Th>Archetype</Table.Th>
                <Table.Th>Source</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {state.buildings.map((building) => (
                <Table.Tr key={building.id}>
                  <Table.Td>{building.name}</Table.Td>
                  <Table.Td>{building.category}</Table.Td>
                  <Table.Td>{building.country}</Table.Td>
                  <Table.Td>{building.floorArea}</Table.Td>
                  <Table.Td>
                    {building.archetypeName ? (
                      <Group gap="xs">
                        <Text size="sm">
                          {building.archetypeName.split("_").pop()}
                        </Text>
                        {building.modifications &&
                          Object.keys(building.modifications).length > 0 && (
                            <Badge
                              size="xs"
                              color="orange"
                              variant="light"
                              leftSection={<IconPencil size={10} />}
                            >
                              Customized
                            </Badge>
                          )}
                      </Group>
                    ) : (
                      <Text size="sm" c="dimmed">
                        —
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      size="sm"
                      variant="light"
                      color={building.source === "csv" ? "blue" : "green"}
                    >
                      {building.source}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <ActionIcon
                      color="red"
                      variant="subtle"
                      onClick={() => handleRemove(building.id)}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      )}

      {/* Navigation */}
      <StepNavigation
        currentStep={0}
        totalSteps={4}
        onNext={handleNext}
        primaryDisabled={state.buildings.length === 0}
      />
    </Stack>
  );
}
