// @vitest-environment jsdom

import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { afterEach, describe, expect, test, vi } from "vitest";
import { BuildingSelector } from "../../../src/components/building-selector";
import type {
  BuildingSelectorInitialValue,
  BuildingSelectorService,
} from "../../../src/components/building-selector";
import { theme } from "../../../src/theme";
import type { ArchetypeMatchResult } from "../../../src/services/types";
import type { ArchetypeDetails } from "../../../src/types/archetype";
import type { ArchetypeInfo } from "../../../src/types/forecasting";

vi.mock(
  "../../../src/components/building-selector/BuildingSelectorMap",
  () => ({
    BuildingSelectorMap: ({
      onLocationChange,
    }: {
      onLocationChange: (lat: number, lng: number) => void;
    }) => (
      <button type="button" onClick={() => onLocationChange(45.1234, 3.4321)}>
        Mock map click
      </button>
    ),
  }),
);

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

Object.defineProperty(window, "ResizeObserver", {
  writable: true,
  value: ResizeObserverMock,
});

afterEach(() => {
  cleanup();
});

const franceArchetype: ArchetypeInfo = {
  category: "Single Family House",
  country: "France",
  name: "FR_SFH_1980_1989",
};

const germanyArchetype: ArchetypeInfo = {
  category: "Single Family House",
  country: "Germany",
  name: "DE_SFH_1990_1999",
};

function createDetails(
  archetype: ArchetypeInfo,
  overrides: Partial<ArchetypeDetails> = {},
): ArchetypeDetails {
  return {
    ...archetype,
    floorArea: 120,
    numberOfFloors: 2,
    floorHeight: 2.8,
    totalWindowArea: 18,
    thermalProperties: {
      wallUValue: 1.2,
      roofUValue: 0.8,
      windowUValue: 2.2,
    },
    setpoints: {
      heatingSetpoint: 20,
      heatingSetback: 17,
      coolingSetpoint: 26,
      coolingSetback: 30,
    },
    location: {
      lat: archetype.country === "Germany" ? 52.52 : 48.8566,
      lng: archetype.country === "Germany" ? 13.405 : 2.3522,
    },
    bui: {} as ArchetypeDetails["bui"],
    system: {} as ArchetypeDetails["system"],
    ...overrides,
  };
}

function createMatchResult(
  archetype: ArchetypeInfo = franceArchetype,
): ArchetypeMatchResult {
  return {
    archetype,
    detectedCountry: archetype.country,
    matchQuality: "excellent",
    periodRelaxed: false,
    score: 111,
    scoreBreakdown: {
      countryScore: 1,
      periodScore: 1,
      geoScore: 1,
      total: 111,
    },
    alternatives: [],
  };
}

function createService(
  overrides: Partial<BuildingSelectorService> = {},
): BuildingSelectorService {
  const archetypes = [franceArchetype, germanyArchetype];
  const detailsByName = new Map(
    archetypes.map((archetype) => [archetype.name, createDetails(archetype)]),
  );

  return {
    detectCountryFromCoords: vi.fn(() => "France"),
    findMatchingArchetype: vi.fn(async () => createMatchResult()),
    getArchetypeDetails: vi.fn(async (archetype) => {
      const details = detailsByName.get(archetype.name);
      if (!details) throw new Error("Unknown archetype");
      return details;
    }),
    getArchetypes: vi.fn(async () => archetypes),
    getAvailableCategories: vi.fn(async () => ["Single Family House"]),
    getAvailablePeriods: vi.fn(async () => ({
      periods: ["1980-1989", "1990-1999"],
      recommendedPeriod: "1980-1989",
      detectedCountry: "France",
      sourceCountry: "France",
      scope: "local" as const,
      reason: null,
    })),
    ...overrides,
  };
}

function renderSelector({
  service = createService(),
  initialValue,
  onSelectionChange = vi.fn(),
}: {
  service?: BuildingSelectorService;
  initialValue?: BuildingSelectorInitialValue;
  onSelectionChange?: Parameters<
    typeof BuildingSelector
  >[0]["onSelectionChange"];
} = {}) {
  const view = render(
    <React.Fragment>
      <MantineProvider theme={theme}>
        <BuildingSelector
          service={service}
          host="hra"
          adjustmentScope="limited"
          initialValue={initialValue}
          onSelectionChange={onSelectionChange}
        />
      </MantineProvider>
    </React.Fragment>,
  );

  return { ...view, onSelectionChange };
}

describe("BuildingSelector", () => {
  test("reinitializes when initialValue changes while mounted", async () => {
    const service = createService();
    const initialValue: BuildingSelectorInitialValue = {
      archetype: franceArchetype,
      category: franceArchetype.category,
      constructionPeriod: "1980-1989",
      country: "France",
    };
    const nextInitialValue: BuildingSelectorInitialValue = {
      archetype: germanyArchetype,
      category: germanyArchetype.category,
      constructionPeriod: "1990-1999",
      country: "Germany",
    };

    const { rerender } = renderSelector({ service, initialValue });

    await waitFor(() =>
      expect(screen.queryAllByText("France").length).toBeGreaterThan(0),
    );
    rerender(
      <MantineProvider theme={theme}>
        <BuildingSelector
          service={service}
          host="hra"
          adjustmentScope="limited"
          initialValue={nextInitialValue}
          onSelectionChange={vi.fn()}
        />
      </MantineProvider>,
    );

    await waitFor(() =>
      expect(screen.queryAllByText("Germany").length).toBeGreaterThan(0),
    );
    expect(service.getArchetypeDetails).toHaveBeenCalledWith(germanyArchetype);
  });

  test("does not notify null while map inputs are being edited", async () => {
    const service = createService();
    const onSelectionChange = vi.fn();
    const initialValue: BuildingSelectorInitialValue = {
      mode: "map",
      coords: { lat: 48.8566, lng: 2.3522 },
      archetype: franceArchetype,
      category: franceArchetype.category,
      constructionPeriod: "1980-1989",
      country: "France",
    };
    renderSelector({ service, initialValue, onSelectionChange });

    await waitFor(() => expect(onSelectionChange).toHaveBeenCalled());
    onSelectionChange.mockClear();

    fireEvent.click(screen.getByRole("button", { name: "Mock map click" }));

    await waitFor(
      () =>
        expect(service.findMatchingArchetype).toHaveBeenCalledWith(
          "Single Family House",
          "1980-1989",
          { lat: 45.1234, lng: 3.4321 },
        ),
      { timeout: 1_500 },
    );
    await waitFor(() => expect(onSelectionChange).toHaveBeenCalled());
    expect(
      onSelectionChange.mock.calls.some(([selection]) => selection === null),
    ).toBe(false);
  });
});
