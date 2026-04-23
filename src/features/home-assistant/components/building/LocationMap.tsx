/**
 * LocationMap Component
 * Interactive map for selecting building coordinates.
 * Uses Leaflet with OpenStreetMap tiles (free, no API key required).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Tooltip,
  Circle,
  CircleMarker,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import { Box, Text, Loader, Center, Stack } from "@mantine/core";
import type { ArchetypeInfo } from "../../../../types/forecasting";
import {
  getCountryDisplayName,
  getCountryReferenceLocation,
} from "../../../../utils/countries";
import styles from "./LocationMap.module.css";

// Fix Leaflet's default icon path issue with bundlers
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

// Configure default icon
L.Icon.Default.mergeOptions({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
});

// Custom marker icons
const userIcon = new L.Icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: "user-marker",
});

const archetypeIcon = new L.Icon({
  iconUrl:
    "data:image/svg+xml;base64," +
    btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
      <circle cx="12" cy="12" r="10" fill="#e74c3c" stroke="#c0392b" stroke-width="2"/>
      <circle cx="12" cy="12" r="4" fill="white"/>
    </svg>
  `),
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12],
});

const tentativeArchetypeIcon = new L.Icon({
  iconUrl:
    "data:image/svg+xml;base64," +
    btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28">
      <circle cx="14" cy="14" r="12" fill="#ffd8a8" stroke="#f08c00" stroke-width="2"/>
      <circle cx="14" cy="14" r="7" fill="#fff4e6" stroke="#f08c00" stroke-width="2"/>
    </svg>
  `),
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -14],
});

const matchedArchetypeIcon = new L.Icon({
  iconUrl:
    "data:image/svg+xml;base64," +
    btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
      <circle cx="16" cy="16" r="14" fill="#f1c40f" stroke="#b88900" stroke-width="2"/>
      <circle cx="16" cy="16" r="10" fill="#27ae60" stroke="#1e8449" stroke-width="2"/>
      <path d="M12.4 16.1l2.2 2.3 5-5.3" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

// Map click handler component
interface MapClickHandlerProps {
  onMapClick: (lat: number, lng: number) => void;
}

function MapClickHandler({ onMapClick }: MapClickHandlerProps) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Component to update map view when both the building and matched archetype
// should be framed together.
interface MapViewUpdaterProps {
  lat: number | null;
  lng: number | null;
  highlightedArchetype?: ArchetypeInfo | null;
}

function MapViewUpdater({
  lat,
  lng,
  highlightedArchetype,
}: MapViewUpdaterProps) {
  const map = useMapEvents({});
  const highlightedCoords = highlightedArchetype
    ? getCountryReferenceLocation(highlightedArchetype.country)
    : null;

  useEffect(() => {
    if (lat !== null && lng !== null && highlightedCoords) {
      const bounds = L.latLngBounds(
        [lat, lng],
        [highlightedCoords.lat, highlightedCoords.lng],
      );

      map.fitBounds(bounds, {
        padding: [48, 48],
        maxZoom: 6,
      });
    }
  }, [highlightedCoords, lat, lng, map]);

  return null;
}

// Default center: Central Europe
const DEFAULT_CENTER: [number, number] = [48.0, 12.0];
const DEFAULT_ZOOM = 4;

export interface LocationMapProps {
  lat: number | null;
  lng: number | null;
  onLocationChange: (lat: number, lng: number) => void;
  archetypes: ArchetypeInfo[];
  tentativeArchetype?: ArchetypeInfo | null;
  selectedArchetype?: ArchetypeInfo | null;
  loading?: boolean;
}

export function LocationMap({
  lat,
  lng,
  onLocationChange,
  archetypes,
  tentativeArchetype,
  selectedArchetype,
  loading = false,
}: LocationMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const highlightedArchetype = selectedArchetype ?? tentativeArchetype ?? null;

  // Calculate center based on user location or default
  const center: [number, number] = useMemo(() => {
    if (lat !== null && lng !== null) {
      return [lat, lng];
    }
    return DEFAULT_CENTER;
  }, [lat, lng]);

  // Group archetypes by location for markers
  const archetypeMarkers = useMemo(() => {
    const locationMap = new Map<
      string,
      { lat: number; lng: number; archetypes: ArchetypeInfo[] }
    >();

    archetypes.forEach((archetype) => {
      const coords = getCountryReferenceLocation(archetype.country);
      if (coords) {
        const key = `${coords.lat},${coords.lng}`;
        if (!locationMap.has(key)) {
          locationMap.set(key, { ...coords, archetypes: [] });
        }
        locationMap.get(key)!.archetypes.push(archetype);
      }
    });

    return Array.from(locationMap.values());
  }, [archetypes]);

  // Check if an archetype location is the matched one
  const getMarkerState = (
    markerLat: number,
    markerLng: number,
  ): "available" | "tentative" | "selected" => {
    if (selectedArchetype) {
      const selectedCoords = getCountryReferenceLocation(
        selectedArchetype.country,
      );
      if (
        selectedCoords &&
        selectedCoords.lat === markerLat &&
        selectedCoords.lng === markerLng
      ) {
        return "selected";
      }
    }

    if (tentativeArchetype) {
      const tentativeCoords = getCountryReferenceLocation(
        tentativeArchetype.country,
      );
      if (
        tentativeCoords &&
        tentativeCoords.lat === markerLat &&
        tentativeCoords.lng === markerLng
      ) {
        return "tentative";
      }
    }

    return "available";
  };

  if (loading) {
    return (
      <Box
        style={{
          height: 350,
          borderRadius: "var(--mantine-radius-md)",
          border: "1px solid var(--mantine-color-gray-3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "var(--mantine-color-gray-0)",
        }}
      >
        <Center>
          <Stack align="center" gap="xs">
            <Loader size="sm" />
            <Text size="sm" c="dimmed">
              Loading map...
            </Text>
          </Stack>
        </Center>
      </Box>
    );
  }

  return (
    <Box className={styles.mapContainer}>
      <MapContainer
        center={center}
        zoom={lat !== null && lng !== null ? 6 : DEFAULT_ZOOM}
        style={{ height: "100%", width: "100%" }}
        ref={mapRef}
        whenReady={() => setMapReady(true)}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Click handler */}
        <MapClickHandler onMapClick={onLocationChange} />

        {/* View updater */}
        {mapReady && (
          <MapViewUpdater
            lat={lat}
            lng={lng}
            highlightedArchetype={highlightedArchetype}
          />
        )}

        {/* User location marker */}
        {lat !== null && lng !== null && (
          <>
            <Circle
              center={[lat, lng]}
              radius={6000}
              pathOptions={{
                color: "#1c7ed6",
                weight: 2,
                fillColor: "#4dabf7",
                fillOpacity: 0.18,
              }}
            />
            <Marker position={[lat, lng]} icon={userIcon} zIndexOffset={1000}>
              <Tooltip permanent direction="top" offset={[0, -32]}>
                <Text size="xs" fw={600}>
                  Your building
                </Text>
              </Tooltip>
              <Popup>
                <Text size="sm" fw={500}>
                  Your Building Location
                </Text>
                <Text size="xs" c="dimmed">
                  Lat: {lat.toFixed(4)}, Lng: {lng.toFixed(4)}
                </Text>
              </Popup>
            </Marker>
          </>
        )}

        {/* Archetype location markers */}
        {archetypeMarkers.map((marker) => (
          <Box
            key={`${marker.lat},${marker.lng}`}
            component="span"
            style={{ display: "contents" }}
          >
            {getMarkerState(marker.lat, marker.lng) !== "available" && (
              <>
                <Circle
                  center={[marker.lat, marker.lng]}
                  radius={
                    getMarkerState(marker.lat, marker.lng) === "selected"
                      ? 40000
                      : 32000
                  }
                  pathOptions={{
                    color:
                      getMarkerState(marker.lat, marker.lng) === "selected"
                        ? "#f1c40f"
                        : "#f08c00",
                    weight: 2,
                    fillColor:
                      getMarkerState(marker.lat, marker.lng) === "selected"
                        ? "#ffe066"
                        : "#ffd8a8",
                    fillOpacity:
                      getMarkerState(marker.lat, marker.lng) === "selected"
                        ? 0.08
                        : 0.12,
                  }}
                />
                {getMarkerState(marker.lat, marker.lng) === "selected" ? (
                  <CircleMarker
                    center={[marker.lat, marker.lng]}
                    radius={18}
                    pathOptions={{
                      color: "#f1c40f",
                      weight: 3,
                      fillColor: "#2f9e44",
                      fillOpacity: 0.22,
                      className: styles.matchedArchetypePulse,
                    }}
                  />
                ) : null}
              </>
            )}

            <Marker
              position={[marker.lat, marker.lng]}
              icon={
                getMarkerState(marker.lat, marker.lng) === "selected"
                  ? matchedArchetypeIcon
                  : getMarkerState(marker.lat, marker.lng) === "tentative"
                    ? tentativeArchetypeIcon
                    : archetypeIcon
              }
              zIndexOffset={
                getMarkerState(marker.lat, marker.lng) === "selected"
                  ? 900
                  : getMarkerState(marker.lat, marker.lng) === "tentative"
                    ? 700
                    : 0
              }
            >
              <Popup>
                <Text size="sm" fw={500}>
                  {getCountryDisplayName(marker.archetypes[0].country) ??
                    marker.archetypes[0].country}{" "}
                  Reference Buildings
                </Text>
                <Text
                  size="xs"
                  fw={600}
                  c={
                    getMarkerState(marker.lat, marker.lng) === "selected"
                      ? "green"
                      : getMarkerState(marker.lat, marker.lng) === "tentative"
                        ? "orange"
                        : "red"
                  }
                  mt={4}
                >
                  {getMarkerState(marker.lat, marker.lng) === "selected"
                    ? "Selected"
                    : getMarkerState(marker.lat, marker.lng) === "tentative"
                      ? "Tentative match"
                      : "Available"}
                </Text>
                <Text size="xs" c="dimmed" mt={4}>
                  {marker.archetypes.length} archetype
                  {marker.archetypes.length > 1 ? "s" : ""} available:
                </Text>
                <ul style={{ margin: "4px 0", paddingLeft: 16, fontSize: 12 }}>
                  {marker.archetypes.map((a) => (
                    <li key={a.name}>
                      {a.category} ({a.name.match(/\d{4}_\d{4}/)?.[0] || "N/A"})
                    </li>
                  ))}
                </ul>
                {getMarkerState(marker.lat, marker.lng) === "selected" ? (
                  <Text size="xs" c="green" fw={600} mt={4}>
                    Accepted as the current building archetype.
                  </Text>
                ) : null}
                {getMarkerState(marker.lat, marker.lng) === "tentative" ? (
                  <Text size="xs" c="orange.8" fw={600} mt={4}>
                    Matched from your inputs. Review it in Building Archetype to
                    accept it.
                  </Text>
                ) : null}
              </Popup>
            </Marker>
          </Box>
        ))}
      </MapContainer>
    </Box>
  );
}
