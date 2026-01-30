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
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import { Box, Text, Loader, Center, Stack } from "@mantine/core";
import type { ArchetypeInfo } from "../../../../types/forecasting";
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

const matchedArchetypeIcon = new L.Icon({
  iconUrl:
    "data:image/svg+xml;base64," +
    btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28">
      <circle cx="12" cy="12" r="10" fill="#27ae60" stroke="#1e8449" stroke-width="2"/>
      <circle cx="12" cy="12" r="4" fill="white"/>
    </svg>
  `),
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -14],
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

// Component to update map view when coordinates change
interface MapViewUpdaterProps {
  lat: number | null;
  lng: number | null;
}

function MapViewUpdater({ lat, lng }: MapViewUpdaterProps) {
  const map = useMapEvents({});

  useEffect(() => {
    if (lat !== null && lng !== null) {
      map.setView([lat, lng], Math.max(map.getZoom(), 6));
    }
  }, [lat, lng, map]);

  return null;
}

/**
 * Reference locations for archetype markers on the map (capital cities).
 * Covers all 27 EU member states for future archetype additions.
 */
const ARCHETYPE_LOCATIONS: Record<string, { lat: number; lng: number }> = {
  // Current archetypes
  Greece: { lat: 37.98, lng: 23.73 }, // Athens
  Italy: { lat: 41.9, lng: 12.5 }, // Rome

  // Other EU member states (for future archetypes)
  Austria: { lat: 48.21, lng: 16.37 }, // Vienna
  Belgium: { lat: 50.85, lng: 4.35 }, // Brussels
  Bulgaria: { lat: 42.7, lng: 23.32 }, // Sofia
  Croatia: { lat: 45.81, lng: 15.98 }, // Zagreb
  Cyprus: { lat: 35.17, lng: 33.36 }, // Nicosia
  Czechia: { lat: 50.08, lng: 14.44 }, // Prague
  Denmark: { lat: 55.68, lng: 12.57 }, // Copenhagen
  Estonia: { lat: 59.44, lng: 24.75 }, // Tallinn
  Finland: { lat: 60.17, lng: 24.94 }, // Helsinki
  France: { lat: 48.86, lng: 2.35 }, // Paris
  Germany: { lat: 52.52, lng: 13.41 }, // Berlin
  Hungary: { lat: 47.5, lng: 19.04 }, // Budapest
  Ireland: { lat: 53.33, lng: -6.26 }, // Dublin
  Latvia: { lat: 56.95, lng: 24.11 }, // Riga
  Lithuania: { lat: 54.69, lng: 25.28 }, // Vilnius
  Luxembourg: { lat: 49.61, lng: 6.13 }, // Luxembourg City
  Malta: { lat: 35.9, lng: 14.51 }, // Valletta
  Netherlands: { lat: 52.37, lng: 4.89 }, // Amsterdam
  Poland: { lat: 52.23, lng: 21.01 }, // Warsaw
  Portugal: { lat: 38.72, lng: -9.14 }, // Lisbon
  Romania: { lat: 44.43, lng: 26.1 }, // Bucharest
  Slovakia: { lat: 48.15, lng: 17.11 }, // Bratislava
  Slovenia: { lat: 46.06, lng: 14.51 }, // Ljubljana
  Spain: { lat: 40.42, lng: -3.7 }, // Madrid
  Sweden: { lat: 59.33, lng: 18.07 }, // Stockholm
};

// Default center: Central Europe
const DEFAULT_CENTER: [number, number] = [48.0, 12.0];
const DEFAULT_ZOOM = 4;

export interface LocationMapProps {
  lat: number | null;
  lng: number | null;
  onLocationChange: (lat: number, lng: number) => void;
  archetypes: ArchetypeInfo[];
  matchedArchetype?: ArchetypeInfo | null;
  loading?: boolean;
}

export function LocationMap({
  lat,
  lng,
  onLocationChange,
  archetypes,
  matchedArchetype,
  loading = false,
}: LocationMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);

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
      const coords = ARCHETYPE_LOCATIONS[archetype.country];
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
  const isMatchedLocation = (markerLat: number, markerLng: number): boolean => {
    if (!matchedArchetype) return false;
    const matchedCoords = ARCHETYPE_LOCATIONS[matchedArchetype.country];
    if (!matchedCoords) return false;
    return matchedCoords.lat === markerLat && matchedCoords.lng === markerLng;
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
        {mapReady && <MapViewUpdater lat={lat} lng={lng} />}

        {/* User location marker */}
        {lat !== null && lng !== null && (
          <Marker position={[lat, lng]} icon={userIcon}>
            <Popup>
              <Text size="sm" fw={500}>
                Your Building Location
              </Text>
              <Text size="xs" c="dimmed">
                Lat: {lat.toFixed(4)}, Lng: {lng.toFixed(4)}
              </Text>
            </Popup>
          </Marker>
        )}

        {/* Archetype location markers */}
        {archetypeMarkers.map((marker) => (
          <Marker
            key={`${marker.lat},${marker.lng}`}
            position={[marker.lat, marker.lng]}
            icon={
              isMatchedLocation(marker.lat, marker.lng)
                ? matchedArchetypeIcon
                : archetypeIcon
            }
          >
            <Popup>
              <Text size="sm" fw={500}>
                {marker.archetypes[0].country} Reference Buildings
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
              {isMatchedLocation(marker.lat, marker.lng) && (
                <Text size="xs" c="green" fw={500} mt={4}>
                  ✓ Matched archetype
                </Text>
              )}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </Box>
  );
}
