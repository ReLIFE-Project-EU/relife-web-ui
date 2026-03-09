/**
 * CSVImportPanel Component
 * Compact collapsible card for importing buildings from a portfolio CSV file.
 */

import {
  Alert,
  Anchor,
  Button,
  Card,
  Collapse,
  Group,
  Select,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconAlertCircle,
  IconChevronDown,
  IconChevronUp,
  IconDownload,
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
  const [opened, { toggle }] = useDisclosure(true);

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
      <UnstyledButton onClick={toggle} style={{ width: "100%" }}>
        <Group justify="space-between">
          <Group>
            <IconFileSpreadsheet size={20} />
            <Title order={4}>Import from Portfolio</Title>
          </Group>
          {opened ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
        </Group>
      </UnstyledButton>

      <Collapse in={opened}>
        <Stack gap="sm" mt="md">
          {portfolioError && (
            <Alert color="yellow" icon={<IconAlertCircle size={16} />}>
              {portfolioError}
            </Alert>
          )}

          <Group grow align="end">
            <Select
              label="Portfolio"
              placeholder="Choose a portfolio"
              data={portfolios.map((p) => ({ value: p.id, label: p.name }))}
              value={selectedPortfolioId}
              onChange={setSelectedPortfolioId}
              clearable
            />

            <Select
              label="File"
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
              Import
            </Button>
          </Group>

          <Text size="xs" c="dimmed">
            Not sure about the format?{" "}
            <Anchor
              href={`${import.meta.env.BASE_URL}portfolio_example.csv`}
              download="portfolio_example.csv"
              size="xs"
              inline
            >
              <Group gap={4} component="span" display="inline-flex">
                <IconDownload size={12} />
                Download an example CSV
              </Group>
            </Anchor>
          </Text>

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
      </Collapse>
    </Card>
  );
}
