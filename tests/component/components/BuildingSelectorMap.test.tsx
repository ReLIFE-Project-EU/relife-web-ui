// @vitest-environment jsdom

import React, { type ReactNode } from "react";
import { MantineProvider } from "@mantine/core";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  BuildingSelectorMap,
  type BuildingSelectorMapProps,
} from "../../../src/components/building-selector/BuildingSelectorMap";
import { getArchetypeKey } from "../../../src/components/building-selector/buildingSelectorUtils";
import type { ArchetypeInfo } from "../../../src/types/forecasting";
import type { ArchetypeDetails } from "../../../src/types/archetype";

const mapView = vi.hoisted(() => ({ fitBounds: vi.fn(), setView: vi.fn() }));

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
});

vi.mock("react-leaflet", async () => {
  const { useEffect } = await import("react");
  const layer = (testId: string) =>
    function Layer({
      children,
      center,
      position,
    }: {
      children?: ReactNode;
      center?: number[];
      position?: number[];
    }) {
      return (
        <div
          data-testid={testId}
          data-position={JSON.stringify(center ?? position)}
        >
          {children}
        </div>
      );
    };
  return {
    MapContainer: function MapContainer({
      children,
      whenReady,
    }: {
      children: ReactNode;
      whenReady: () => void;
    }) {
      useEffect(() => {
        whenReady();
      }, [whenReady]);
      return <div>{children}</div>;
    },
    CircleMarker: layer("reference-marker"),
    Circle: layer("reference-highlight"),
    Marker: layer("building-marker"),
    Popup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    TileLayer: () => null,
    useMapEvents: () => mapView,
  };
});

const salzburg: ArchetypeInfo = {
  country: "Austria",
  category: "Single Family House",
  name: "SFH_1946_1969",
  latitude: 47.8095,
  longitude: 13.055,
};
const vienna: ArchetypeInfo = {
  ...salzburg,
  name: "AT_SFH_1946-1969",
  latitude: 48.2082,
  longitude: 16.3738,
};

function details(
  archetype: ArchetypeInfo,
  location = { lat: 47.8095, lng: 13.055 },
): ArchetypeDetails {
  return {
    ...archetype,
    location,
    floorArea: 120,
    numberOfFloors: 2,
    floorHeight: 2.7,
    totalWindowArea: 20,
    thermalProperties: { wallUValue: 1, roofUValue: 1, windowUValue: 2 },
    setpoints: {
      heatingSetpoint: 20,
      heatingSetback: 17,
      coolingSetpoint: 26,
      coolingSetback: 30,
    },
    bui: {} as ArchetypeDetails["bui"],
    system: {} as ArchetypeDetails["system"],
  };
}

function map(
  props: Partial<BuildingSelectorMapProps> = {},
): React.ReactElement {
  return (
    <MantineProvider>
      <BuildingSelectorMap
        lat={48.1}
        lng={14}
        archetypes={[salzburg, vienna]}
        selectedKey={null}
        accentColor="orange"
        onLocationChange={vi.fn()}
        {...props}
      />
    </MantineProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(cleanup);

describe("BuildingSelectorMap", () => {
  test("separates Salzburg and Vienna and counts countries sharing a position", () => {
    render(
      map({
        archetypes: [
          salzburg,
          vienna,
          { ...salzburg, name: "SFH_0_1945" },
          { ...salzburg, country: "Greece", name: "SFH_Greece_1946_1969" },
        ],
      }),
    );
    const markers = screen.getAllByTestId("reference-marker");
    expect(markers).toHaveLength(2);
    const atSalzburg = markers.find(
      (marker) => marker.dataset.position === "[47.8095,13.055]",
    )!;
    const atVienna = markers.find(
      (marker) => marker.dataset.position === "[48.2082,16.3738]",
    )!;
    expect(within(atSalzburg).getByText("Austria: 2")).toBeTruthy();
    expect(within(atSalzburg).getByText("Greece: 1")).toBeTruthy();
    expect(within(atSalzburg).getByText("3 archetypes available")).toBeTruthy();
    expect(
      within(atSalzburg).getByText("Reference coordinates: 47.8095, 13.0550"),
    ).toBeTruthy();
    expect(
      within(atVienna).getByText("Austria reference buildings"),
    ).toBeTruthy();
    expect(within(atVienna).getByText("1 archetype available")).toBeTruthy();
    expect(within(atVienna).queryByText("Austria: 1")).toBeNull();
  });

  test("moves only the selected identity to its detail location and keeps the user's pin", () => {
    const selected = details({
      ...salzburg,
      latitude: vienna.latitude,
      longitude: vienna.longitude,
    });
    render(
      map({
        archetypes: [
          {
            ...salzburg,
            latitude: vienna.latitude,
            longitude: vienna.longitude,
          },
          vienna,
        ],
        highlightedArchetype: selected,
        selectedKey: getArchetypeKey(selected),
      }),
    );
    const markers = screen.getAllByTestId("reference-marker");
    expect(markers).toHaveLength(2);
    expect(markers.map((marker) => marker.dataset.position)).toEqual([
      "[48.2082,16.3738]",
      "[47.8095,13.055]",
    ]);
    expect(screen.getByTestId("reference-highlight").dataset.position).toBe(
      "[47.8095,13.055]",
    );
    expect(screen.getByTestId("building-marker").dataset.position).toBe(
      "[48.1,14]",
    );
    expect(mapView.fitBounds).toHaveBeenCalledTimes(1);
    const bounds = mapView.fitBounds.mock.calls[0][0];
    expect(bounds.contains([48.1, 14])).toBe(true);
    expect(bounds.contains([47.8095, 13.055])).toBe(true);
    expect(bounds.contains([48.2082, 16.3738])).toBe(false);
  });

  test("does not reframe equivalent coordinates on rerender, but reframes a changed location", () => {
    const selectedKey = getArchetypeKey(salzburg);
    const view = render(
      map({ highlightedArchetype: details(salzburg), selectedKey }),
    );
    expect(mapView.fitBounds).toHaveBeenCalledTimes(1);
    view.rerender(
      map({ highlightedArchetype: details(salzburg), selectedKey }),
    );
    expect(mapView.fitBounds).toHaveBeenCalledTimes(1);
    view.rerender(
      map({
        highlightedArchetype: details(salzburg, { lat: 47.9, lng: 13.1 }),
        selectedKey,
      }),
    );
    expect(mapView.fitBounds).toHaveBeenCalledTimes(2);
  });

  test("quietly omits unavailable positions and adds a selected reference from loaded details", () => {
    const legacy = { ...salzburg, latitude: undefined, longitude: undefined };
    const view = render(
      map({
        archetypes: [
          legacy,
          { ...vienna, latitude: null },
          { ...vienna, name: "invalid", latitude: 91 },
        ],
      }),
    );
    expect(screen.queryAllByTestId("reference-marker")).toHaveLength(0);
    expect(screen.queryByRole("alert")).toBeNull();
    view.rerender(
      map({
        archetypes: [legacy],
        highlightedArchetype: details(legacy),
        selectedKey: getArchetypeKey(legacy),
      }),
    );
    expect(screen.getAllByTestId("reference-marker")).toHaveLength(1);
    expect(screen.getByTestId("reference-highlight").dataset.position).toBe(
      "[47.8095,13.055]",
    );
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
