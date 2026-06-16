import { Alert, Box, Card, SegmentedControl, Stack, Text } from "@mantine/core";
import { useDebouncedValue, useDisclosure } from "@mantine/hooks";
import { IconAlertTriangle } from "@tabler/icons-react";
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  ArchetypeDetails,
  BuildingModifications,
} from "../../types/archetype";
import type { ArchetypeInfo } from "../../types/forecasting";
import type { ArchetypeMatchResult } from "../../services/types";
import { constructionPeriodsEqual } from "../../utils/apiMappings";
import { validateModifications } from "../../utils/archetypeModifier";
import { checkAreaArchetypeMismatch } from "../../utils/inputSanityChecks";
import { AdjustmentPanel } from "./AdjustmentPanel";
import { BrowseMode } from "./BrowseMode";
import { MapMode } from "./MapMode";
import { buildMatchFallbackText } from "./matchMessages";
import { SELECTOR_COPY } from "./selectorConfig";
import { useArchetypeCatalog } from "./useArchetypeCatalog";
import {
  buildDraftFromDetails,
  buildModifications,
  buildSelection,
  getArchetypeKey,
  getArchetypePeriod,
  getDisplayCountry,
} from "./buildingSelectorUtils";
import type {
  BuildingSelectorAdjustmentScope,
  BuildingSelectorDraft,
  BuildingSelectorHandle,
  BuildingSelectorHost,
  BuildingSelectorInitialValue,
  BuildingSelectorMode,
  BuildingSelectorSelection,
  BuildingSelectorService,
} from "./types";

const BROWSE_RESULT_LIMIT = 10;

function modificationsEqual(
  left: BuildingModifications | undefined,
  right: BuildingModifications | undefined,
): boolean {
  if (left === right) return true;
  if (!left || !right) return false;

  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  if (leftKeys.length !== rightKeys.length) return false;

  return leftKeys.every((key) => {
    const leftValue = left[key as keyof BuildingModifications];
    const rightValue = right[key as keyof BuildingModifications];
    if (typeof leftValue === "object" && typeof rightValue === "object") {
      return JSON.stringify(leftValue) === JSON.stringify(rightValue);
    }
    return leftValue === rightValue;
  });
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function buildInitialValueSignature(
  initialValue: BuildingSelectorInitialValue | undefined,
): string | null {
  if (!initialValue?.archetype) return null;

  return JSON.stringify({
    mode: initialValue.mode ?? "browse",
    archetypeKey: getArchetypeKey(initialValue.archetype),
    country: initialValue.country ?? null,
    category: initialValue.category ?? null,
    constructionPeriod: initialValue.constructionPeriod ?? null,
    lat: initialValue.coords?.lat ?? null,
    lng: initialValue.coords?.lng ?? null,
    floorArea: initialValue.floorArea ?? null,
    numberOfFloors: initialValue.numberOfFloors ?? null,
    apartmentLocation: initialValue.apartmentLocation ?? null,
    modifications: initialValue.modifications ?? null,
  });
}

interface BuildingSelectorProps {
  service: BuildingSelectorService;
  host: BuildingSelectorHost;
  adjustmentScope: BuildingSelectorAdjustmentScope;
  compact?: boolean;
  initialValue?: BuildingSelectorInitialValue;
  onSelectionChange: (selection: BuildingSelectorSelection | null) => void;
  ref?: React.Ref<BuildingSelectorHandle>;
}

export function BuildingSelector({
  service,
  host,
  adjustmentScope,
  compact = false,
  initialValue,
  onSelectionChange,
  ref,
}: BuildingSelectorProps) {
  const copy = SELECTOR_COPY[host];
  const [mode, setMode] = useState<BuildingSelectorMode>(
    initialValue?.mode ?? "browse",
  );
  const {
    archetypes,
    detailsByKey,
    detailErrorsByKey,
    isCatalogLoading,
    catalogError,
    cacheDetails,
    ensureDetails,
    preloadDetails,
  } = useArchetypeCatalog(service);

  const [search, setSearch] = useState("");
  const [browseCountry, setBrowseCountry] = useState<string | null>(null);
  const [browseCategory, setBrowseCategory] = useState<string | null>(null);
  const [browsePeriod, setBrowsePeriod] = useState<string | null>(null);
  const [browseSelectingKey, setBrowseSelectingKey] = useState<string | null>(
    null,
  );
  const [browseError, setBrowseError] = useState<string | null>(null);

  const [mapLat, setMapLat] = useState<number | null>(
    typeof initialValue?.coords?.lat === "number"
      ? initialValue.coords.lat
      : null,
  );
  const [mapLng, setMapLng] = useState<number | null>(
    typeof initialValue?.coords?.lng === "number"
      ? initialValue.coords.lng
      : null,
  );
  const [debouncedLat] = useDebouncedValue(mapLat, 400);
  const [debouncedLng] = useDebouncedValue(mapLng, 400);
  const [mapCategories, setMapCategories] = useState<string[]>([]);
  const [mapCategory, setMapCategory] = useState<string | null>(
    initialValue?.category ?? null,
  );
  const [mapPeriods, setMapPeriods] = useState<string[]>([]);
  const [mapPeriod, setMapPeriod] = useState<string | null>(
    initialValue?.constructionPeriod ?? null,
  );

  const [selectedDetails, setSelectedDetails] =
    useState<ArchetypeDetails | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [draft, setDraft] = useState<BuildingSelectorDraft | null>(null);
  const [matchResult, setMatchResult] = useState<ArchetypeMatchResult | null>(
    null,
  );
  const [isMatching, setIsMatching] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [appliedModifications, setAppliedModifications] = useState<
    BuildingModifications | undefined
  >(undefined);
  const [adjustmentsOpen, { toggle: toggleAdjustments }] = useDisclosure(false);
  const periodRequestIdRef = useRef(0);
  const matchRequestIdRef = useRef(0);
  const lastInitialValueSignatureRef = useRef<string | null>(null);

  const detectedCountry = useMemo(() => {
    if (debouncedLat === null || debouncedLng === null) return null;
    return service.detectCountryFromCoords({
      lat: debouncedLat,
      lng: debouncedLng,
    });
  }, [debouncedLat, debouncedLng, service]);

  const initialValueSignature = useMemo(
    () => buildInitialValueSignature(initialValue),
    [initialValue],
  );

  const clearSelection = useCallback(
    (notify = true) => {
      setSelectedDetails(null);
      setSelectedKey(null);
      setDraft(null);
      setMatchResult(null);
      setMatchError(null);
      setAppliedModifications(undefined);
      if (notify) onSelectionChange(null);
    },
    [onSelectionChange],
  );

  useImperativeHandle(ref, () => ({
    reset: () => {
      clearSelection(true);
      setMode("browse");
      setSearch("");
      setBrowseCountry(null);
      setBrowseCategory(null);
      setBrowsePeriod(null);
      setMapLat(null);
      setMapLng(null);
      setMapCategory(null);
      setMapPeriod(null);
      setMapCategories([]);
      setMapPeriods([]);
      setBrowseError(null);
      setIsMatching(false);
      lastInitialValueSignatureRef.current = null;
    },
  }));

  const publishSelection = useCallback(
    (params: {
      mode: BuildingSelectorMode;
      details: ArchetypeDetails;
      nextDraft: BuildingSelectorDraft;
      coords: { lat: number; lng: number };
      country: string;
      constructionPeriod: string;
      nextMatchResult?: ArchetypeMatchResult;
    }) => {
      const modifications =
        buildModifications(params.details, params.nextDraft, adjustmentScope) ??
        undefined;
      setAppliedModifications(modifications);
      onSelectionChange(
        buildSelection({
          mode: params.mode,
          details: params.details,
          draft: params.nextDraft,
          scope: adjustmentScope,
          country: params.country,
          constructionPeriod: params.constructionPeriod,
          coords: params.coords,
          matchResult: params.nextMatchResult,
        }),
      );
    },
    [adjustmentScope, onSelectionChange],
  );

  useEffect(() => {
    if (!initialValueSignature || !initialValue?.archetype) {
      if (lastInitialValueSignatureRef.current !== null) {
        lastInitialValueSignatureRef.current = null;
        clearSelection(false);
        setMapLat(
          typeof initialValue?.coords?.lat === "number"
            ? initialValue.coords.lat
            : null,
        );
        setMapLng(
          typeof initialValue?.coords?.lng === "number"
            ? initialValue.coords.lng
            : null,
        );
        setMapCategory(initialValue?.category ?? null);
        setMapPeriod(initialValue?.constructionPeriod ?? null);
      }
      return;
    }

    if (lastInitialValueSignatureRef.current === initialValueSignature) return;
    lastInitialValueSignatureRef.current = initialValueSignature;
    let cancelled = false;

    service
      .getArchetypeDetails(initialValue.archetype)
      .then((details) => {
        if (cancelled) return;
        const key = getArchetypeKey(details);
        const period =
          initialValue.constructionPeriod ?? getArchetypePeriod(details);
        const nextDraft = buildDraftFromDetails(
          details,
          initialValue.modifications,
          initialValue.apartmentLocation,
        );
        if (typeof initialValue.floorArea === "number") {
          nextDraft.floorArea = initialValue.floorArea;
        }
        if (typeof initialValue.numberOfFloors === "number") {
          nextDraft.numberOfFloors = initialValue.numberOfFloors;
        }

        cacheDetails(details);
        setSelectedDetails(details);
        setSelectedKey(key);
        setDraft(nextDraft);
        setAppliedModifications(initialValue.modifications ?? undefined);
        setBrowseCategory(initialValue.category ?? details.category);
        setBrowsePeriod(period);
        setBrowseCountry(
          getDisplayCountry(initialValue.country ?? details.country),
        );
        setMapCategory(initialValue.category ?? details.category);
        setMapPeriod(period);
        setMapLat(initialValue.coords?.lat ?? details.location.lat);
        setMapLng(initialValue.coords?.lng ?? details.location.lng);
      })
      .catch(() => {
        if (!cancelled) clearSelection(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    cacheDetails,
    clearSelection,
    initialValue,
    initialValueSignature,
    service,
  ]);

  const browseFiltered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return archetypes.filter((archetype) => {
      const country = getDisplayCountry(archetype.country);
      const period = getArchetypePeriod(archetype);
      if (browseCountry && country !== browseCountry) return false;
      if (browseCategory && archetype.category !== browseCategory) return false;
      if (browsePeriod && period !== browsePeriod) return false;
      if (!query) return true;

      return `${country} ${archetype.category} ${period} ${archetype.name}`
        .toLowerCase()
        .includes(query);
    });
  }, [archetypes, browseCategory, browseCountry, browsePeriod, search]);

  const visibleBrowseItems = useMemo(
    () => browseFiltered.slice(0, BROWSE_RESULT_LIMIT),
    [browseFiltered],
  );

  useEffect(() => {
    return preloadDetails(visibleBrowseItems);
  }, [preloadDetails, visibleBrowseItems]);

  useEffect(() => {
    let cancelled = false;
    const coords =
      debouncedLat !== null && debouncedLng !== null
        ? { lat: debouncedLat, lng: debouncedLng }
        : null;

    service
      .getAvailableCategories(coords)
      .then((categories) => {
        if (!cancelled) setMapCategories(categories);
      })
      .catch(() => {
        if (!cancelled) setMapCategories([]);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedLat, debouncedLng, service]);

  useEffect(() => {
    const requestId = ++periodRequestIdRef.current;
    if (!mapCategory) {
      setMapPeriods([]);
      return;
    }

    service
      .getAvailablePeriods(mapCategory, detectedCountry ?? undefined)
      .then((result) => {
        if (requestId !== periodRequestIdRef.current) return;
        setMapPeriods(result.periods);
        const shouldReplace =
          !mapPeriod ||
          !result.periods.some((period) =>
            constructionPeriodsEqual(period, mapPeriod),
          );
        if (shouldReplace && result.recommendedPeriod) {
          setMapPeriod(result.recommendedPeriod);
        }
      })
      .catch(() => {
        if (requestId === periodRequestIdRef.current) setMapPeriods([]);
      });
  }, [detectedCountry, mapCategory, mapPeriod, service]);

  useEffect(() => {
    if (
      mode !== "map" ||
      !mapCategory ||
      !mapPeriod ||
      debouncedLat === null ||
      debouncedLng === null
    ) {
      return;
    }

    const requestId = ++matchRequestIdRef.current;
    clearSelection(false);
    setIsMatching(true);

    service
      .findMatchingArchetype(mapCategory, mapPeriod, {
        lat: debouncedLat,
        lng: debouncedLng,
      })
      .then(async (result) => {
        if (requestId !== matchRequestIdRef.current) return;
        if (!result) {
          onSelectionChange(null);
          setMatchError("No reference building matched these inputs.");
          return;
        }

        const details = await service.getArchetypeDetails(result.archetype);
        if (requestId !== matchRequestIdRef.current) return;

        const key = getArchetypeKey(details);
        const nextDraft = buildDraftFromDetails(details);
        cacheDetails(details);
        setSelectedDetails(details);
        setSelectedKey(key);
        setDraft(nextDraft);
        setMatchResult(result);
        publishSelection({
          mode: "map",
          details,
          nextDraft,
          coords: { lat: debouncedLat, lng: debouncedLng },
          country:
            getDisplayCountry(result.detectedCountry) ||
            getDisplayCountry(details.country),
          constructionPeriod: mapPeriod,
          nextMatchResult: result,
        });
      })
      .catch((error) => {
        if (requestId !== matchRequestIdRef.current) return;
        clearSelection(false);
        onSelectionChange(null);
        setMatchError(
          getErrorMessage(error, "Failed to match a reference building."),
        );
      })
      .finally(() => {
        if (requestId === matchRequestIdRef.current) setIsMatching(false);
      });
  }, [
    cacheDetails,
    clearSelection,
    debouncedLat,
    debouncedLng,
    mapCategory,
    mapPeriod,
    mode,
    onSelectionChange,
    publishSelection,
    service,
  ]);

  const handleBrowseSelect = useCallback(
    async (archetype: ArchetypeInfo) => {
      const key = getArchetypeKey(archetype);
      if (key === selectedKey) {
        clearSelection();
        return;
      }

      setBrowseSelectingKey(key);
      setMatchError(null);
      setBrowseError(null);
      try {
        const details = await ensureDetails(archetype);
        const nextDraft = buildDraftFromDetails(details);
        const period = getArchetypePeriod(details);
        setSelectedDetails(details);
        setSelectedKey(key);
        setDraft(nextDraft);
        setMatchResult(null);
        publishSelection({
          mode: "browse",
          details,
          nextDraft,
          coords: details.location,
          country: getDisplayCountry(details.country),
          constructionPeriod: period,
        });
      } catch (error) {
        setBrowseError(
          getErrorMessage(error, "Failed to load reference building details."),
        );
      } finally {
        setBrowseSelectingKey(null);
      }
    },
    [clearSelection, ensureDetails, publishSelection, selectedKey],
  );

  const handleMapLocationChange = useCallback(
    (nextLat: number, nextLng: number) => {
      setMapLat(Math.round(nextLat * 10000) / 10000);
      setMapLng(Math.round(nextLng * 10000) / 10000);
      clearSelection(false);
    },
    [clearSelection],
  );

  const handleMapCategoryChange = useCallback(
    (value: string | null) => {
      setMapCategory(value);
      setMapPeriod(null);
      clearSelection(false);
    },
    [clearSelection],
  );

  const handleMapPeriodChange = useCallback(
    (value: string | null) => {
      setMapPeriod(value);
      clearSelection(false);
    },
    [clearSelection],
  );

  const applyAdjustments = useCallback(() => {
    if (!selectedDetails || !draft) return;
    const validation = validateModifications(
      buildModifications(selectedDetails, draft, adjustmentScope) ?? {},
      selectedDetails,
    );
    if (!validation.isValid) return;

    const coords =
      mode === "browse"
        ? selectedDetails.location
        : {
            lat: mapLat ?? selectedDetails.location.lat,
            lng: mapLng ?? selectedDetails.location.lng,
          };
    const country =
      mode === "map"
        ? getDisplayCountry(matchResult?.detectedCountry) ||
          getDisplayCountry(selectedDetails.country)
        : getDisplayCountry(selectedDetails.country);

    publishSelection({
      mode,
      details: selectedDetails,
      nextDraft: draft,
      coords,
      country,
      constructionPeriod:
        mode === "map"
          ? (mapPeriod ?? "")
          : getArchetypePeriod(selectedDetails),
      nextMatchResult: matchResult ?? undefined,
    });
  }, [
    adjustmentScope,
    draft,
    mapLat,
    mapLng,
    mapPeriod,
    matchResult,
    mode,
    publishSelection,
    selectedDetails,
  ]);

  const activeModifications =
    selectedDetails && draft
      ? buildModifications(selectedDetails, draft, adjustmentScope)
      : undefined;
  const hasUnsavedChanges = !modificationsEqual(
    activeModifications,
    appliedModifications,
  );
  const validationResult = selectedDetails
    ? validateModifications(activeModifications ?? {}, selectedDetails)
    : { isValid: true, errors: [] };
  const areaWarning =
    selectedDetails && draft && typeof draft.floorArea === "number"
      ? checkAreaArchetypeMismatch(draft.floorArea, selectedDetails.floorArea)
      : { warning: false, message: "" };
  const matchFallbackText = buildMatchFallbackText(
    matchResult,
    selectedDetails,
    mapPeriod,
  );

  return (
    <Card withBorder radius="md" p={compact ? "md" : "lg"}>
      <Stack gap="md">
        <Box>
          <Text fw={700} size={compact ? "md" : "lg"}>
            {copy.title}
          </Text>
          <Text c="dimmed" size="sm">
            {copy.description}
          </Text>
        </Box>

        <SegmentedControl
          value={mode}
          onChange={(value) => {
            const nextMode = value as BuildingSelectorMode;
            setMode(nextMode);
            clearSelection();
            if (nextMode === "map") {
              setMapLat(null);
              setMapLng(null);
              setMapCategory(null);
              setMapPeriod(null);
              setMapCategories([]);
              setMapPeriods([]);
            } else {
              setSearch("");
              setBrowseCountry(null);
              setBrowseCategory(null);
              setBrowsePeriod(null);
            }
          }}
          data={[
            { value: "browse", label: copy.browseLabel },
            { value: "map", label: copy.mapLabel },
          ]}
          fullWidth={compact}
        />

        {catalogError && (
          <Alert
            color="red"
            variant="light"
            icon={<IconAlertTriangle size={16} />}
          >
            {catalogError}
          </Alert>
        )}

        {mode === "browse" ? (
          <BrowseMode
            copy={copy}
            archetypes={archetypes}
            detailsByKey={detailsByKey}
            detailErrorsByKey={detailErrorsByKey}
            visibleItems={visibleBrowseItems}
            totalCount={browseFiltered.length}
            selectedKey={selectedKey}
            selectingKey={browseSelectingKey}
            isLoading={isCatalogLoading}
            browseError={browseError}
            search={search}
            country={browseCountry}
            category={browseCategory}
            period={browsePeriod}
            onSearchChange={setSearch}
            onCountryChange={setBrowseCountry}
            onCategoryChange={setBrowseCategory}
            onPeriodChange={setBrowsePeriod}
            onSelect={(archetype) => void handleBrowseSelect(archetype)}
          />
        ) : (
          <MapMode
            compact={compact}
            archetypes={archetypes}
            isCatalogLoading={isCatalogLoading}
            lat={mapLat}
            lng={mapLng}
            detectedCountry={detectedCountry}
            category={mapCategory}
            period={mapPeriod}
            categories={mapCategories}
            periods={mapPeriods}
            selectedDetails={selectedDetails}
            selectedKey={selectedKey}
            matchResult={matchResult}
            isMatching={isMatching}
            matchError={matchError}
            accentColor={copy.accentColor}
            fallbackText={matchFallbackText}
            onCategoryChange={handleMapCategoryChange}
            onPeriodChange={handleMapPeriodChange}
            onLocationChange={handleMapLocationChange}
          />
        )}

        {selectedDetails && draft && (
          <AdjustmentPanel
            copy={copy}
            scope={adjustmentScope}
            details={selectedDetails}
            draft={draft}
            mode={mode}
            mapPeriod={mapPeriod}
            activeModifications={activeModifications}
            hasUnsavedChanges={hasUnsavedChanges}
            validation={validationResult}
            areaWarning={areaWarning}
            opened={adjustmentsOpen}
            onToggle={toggleAdjustments}
            onDraftChange={(patch) =>
              setDraft((current) =>
                current ? { ...current, ...patch } : current,
              )
            }
            onApply={applyAdjustments}
          />
        )}
      </Stack>
    </Card>
  );
}
