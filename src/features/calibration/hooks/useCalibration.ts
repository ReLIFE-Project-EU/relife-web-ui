import { useEffect, useRef, useState } from "react";
import type { ArchetypeDetails } from "../../../types/archetype";
import {
  errorMessage,
  runCalibration,
  type CalibrationUpdate,
  type CheckState,
  type CostValues,
  type EnergyIntensities,
} from "../services/calibrationService";

export interface CalibrationResults {
  costs: Record<string, CheckState<CostValues>>;
  buildings: Record<string, CheckState<ArchetypeDetails>>;
  energy: Record<string, CheckState<EnergyIntensities>>;
}

const emptyResults = (): CalibrationResults => ({
  costs: {},
  buildings: {},
  energy: {},
});

export function useCalibration() {
  const [results, setResults] = useState(emptyResults);
  const [running, setRunning] = useState(false);
  const [completedAt, setCompletedAt] = useState<Date>();
  const [error, setError] = useState<string>();
  const activeRun = useRef(0);
  const runningRef = useRef(false);

  useEffect(
    () => () => {
      activeRun.current += 1;
    },
    [],
  );

  async function run() {
    if (runningRef.current) return;
    runningRef.current = true;
    const runId = ++activeRun.current;
    setRunning(true);
    setResults(emptyResults());
    setCompletedAt(undefined);
    setError(undefined);

    const update = (event: CalibrationUpdate) => {
      if (activeRun.current !== runId) return;
      setResults((previous) => {
        switch (event.kind) {
          case "cost":
            return {
              ...previous,
              costs: { ...previous.costs, [event.id]: event.state },
            };
          case "building":
            return {
              ...previous,
              buildings: { ...previous.buildings, [event.id]: event.state },
            };
          case "energy":
            return {
              ...previous,
              energy: { ...previous.energy, [event.id]: event.state },
            };
        }
      });
    };

    try {
      await runCalibration(update);
    } catch (cause) {
      if (activeRun.current === runId) setError(errorMessage(cause));
    } finally {
      if (activeRun.current === runId) {
        setCompletedAt(new Date());
        setRunning(false);
        runningRef.current = false;
      }
    }
  }

  const checks = [
    ...Object.values(results.costs),
    ...Object.values(results.energy),
  ];
  const completed = checks.filter((check) => check.status !== "loading").length;
  const failed = checks.filter((check) => check.status === "error").length;
  return { results, running, completedAt, error, completed, failed, run };
}
