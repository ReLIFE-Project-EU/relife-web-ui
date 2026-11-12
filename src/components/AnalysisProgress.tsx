import { useEffect, useState, type ReactNode } from "react";
import {
  Box,
  Fieldset,
  Group,
  Loader,
  Modal,
  Progress,
  Text,
} from "@mantine/core";
import { analysisLoadingCopy } from "../constants/relifeConcepts";
import { useGlobalLoadingState } from "../contexts/global-loading";
import { getLoadingMessage } from "../contexts/global-loading/loadingMessages";

interface AnalysisProgressProps {
  children: ReactNode;
  progress?: { completed: number; total: number } | null;
}

/** One focused progress card for the active analysis. */
export function AnalysisProgress({
  children,
  progress,
}: AnalysisProgressProps) {
  const { isLoading, sources } = useGlobalLoadingState();
  const message = getLoadingMessage(sources);

  return (
    <>
      <Modal
        opened={isLoading}
        onClose={() => {}}
        title={<Text fw={600}>{message.title}</Text>}
        centered
        size="sm"
        padding="lg"
        radius="md"
        withCloseButton={false}
        closeOnClickOutside={false}
        closeOnEscape={false}
        overlayProps={{ backgroundOpacity: 0.25 }}
        transitionProps={{ duration: 0 }}
      >
        {isLoading && (
          <LoadingStatus
            key={`${message.text}:${progress?.completed ?? ""}`}
            message={message}
            progress={progress}
          />
        )}
      </Modal>
      <Fieldset
        variant="unstyled"
        disabled={isLoading}
        aria-disabled={isLoading}
      >
        {children}
      </Fieldset>
    </>
  );
}

function LoadingStatus({
  message,
  progress,
}: {
  message: ReturnType<typeof getLoadingMessage>;
  progress: AnalysisProgressProps["progress"];
}) {
  const [lastProgressAt] = useState(Date.now);
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const elapsed = Math.floor((now - message.startedAt) / 1000);
  const waiting = now - lastProgressAt >= 30_000;
  const count =
    progress && progress.total > 0
      ? analysisLoadingCopy.buildings(progress.completed, progress.total)
      : null;

  return (
    <>
      <Group wrap="nowrap" align="flex-start">
        <Loader size="sm" mt={4} aria-hidden />
        <Box
          style={{ flex: 1 }}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <Text size="sm" c="dimmed">
            {count
              ? `${count}${waiting ? ` · ${message.waitingText}` : ""}`
              : waiting
                ? message.waitingText
                : message.text}
          </Text>
        </Box>
        {elapsed >= 10 && (
          <Text
            size="xs"
            c="dimmed"
            aria-live="off"
            style={{ whiteSpace: "nowrap" }}
          >
            {analysisLoadingCopy.elapsed(elapsed)}
          </Text>
        )}
      </Group>
      {count && progress && (
        <Progress
          mt="sm"
          size="xs"
          value={(progress.completed / progress.total) * 100}
          aria-label={count}
        />
      )}
    </>
  );
}
