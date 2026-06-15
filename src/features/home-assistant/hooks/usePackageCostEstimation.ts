/**
 * Auto-estimates each selected package's CAPEX/OPEX from the EU reference-data
 * lookup once, when its cost fields are still empty, then pre-fills them (the
 * user can override). Keeps the fetching/effects out of the presentational
 * selector.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { lookupPackageCosts } from "../../../services/packageCostLookup";
import { useHomeAssistant } from "./useHomeAssistant";
import { useHomeAssistantServices } from "./useHomeAssistantServices";

export interface PackageCostEstimation {
  /** Package ids whose cost estimate is currently in flight. */
  estimatingIds: ReadonlySet<string>;
  /** Per-package estimation error messages, keyed by package id. */
  errorsById: Readonly<Record<string, string>>;
  /** Clear the error for a package and re-run its estimate. */
  retry: (packageId: string) => void;
}

export function usePackageCostEstimation(): PackageCostEstimation {
  const { state, dispatch } = useHomeAssistant();
  const { building, financial } = useHomeAssistantServices();

  const [estimatingIds, setEstimatingIds] = useState<Set<string>>(new Set());
  const [errorsById, setErrorsById] = useState<Record<string, string>>({});

  // Persists across renders to guard against duplicate concurrent estimates.
  const inFlightRef = useRef<Set<string>>(new Set());
  // Packages whose one-shot auto-estimate has already been triggered; reset when
  // a package is deselected so re-selecting estimates again.
  const attemptedRef = useRef<Set<string>>(new Set());

  const { selectedPackageIds, suggestedPackages, packageFinancialInputs } =
    state;

  // Narrow inputs the estimate actually consumes, so unrelated building edits
  // don't recreate the callback (and re-run the effect).
  const buildingCountry = state.building.country;
  const buildingFloorArea = state.building.floorArea;
  const buildingProjectLifetime = state.building.projectLifetime;
  const archetype = state.estimation?.archetype;

  const clearError = useCallback((packageId: string) => {
    setErrorsById((prev) => {
      if (!(packageId in prev)) return prev;
      const next = { ...prev };
      delete next[packageId];
      return next;
    });
  }, []);

  const estimate = useCallback(
    async (packageId: string) => {
      if (inFlightRef.current.has(packageId)) return;

      const pkg = suggestedPackages.find((p) => p.id === packageId);
      if (!pkg) return;

      inFlightRef.current.add(packageId);
      setEstimatingIds((prev) => new Set(prev).add(packageId));
      clearError(packageId);

      try {
        const result = await lookupPackageCosts(
          {
            country: buildingCountry,
            archetype,
            measureIds: pkg.measureIds,
            floorArea: buildingFloorArea,
            projectLifetime: buildingProjectLifetime,
          },
          { building, financial },
        );

        dispatch({
          type: "SET_PACKAGE_COST_ESTIMATE",
          packageId,
          capex: Math.round(result.capex),
          annualMaintenanceCost: Math.round(result.annualMaintenanceCost),
        });
      } catch (error) {
        setErrorsById((prev) => ({
          ...prev,
          [packageId]:
            error instanceof Error
              ? error.message
              : "Failed to estimate costs from reference data.",
        }));
      } finally {
        inFlightRef.current.delete(packageId);
        setEstimatingIds((prev) => {
          const next = new Set(prev);
          next.delete(packageId);
          return next;
        });
      }
    },
    [
      building,
      financial,
      dispatch,
      clearError,
      suggestedPackages,
      buildingCountry,
      buildingFloorArea,
      buildingProjectLifetime,
      archetype,
    ],
  );

  useEffect(() => {
    // Forget bookkeeping for packages that are no longer selected.
    for (const id of attemptedRef.current) {
      if (!selectedPackageIds.includes(id)) {
        attemptedRef.current.delete(id);
        clearError(id);
      }
    }

    for (const packageId of selectedPackageIds) {
      const input = packageFinancialInputs[packageId];
      if (!input) continue;

      // Once the user has entered a CAPEX, a prior estimation error is moot.
      if (errorsById[packageId] && input.capex !== null) {
        clearError(packageId);
        continue;
      }

      const needsEstimate =
        input.capex === null &&
        input.annualMaintenanceCost === null &&
        !input.capexAutoEstimated &&
        !input.opexAutoEstimated;
      if (
        needsEstimate &&
        !attemptedRef.current.has(packageId) &&
        !errorsById[packageId] &&
        !inFlightRef.current.has(packageId)
      ) {
        attemptedRef.current.add(packageId);
        void estimate(packageId);
      }
    }
  }, [
    selectedPackageIds,
    packageFinancialInputs,
    errorsById,
    estimate,
    clearError,
  ]);

  // `estimate` clears any prior error for the package as it starts.
  const retry = useCallback(
    (packageId: string) => void estimate(packageId),
    [estimate],
  );

  return { estimatingIds, errorsById, retry };
}
