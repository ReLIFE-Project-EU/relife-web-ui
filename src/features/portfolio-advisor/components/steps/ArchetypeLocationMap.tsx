/**
 * ArchetypeLocationMap Component
 * Small, non-interactive map showing the user's building location and the
 * matched archetype's reference location.
 */

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { Box } from "@mantine/core";
import { useEffect, useMemo } from "react";
import {
  getCountryDisplayName,
  getCountryReferenceLocation,
} from "../../../../utils/countries";

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
  const refLocation = getCountryReferenceLocation(archetypeCountry);
  const archetypeLat = refLocation?.lat ?? userLat;
  const archetypeLng = refLocation?.lng ?? userLng;
  const displayCountry =
    getCountryDisplayName(archetypeCountry) ?? archetypeCountry;

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
          <Popup>Archetype reference ({displayCountry})</Popup>
        </Marker>
      </MapContainer>
    </Box>
  );
}
