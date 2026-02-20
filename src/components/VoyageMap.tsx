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

interface Voyage {
  id: number;
  from: string;
  to: string;
  date: string;
  time: string;
  location: string;
  fillRate: number;
}

const CITY_COORDS: Record<string, [number, number]> = {
  "Genève": [46.2044, 6.1432],
  "Casablanca": [33.5731, -7.5898],
  "Paris": [48.8566, 2.3522],
  "Tunis": [36.8065, 10.1815],
  "Marseille": [43.2965, 5.3698],
};

const getEstimatedArrival = (from: string, to: string, departTime: string): string => {
  const distances: Record<string, number> = {
    "Genève-Casablanca": 3, "Casablanca-Genève": 3,
    "Paris-Tunis": 2.5, "Tunis-Paris": 2.5,
    "Paris-Marseille": 1.5, "Marseille-Paris": 1.5,
    "Paris-Casablanca": 3.5, "Casablanca-Paris": 3.5,
  };
  const hours = distances[`${from}-${to}`] || 2;
  const [h, m] = departTime.replace("h", ":").split(":").map(Number);
  const arrH = (h + Math.floor(hours)) % 24;
  const arrM = m + Math.round((hours % 1) * 60);
  return `${String(arrH).padStart(2, "0")}h${String(arrM % 60).padStart(2, "0")}`;
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
  selectedVoyageId: number;
  onSelectVoyage: (id: number) => void;
}

const VoyageMap = ({ voyages, selectedVoyageId, onSelectVoyage }: VoyageMapProps) => {
  const allPositions: [number, number][] = [];
  voyages.forEach((v) => {
    const fromCoords = CITY_COORDS[v.from];
    const toCoords = CITY_COORDS[v.to];
    if (fromCoords) allPositions.push(fromCoords);
    if (toCoords) allPositions.push(toCoords);
  });

  const center: [number, number] = allPositions.length > 0
    ? [allPositions.reduce((s, p) => s + p[0], 0) / allPositions.length, allPositions.reduce((s, p) => s + p[1], 0) / allPositions.length]
    : [40, 2];

  // Flatten voyage layers — react-leaflet does NOT support <div> wrappers inside MapContainer
  const mapChildren: React.ReactNode[] = [];
  voyages.forEach((v) => {
    const fromCoords = CITY_COORDS[v.from];
    const toCoords = CITY_COORDS[v.to];
    if (!fromCoords || !toCoords) return;

    const isSelected = v.id === selectedVoyageId;
    const eta = getEstimatedArrival(v.from, v.to, v.time);

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
            <p style={{ fontWeight: 700 }}>{v.from} → {v.to}</p>
            <p>Départ : {v.date} à {v.time}</p>
            <p style={{ color: "#888" }}>Arrivée estimée : ~{eta}</p>
            <p>Remplissage : {v.fillRate}%</p>
          </div>
        </Popup>
      </Marker>
    );
    mapChildren.push(
      <Marker key={`to-${v.id}`} position={toCoords} icon={arriveIcon}
        eventHandlers={{ click: () => onSelectVoyage(v.id) }}>
        <Popup>
          <div style={{ fontSize: 13 }}>
            <p style={{ fontWeight: 700 }}>Arrivée : {v.to}</p>
            <p>ETA : ~{eta}</p>
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
