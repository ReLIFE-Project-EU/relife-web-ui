import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Circle,
  CircleMarker,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import { Box, Center, Loader, Stack, Text } from "@mantine/core";
import type { ArchetypeInfo } from "../../types/forecasting";
import type { ArchetypeDetails } from "../../types/archetype";
import { getCountryDisplayName } from "../../utils/countries";
import { getArchetypeLocation } from "../../constants/archetypeLocations";
import { getArchetypeKey } from "./buildingSelectorUtils";
import { formatCoords } from "./selectorConfig";

import "leaflet/dist/leaflet.css";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

const pinIcon = new L.Icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const DEFAULT_CENTER: [number, number] = [48.0, 12.0];
const DEFAULT_ZOOM = 4;

function MapClickHandler({
  onMapClick,
}: {
  onMapClick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click: (event) => {
      onMapClick(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

function MapViewUpdater({
  lat,
  lng,
  selectedKey,
  referenceLat,
  referenceLng,
}: {
  lat: number | null;
  lng: number | null;
  selectedKey: string | null;
  referenceLat: number | null;
  referenceLng: number | null;
}) {
  const map = useMapEvents({});

  useEffect(() => {
    if (
      !selectedKey ||
      lat === null ||
      lng === null ||
      referenceLat === null ||
      referenceLng === null
    ) {
      return;
    }

    const bounds = L.latLngBounds([lat, lng], [referenceLat, referenceLng]);

    if (bounds.getNorthEast().equals(bounds.getSouthWest())) {
      map.setView([lat, lng], 10);
      return;
    }

    map.fitBounds(bounds, { padding: [48, 48] });
  }, [selectedKey, referenceLat, referenceLng, lat, lng, map]);

  return null;
}

function MapFrame({
  compact,
  children,
}: {
  compact: boolean;
  children: ReactNode;
}) {
  return (
    <Box
      h={compact ? 240 : 420}
      style={{
        border: "1px solid var(--mantine-color-gray-3)",
        borderRadius: "var(--mantine-radius-md)",
        overflow: "hidden",
        position: "relative",
        zIndex: 0,
        isolation: "isolate",
      }}
    >
      {children}
    </Box>
  );
}

export interface BuildingSelectorMapProps {
  lat: number | null;
  lng: number | null;
  archetypes: ArchetypeInfo[];
  highlightedArchetype?: ArchetypeDetails | null;
  selectedKey: string | null;
  accentColor: string;
  compact?: boolean;
  loading?: boolean;
  onLocationChange: (lat: number, lng: number) => void;
}

export function BuildingSelectorMap({
  lat,
  lng,
  archetypes,
  highlightedArchetype,
  selectedKey,
  accentColor,
  compact = false,
  loading = false,
  onLocationChange,
}: BuildingSelectorMapProps) {
  const [mapReady, setMapReady] = useState(false);

  const center: [number, number] =
    lat !== null && lng !== null ? [lat, lng] : DEFAULT_CENTER;

  const referenceMarkers = useMemo(() => {
    const byKey = new Map(
      archetypes.map((archetype) => [getArchetypeKey(archetype), archetype]),
    );
    if (highlightedArchetype) {
      byKey.set(getArchetypeKey(highlightedArchetype), highlightedArchetype);
    }
    const byLocation = new Map<
      string,
      { lat: number; lng: number; archetypes: ArchetypeInfo[] }
    >();

    byKey.forEach((archetype) => {
      const coords = getArchetypeLocation(archetype);
      if (!coords) return;
      const key = `${coords.lat},${coords.lng}`;
      const current = byLocation.get(key);
      if (current) {
        current.archetypes.push(archetype);
      } else {
        byLocation.set(key, { ...coords, archetypes: [archetype] });
      }
    });

    return Array.from(byLocation.values());
  }, [archetypes, highlightedArchetype]);

  const highlightedCoords = highlightedArchetype
    ? getArchetypeLocation(highlightedArchetype)
    : undefined;
  const referenceLat = highlightedCoords?.lat ?? null;
  const referenceLng = highlightedCoords?.lng ?? null;

  const sortedReferenceMarkers = useMemo(() => {
    return referenceMarkers
      .map((marker) => ({
        ...marker,
        isSelected: referenceLat === marker.lat && referenceLng === marker.lng,
      }))
      .sort((a, b) => Number(a.isSelected) - Number(b.isSelected));
  }, [referenceMarkers, referenceLat, referenceLng]);

  if (loading) {
    return (
      <MapFrame compact={compact}>
        <Center h="100%">
          <Stack align="center" gap="xs">
            <Loader size="sm" />
            <Text size="sm" c="dimmed">
              Loading map...
            </Text>
          </Stack>
        </Center>
      </MapFrame>
    );
  }

  return (
    <MapFrame compact={compact}>
      <MapContainer
        center={center}
        zoom={lat !== null && lng !== null ? 6 : DEFAULT_ZOOM}
        style={{ height: "100%", width: "100%" }}
        whenReady={() => setMapReady(true)}
        zoomControl={!compact}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onMapClick={onLocationChange} />
        {mapReady && (
          <MapViewUpdater
            lat={lat}
            lng={lng}
            selectedKey={selectedKey}
            referenceLat={referenceLat}
            referenceLng={referenceLng}
          />
        )}

        {lat !== null && lng !== null && (
          <Marker position={[lat, lng]} icon={pinIcon} zIndexOffset={1000}>
            <Popup>
              <Text size="sm" fw={500}>
                Selected building location
              </Text>
              <Text size="xs" c="dimmed">
                Lat: {lat.toFixed(4)}, Lng: {lng.toFixed(4)}
              </Text>
            </Popup>
          </Marker>
        )}

        {sortedReferenceMarkers.map((marker) => {
          const { isSelected } = marker;
          const countryCounts = new Map<string, number>();
          marker.archetypes.forEach((archetype) => {
            const country =
              getCountryDisplayName(archetype.country) ?? archetype.country;
            countryCounts.set(country, (countryCounts.get(country) ?? 0) + 1);
          });
          const countries = Array.from(countryCounts);

          return (
            <Box
              key={`${marker.lat},${marker.lng}`}
              component="span"
              style={{ display: "contents" }}
            >
              {isSelected && (
                <Circle
                  center={[marker.lat, marker.lng]}
                  radius={15000}
                  pathOptions={{
                    color: `var(--mantine-color-${accentColor}-5)`,
                    weight: 2,
                    fillColor: `var(--mantine-color-${accentColor}-2)`,
                    fillOpacity: 0.15,
                  }}
                />
              )}
              <CircleMarker
                center={[marker.lat, marker.lng]}
                radius={isSelected ? 10 : 6}
                pathOptions={{
                  color: isSelected
                    ? `var(--mantine-color-${accentColor}-5)`
                    : "var(--mantine-color-blue-2)",
                  weight: isSelected ? 2 : 1,
                  fillColor: isSelected
                    ? `var(--mantine-color-${accentColor}-7)`
                    : "var(--mantine-color-blue-4)",
                  fillOpacity: isSelected ? 1.0 : 0.8,
                }}
              >
                <Popup>
                  <Text size="sm" fw={500}>
                    {countries.length === 1
                      ? `${countries[0][0]} reference buildings`
                      : "Reference buildings"}
                  </Text>
                  <Text size="xs" c="dimmed">
                    Reference coordinates:{" "}
                    {formatCoords(marker.lat, marker.lng)}
                  </Text>
                  <Text
                    size="xs"
                    c={isSelected ? accentColor : "dimmed"}
                    mt={4}
                  >
                    {marker.archetypes.length} archetype
                    {marker.archetypes.length === 1 ? "" : "s"} available
                  </Text>
                  {countries.length > 1 &&
                    countries.map(([country, count]) => (
                      <Text key={country} size="xs" c="dimmed">
                        {country}: {count}
                      </Text>
                    ))}
                </Popup>
              </CircleMarker>
            </Box>
          );
        })}
      </MapContainer>
    </MapFrame>
  );
}
