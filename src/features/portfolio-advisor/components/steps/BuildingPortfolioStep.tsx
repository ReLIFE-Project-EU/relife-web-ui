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
  Grid,
  Group,
  NumberInput,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconFileSpreadsheet,
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

  const [name, setName] = useState("");
  const [country, setCountry] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [floorArea, setFloorArea] = useState<number | string>("");
  const [constructionYear, setConstructionYear] = useState<number | string>("");
  const [numberOfFloors, setNumberOfFloors] = useState<number | string>(1);
  const [propertyType, setPropertyType] = useState<string | null>(null);
  const [lat, setLat] = useState<number | string>("");
  const [lng, setLng] = useState<number | string>("");

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

  const isValid =
    name.trim() &&
    country &&
    category &&
    typeof floorArea === "number" &&
    floorArea > 0 &&
    typeof constructionYear === "number" &&
    constructionYear >= 1800 &&
    constructionYear <= 2030 &&
    typeof numberOfFloors === "number" &&
    numberOfFloors >= 1 &&
    propertyType &&
    typeof lat === "number" &&
    typeof lng === "number";

  const handleAdd = () => {
    if (!isValid) return;

    const building: PRABuilding = {
      id: crypto.randomUUID(),
      name: name.trim(),
      source: "manual",
      category: category!,
      country: country!,
      lat: lat as number,
      lng: lng as number,
      floorArea: floorArea as number,
      constructionYear: constructionYear as number,
      numberOfFloors: numberOfFloors as number,
      propertyType: propertyType!,
      validationStatus: "valid",
    };

    onAdd(building);

    // Reset form
    setName("");
    setFloorArea("");
    setConstructionYear("");
    setNumberOfFloors(1);
    setLat("");
    setLng("");
  };

  return (
    <Card withBorder radius="md" p="lg">
      <Group mb="md">
        <IconPlus size={20} />
        <Title order={4}>Add Building Manually</Title>
      </Group>

      <Stack gap="sm">
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
          <Grid.Col span={4}>
            <NumberInput
              label="Floor Area (m2)"
              placeholder="e.g., 150"
              value={floorArea}
              onChange={setFloorArea}
              min={1}
              required
            />
          </Grid.Col>
          <Grid.Col span={4}>
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
          <Grid.Col span={4}>
            <NumberInput
              label="Number of Floors"
              placeholder="e.g., 3"
              value={numberOfFloors}
              onChange={setNumberOfFloors}
              min={1}
              max={100}
              required
            />
          </Grid.Col>
        </Grid>

        <Select
          label="Property Type"
          placeholder="Select type"
          data={PROPERTY_TYPE_OPTIONS}
          value={propertyType}
          onChange={setPropertyType}
          required
        />

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
