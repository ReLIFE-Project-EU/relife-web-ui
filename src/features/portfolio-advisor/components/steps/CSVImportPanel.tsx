/**
 * CSVImportPanel Component
 * Card for importing buildings from a portfolio CSV file.
 */

import {
  Alert,
  Button,
  Card,
  Group,
  Select,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconFileSpreadsheet,
  IconUpload,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { portfolioApi } from "../../../portfolio-manager/api/portfolioApi";
import { fileApi } from "../../../portfolio-manager/api/fileApi";
import type {
  Portfolio,
  PortfolioFile,
} from "../../../portfolio-manager/types";
import { parseCSV } from "../../services/csvParser";
import type { PRABuilding } from "../../context/types";

export function CSVImportPanel({
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
