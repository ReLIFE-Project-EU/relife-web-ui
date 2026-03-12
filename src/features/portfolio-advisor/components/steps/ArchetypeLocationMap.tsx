/**
 * ArchetypeLocationMap Component
 * Small, non-interactive map showing the user's building location and the
 * matched archetype's reference location.
 */

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { Box } from "@mantine/core";
import { useEffect, useMemo } from "react";

import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

const userIcon = new L.Icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const archetypeIcon = new L.Icon({
  iconUrl:
    "data:image/svg+xml;base64," +
    btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
      <circle cx="12" cy="12" r="10" fill="#e74c3c" stroke="#c0392b" stroke-width="2"/>
      <circle cx="12" cy="12" r="4" fill="white"/>
    </svg>`),
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12],
});

/**
 * Reference locations for archetype countries (capital cities).
 * Mirrors the workaround in BuildingService — backend BUI coordinates are
 * incorrect (all report Greece), so we use capitals instead.
 */
const ARCHETYPE_REFERENCE_LOCATIONS: Record<
  string,
  { lat: number; lng: number }
> = {
  Greece: { lat: 37.98, lng: 23.73 },
  Italy: { lat: 41.9, lng: 12.5 },
  Austria: { lat: 48.21, lng: 16.37 },
  Belgium: { lat: 50.85, lng: 4.35 },
  Bulgaria: { lat: 42.7, lng: 23.32 },
  Croatia: { lat: 45.81, lng: 15.98 },
  Cyprus: { lat: 35.17, lng: 33.36 },
  "Czech Republic": { lat: 50.08, lng: 14.44 },
  Czechia: { lat: 50.08, lng: 14.44 },
  Denmark: { lat: 55.68, lng: 12.57 },
  Estonia: { lat: 59.44, lng: 24.75 },
  Finland: { lat: 60.17, lng: 24.94 },
  France: { lat: 48.86, lng: 2.35 },
  Germany: { lat: 52.52, lng: 13.41 },
  Hungary: { lat: 47.5, lng: 19.04 },
  Ireland: { lat: 53.33, lng: -6.26 },
  Latvia: { lat: 56.95, lng: 24.11 },
  Lithuania: { lat: 54.69, lng: 25.28 },
  Luxembourg: { lat: 49.61, lng: 6.13 },
  Malta: { lat: 35.9, lng: 14.51 },
  Netherlands: { lat: 52.37, lng: 4.89 },
  Poland: { lat: 52.23, lng: 21.01 },
  Portugal: { lat: 38.72, lng: -9.14 },
  Romania: { lat: 44.43, lng: 26.1 },
  Slovakia: { lat: 48.15, lng: 17.11 },
  Slovenia: { lat: 46.06, lng: 14.51 },
  Spain: { lat: 40.42, lng: -3.7 },
  Sweden: { lat: 59.33, lng: 18.07 },
};

/** Fits the map viewport to both markers whenever positions change. */
function FitBounds({
  userLat,
  userLng,
  archetypeLat,
  archetypeLng,
}: {
  userLat: number;
  userLng: number;
  archetypeLat: number;
  archetypeLng: number;
}) {
  const map = useMap();

  useEffect(() => {
    const bounds = L.latLngBounds(
      [userLat, userLng],
      [archetypeLat, archetypeLng],
    ).pad(0.3);
    map.flyToBounds(bounds, { duration: 0.5 });
  }, [map, userLat, userLng, archetypeLat, archetypeLng]);

  return null;
}

interface ArchetypeLocationMapProps {
  userLat: number;
  userLng: number;
  archetypeCountry: string;
}

export function ArchetypeLocationMap({
  userLat,
  userLng,
  archetypeCountry,
}: ArchetypeLocationMapProps) {
  const refLocation = ARCHETYPE_REFERENCE_LOCATIONS[archetypeCountry];
  const archetypeLat = refLocation?.lat ?? userLat;
  const archetypeLng = refLocation?.lng ?? userLng;

  const initialBounds = useMemo(
    () =>
      L.latLngBounds([userLat, userLng], [archetypeLat, archetypeLng]).pad(0.3),
    // Only used for initial render
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <Box
      mt="xs"
      style={{
        height: 160,
        borderRadius: "var(--mantine-radius-sm)",
        overflow: "hidden",
        border: "1px solid var(--mantine-color-gray-3)",
        position: "relative",
        zIndex: 0,
      }}
    >
      <MapContainer
        bounds={initialBounds}
        scrollWheelZoom={false}
        dragging={false}
        zoomControl={false}
        attributionControl={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FitBounds
          userLat={userLat}
          userLng={userLng}
          archetypeLat={archetypeLat}
          archetypeLng={archetypeLng}
        />
        <Marker position={[userLat, userLng]} icon={userIcon}>
          <Popup>Your building</Popup>
        </Marker>
        <Marker position={[archetypeLat, archetypeLng]} icon={archetypeIcon}>
          <Popup>Archetype reference ({archetypeCountry})</Popup>
        </Marker>
      </MapContainer>
    </Box>
  );
}
