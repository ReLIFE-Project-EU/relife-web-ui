/**
 * PRALocationMap Component
 * Interactive map for clicking to set building coordinates in ManualAddPanel.
 */

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import styles from "./PRALocationMap.module.css";

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
  className: "user-marker",
});

const DEFAULT_CENTER: [number, number] = [48.0, 12.0];
const DEFAULT_ZOOM = 4;

function MapClickHandler({
  onMapClick,
}: {
  onMapClick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapViewUpdater({
  lat,
  lng,
}: {
  lat: number | null;
  lng: number | null;
}) {
  const map = useMapEvents({});

  useEffect(() => {
    if (lat !== null && lng !== null) {
      map.setView([lat, lng], Math.max(map.getZoom(), 6));
    }
  }, [lat, lng, map]);

  return null;
}

export interface PRALocationMapProps {
  lat: number | null;
  lng: number | null;
  onLocationChange: (lat: number, lng: number) => void;
}

export function PRALocationMap({
  lat,
  lng,
  onLocationChange,
}: PRALocationMapProps) {
  const [mapReady, setMapReady] = useState(false);

  const center: [number, number] =
    lat !== null && lng !== null ? [lat, lng] : DEFAULT_CENTER;

  return (
    <div className={styles.mapContainer}>
      <MapContainer
        center={center}
        zoom={lat !== null && lng !== null ? 6 : DEFAULT_ZOOM}
        style={{ height: "100%", width: "100%" }}
        whenReady={() => setMapReady(true)}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onMapClick={onLocationChange} />
        {mapReady && <MapViewUpdater lat={lat} lng={lng} />}
        {lat !== null && lng !== null && (
          <Marker position={[lat, lng]} icon={userIcon} />
        )}
      </MapContainer>
    </div>
  );
}
