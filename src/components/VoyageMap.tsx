import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons for bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const createColorIcon = (color: string) =>
  new L.DivIcon({
    className: "",
    html: `<div style="width:28px;height:28px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center">
      <div style="width:8px;height:8px;border-radius:50%;background:white"></div>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });

const departIcon = createColorIcon("hsl(214, 80%, 52%)");
const arriveIcon = createColorIcon("hsl(252, 40%, 75%)");

export interface Voyage {
  id: string;
  departure_city: string;
  arrival_city: string;
  departure_date: string;
  departure_time: string | null;
  transport_method: string;
  status: string;
}

const CITY_COORDS: Record<string, [number, number]> = {
  "Genève": [46.2044, 6.1432],
  "Casablanca": [33.5731, -7.5898],
  "Paris": [48.8566, 2.3522],
  "Tunis": [36.8065, 10.1815],
  "Marseille": [43.2965, 5.3698],
  "Lyon": [45.7640, 4.8357],
  "Dakar": [14.7167, -17.4677],
  "Abidjan": [5.3600, -4.0083],
  "Alger": [36.7538, 3.0588],
  "London": [51.5074, -0.1278],
  "New York": [40.7128, -74.0060],
  "Dubai": [25.2048, 55.2708],
  "Istanbul": [41.0082, 28.9784],
};

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length >= 2) {
      map.fitBounds(L.latLngBounds(positions.map(p => L.latLng(p[0], p[1]))), { padding: [40, 40] });
    }
  }, [positions, map]);
  return null;
}

interface VoyageMapProps {
  voyages: Voyage[];
  selectedVoyageId: string | null;
  onSelectVoyage: (id: string) => void;
}

const VoyageMap = ({ voyages, selectedVoyageId, onSelectVoyage }: VoyageMapProps) => {
  const allPositions: [number, number][] = [];
  voyages.forEach((v) => {
    const fromCoords = CITY_COORDS[v.departure_city];
    const toCoords = CITY_COORDS[v.arrival_city];
    if (fromCoords) allPositions.push(fromCoords);
    if (toCoords) allPositions.push(toCoords);
  });

  const center: [number, number] = allPositions.length > 0
    ? [allPositions.reduce((s, p) => s + p[0], 0) / allPositions.length, allPositions.reduce((s, p) => s + p[1], 0) / allPositions.length]
    : [40, 2];

  const mapChildren: React.ReactNode[] = [];
  voyages.forEach((v) => {
    const fromCoords = CITY_COORDS[v.departure_city];
    const toCoords = CITY_COORDS[v.arrival_city];
    if (!fromCoords || !toCoords) return;

    const isSelected = v.id === selectedVoyageId;

    mapChildren.push(
      <Polyline
        key={`line-${v.id}`}
        positions={[fromCoords, toCoords]}
        pathOptions={{
          color: isSelected ? "hsl(214, 80%, 52%)" : "hsl(252, 40%, 75%)",
          weight: isSelected ? 3 : 2,
          dashArray: isSelected ? undefined : "6 4",
          opacity: isSelected ? 1 : 0.5,
        }}
      />
    );
    mapChildren.push(
      <Marker key={`from-${v.id}`} position={fromCoords} icon={departIcon}
        eventHandlers={{ click: () => onSelectVoyage(v.id) }}>
        <Popup>
          <div style={{ fontSize: 13 }}>
            <p style={{ fontWeight: 700 }}>{v.departure_city} → {v.arrival_city}</p>
            <p>Départ : {v.departure_date} {v.departure_time ? `à ${v.departure_time}` : ""}</p>
            <p style={{ color: "#888" }}>Transport : {v.transport_method}</p>
          </div>
        </Popup>
      </Marker>
    );
    mapChildren.push(
      <Marker key={`to-${v.id}`} position={toCoords} icon={arriveIcon}
        eventHandlers={{ click: () => onSelectVoyage(v.id) }}>
        <Popup>
          <div style={{ fontSize: 13 }}>
            <p style={{ fontWeight: 700 }}>Arrivée : {v.arrival_city}</p>
          </div>
        </Popup>
      </Marker>
    );
  });

  return (
    <div className="rounded-2xl overflow-hidden border border-border shadow-sm" style={{ height: 320 }}>
      <MapContainer center={center} zoom={4} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }} zoomControl={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds positions={allPositions} />
        {mapChildren}
      </MapContainer>
    </div>
  );
};

export default VoyageMap;
