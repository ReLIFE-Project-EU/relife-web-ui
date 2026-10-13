import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Container,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconDownload,
  IconInfoCircle,
} from "@tabler/icons-react";
import { useSearchParams } from "react-router-dom";
import { downloadJson } from "../../utils/download";
import { errorMessage } from "../../utils/errorMessage";
import { LineageTimeline } from "./components/LineageTimeline";
import { loadLineageSnapshot } from "./lineageSnapshot";
import type { LineageSnapshot } from "./lineageSnapshot";

const OTHER_VERSION_MESSAGE =
  "This lineage was captured by another version of the app. Open it again from the tool's results.";

export function LineageView() {
  const [searchParams] = useSearchParams();
  const scope = searchParams.get("scope");
  const [exportError, setExportError] = useState<string | null>(null);

  const { snapshot, error } = useMemo((): {
    snapshot?: LineageSnapshot;
    error?: string;
  } => {
    if (!scope) return {};
    try {
      const stored = loadLineageSnapshot(scope);
      if (!stored) return {};
      return stored.commitSha === __APP_COMMIT_SHA__
        ? { snapshot: stored }
        : { error: OTHER_VERSION_MESSAGE };
    } catch (cause) {
      return { error: errorMessage(cause) };
    }
  }, [scope]);

  const lineage = snapshot?.lineage;

  return (
    <Container size="lg" py="xl">
      <Stack gap="lg">
        <Group justify="space-between" align="flex-start">
          <div>
            <Title order={2}>Calculation lineage</Title>
            {snapshot && (
              <Text c="dimmed" size="sm">
                Run {snapshot.runId} · captured{" "}
                {new Date(snapshot.capturedAt).toLocaleString()}
              </Text>
            )}
          </div>
          {snapshot && (
            <Button
              variant="default"
              leftSection={<IconDownload size={16} />}
              onClick={() => {
                try {
                  downloadJson(
                    `relife-lineage-${snapshot.runId}.json`,
                    snapshot,
                  );
                  setExportError(null);
                } catch (cause) {
                  setExportError(errorMessage(cause));
                }
              }}
            >
              Export JSON
            </Button>
          )}
        </Group>

        {(error || exportError) && (
          <Alert color="red" icon={<IconAlertCircle size={16} />}>
            {error || exportError}
          </Alert>
        )}

        {!error && !snapshot && (
          <Alert color="gray" icon={<IconInfoCircle size={16} />}>
            No trace found. Open this page from a tool's results.
          </Alert>
        )}

        {lineage && lineage.energyProfile.length > 0 && (
          <Stack gap="sm">
            <Title order={3}>Energy profile</Title>
            <LineageTimeline steps={lineage.energyProfile} />
          </Stack>
        )}

        {lineage && lineage.renovation.length > 0 && (
          <Stack gap="sm">
            <Title order={3}>Renovation packages</Title>
            <LineageTimeline steps={lineage.renovation} />
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
