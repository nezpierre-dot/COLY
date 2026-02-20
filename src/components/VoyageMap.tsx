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

const createColorIcon = (color: string, emoji?: string) =>
  new L.DivIcon({
    className: "",
    html: `<div style="width:30px;height:30px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;font-size:12px">
      ${emoji ? emoji : `<div style="width:8px;height:8px;border-radius:50%;background:white"></div>`}
    </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -18],
  });

const departIcon = createColorIcon("hsl(214, 80%, 52%)");
const arriveIcon = createColorIcon("hsl(252, 40%, 75%)");
const colisIcon = createColorIcon("hsl(38, 92%, 50%)", "📦");
const needitIcon = createColorIcon("hsl(280, 70%, 55%)", "🛍️");

export interface Voyage {
  id: string;
  departure_city: string;
  arrival_city: string;
  departure_date: string;
  departure_time: string | null;
  transport_method: string;
  status: string;
}

export interface PendingShipment {
  id: string;
  arrival_city: string;
  arrival_country: string;
  departure_city?: string | null;
  size: string;
  tarif: string;
  departure_date: string;
}

export interface PendingMission {
  id: string;
  country: string;
  city?: string | null;
  product_name?: string | null;
  prix_max?: string | null;
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
  "Bruxelles": [50.8503, 4.3517],
  "Amsterdam": [52.3676, 4.9041],
  "Madrid": [40.4168, -3.7038],
  "Rome": [41.9028, 12.4964],
  "Berlin": [52.5200, 13.4050],
  "Montréal": [45.5017, -73.5673],
  "Barcelone": [41.3851, 2.1734],
  "Douala": [4.0511, 9.7679],
  "Bamako": [12.6392, -8.0029],
  "Conakry": [9.6412, -13.5784],
  "Lomé": [6.1375, 1.2123],
  "Accra": [5.6037, -0.1870],
  "Lagos": [6.5244, 3.3792],
  "Nairobi": [1.2921, 36.8219],
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
  pendingShipments?: PendingShipment[];
  pendingMissions?: PendingMission[];
}

const VoyageMap = ({ voyages, selectedVoyageId, onSelectVoyage, pendingShipments = [], pendingMissions = [] }: VoyageMapProps) => {
  const allPositions: [number, number][] = [];

  voyages.forEach((v) => {
    const fromCoords = CITY_COORDS[v.departure_city];
    const toCoords = CITY_COORDS[v.arrival_city];
    if (fromCoords) allPositions.push(fromCoords);
    if (toCoords) allPositions.push(toCoords);
  });

  pendingShipments.forEach((s) => {
    const city = s.arrival_city;
    if (city && CITY_COORDS[city]) allPositions.push(CITY_COORDS[city]);
  });

  pendingMissions.forEach((m) => {
    const city = m.city;
    if (city && CITY_COORDS[city]) allPositions.push(CITY_COORDS[city]);
  });

  const center: [number, number] = allPositions.length > 0
    ? [allPositions.reduce((s, p) => s + p[0], 0) / allPositions.length, allPositions.reduce((s, p) => s + p[1], 0) / allPositions.length]
    : [20, 10];

  const mapChildren: React.ReactNode[] = [];

  // Draw voyage routes
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

  // Draw pending shipment markers
  pendingShipments.forEach((s) => {
    const coords = CITY_COORDS[s.arrival_city];
    if (!coords) return;
    mapChildren.push(
      <Marker key={`colis-${s.id}`} position={coords} icon={colisIcon}>
        <Popup>
          <div style={{ fontSize: 13 }}>
            <p style={{ fontWeight: 700, marginBottom: 2 }}>📦 Colis en attente</p>
            <p>{s.departure_city || "—"} → {s.arrival_city}, {s.arrival_country}</p>
            <p style={{ color: "#888" }}>Taille : {s.size} · {s.tarif === "custom" ? "Sur devis" : s.tarif}</p>
          </div>
        </Popup>
      </Marker>
    );
  });

  // Draw pending NeedIt mission markers
  pendingMissions.forEach((m) => {
    const city = m.city || m.country;
    const coords = CITY_COORDS[city];
    if (!coords) return;
    mapChildren.push(
      <Marker key={`needit-${m.id}`} position={coords} icon={needitIcon}>
        <Popup>
          <div style={{ fontSize: 13 }}>
            <p style={{ fontWeight: 700, marginBottom: 2 }}>🛍️ Mission NeedIt</p>
            <p>{m.product_name || "Produit non référencé"}</p>
            <p style={{ color: "#888" }}>{m.city ? `${m.city}, ` : ""}{m.country}{m.prix_max ? ` · max ${m.prix_max}` : ""}</p>
          </div>
        </Popup>
      </Marker>
    );
  });

  return (
    <div className="rounded-2xl overflow-hidden border border-border shadow-sm" style={{ height: 340 }}>
      <MapContainer center={center} zoom={3} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }} zoomControl={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds positions={allPositions} />
        {mapChildren}
      </MapContainer>

      {/* Legend */}
      {(pendingShipments.length > 0 || pendingMissions.length > 0) && (
        <div className="flex flex-wrap items-center gap-3 px-3 py-2 bg-card border-t border-border text-[11px] text-muted-foreground">
          {voyages.length > 0 && (
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-full bg-primary" />
              Mes trajets ({voyages.length})
            </span>
          )}
          {pendingShipments.length > 0 && (
            <span className="flex items-center gap-1">
              📦 Colis ({pendingShipments.length})
            </span>
          )}
          {pendingMissions.length > 0 && (
            <span className="flex items-center gap-1">
              🛍️ NeedIt ({pendingMissions.length})
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default VoyageMap;
