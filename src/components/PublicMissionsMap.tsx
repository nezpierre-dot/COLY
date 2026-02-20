import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/integrations/supabase/client";
import { Package, ShoppingBag } from "lucide-react";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const createDot = (color: string) =>
  new L.DivIcon({
    className: "",
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2.5px solid white;box-shadow:0 1px 6px rgba(0,0,0,.35)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10],
  });

const colisIcon = createDot("hsl(214,80%,52%)");
const needitIcon = createDot("hsl(280,70%,55%)");

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
  "Maroc": [31.7917, -7.0926],
  "France": [46.2276, 2.2137],
  "Sénégal": [14.4974, -14.4524],
  "Côte d'Ivoire": [7.5400, -5.5471],
  "Algérie": [28.0339, 1.6596],
  "Tunisie": [33.8869, 9.5375],
  "Cameroun": [7.3697, 12.3547],
  "Mali": [17.5707, -3.9962],
  "Guinée": [11.8037, -15.1804],
  "Togo": [8.6195, 0.8248],
  "Ghana": [7.9465, -1.0232],
  "Nigeria": [9.0820, 8.6753],
  "Kenya": [0.0236, 37.9062],
};

interface Mission {
  id: string;
  type: string;
  departure_city: string | null;
  departure_country: string | null;
  arrival_city: string | null;
  arrival_country: string | null;
}

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length >= 2) {
      map.fitBounds(L.latLngBounds(positions.map((p) => L.latLng(p[0], p[1]))), { padding: [30, 30] });
    } else if (positions.length === 1) {
      map.setView(positions[0], 4);
    }
  }, [positions, map]);
  return null;
}

const PublicMissionsMap = () => {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.rpc("get_public_pending_missions" as any);
      if (data) setMissions(data as Mission[]);
      setLoading(false);
    };
    load();
  }, []);

  const colisMissions = missions.filter((m) => m.type === "colis");
  const needitMissions = missions.filter((m) => m.type === "needit");

  const allPositions: [number, number][] = [];
  missions.forEach((m) => {
    const city = m.departure_city;
    if (city && CITY_COORDS[city]) allPositions.push(CITY_COORDS[city]);
  });

  if (loading) {
    return (
      <div className="rounded-2xl overflow-hidden border border-border bg-muted/30 flex items-center justify-center" style={{ height: 260 }}>
        <p className="text-sm text-muted-foreground animate-pulse">Chargement de la carte…</p>
      </div>
    );
  }

  if (missions.length === 0) {
    return (
      <div className="rounded-2xl overflow-hidden border border-border bg-muted/30 flex flex-col items-center justify-center gap-2" style={{ height: 180 }}>
        <p className="text-sm text-muted-foreground">Aucune mission en attente pour le moment</p>
      </div>
    );
  }

  const center: [number, number] = allPositions.length > 0
    ? [allPositions.reduce((s, p) => s + p[0], 0) / allPositions.length, allPositions.reduce((s, p) => s + p[1], 0) / allPositions.length]
    : [20, 10];

  return (
    <div className="rounded-2xl overflow-hidden border border-border shadow-sm">
      <div style={{ height: 260 }}>
        <MapContainer center={center} zoom={3} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }} zoomControl={false}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds positions={allPositions} />

          {colisMissions.map((m) => {
            const city = m.departure_city;
            if (!city || !CITY_COORDS[city]) return null;
            return (
              <Marker key={`colis-${m.id}`} position={CITY_COORDS[city]} icon={colisIcon}>
                <Popup>
                  <div style={{ fontSize: 12 }}>
                    <p style={{ fontWeight: 700, marginBottom: 2 }}>📦 Colis en attente</p>
                    <p>{m.departure_city}{m.arrival_city ? ` → ${m.arrival_city}` : ""}</p>
                    {m.arrival_country && <p style={{ color: "#888" }}>{m.arrival_country}</p>}
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {needitMissions.map((m) => {
            const city = m.departure_city;
            if (!city || !CITY_COORDS[city]) return null;
            return (
              <Marker key={`needit-${m.id}`} position={CITY_COORDS[city]} icon={needitIcon}>
                <Popup>
                  <div style={{ fontSize: 12 }}>
                    <p style={{ fontWeight: 700, marginBottom: 2 }}>🛍️ Mission NeedIt</p>
                    <p>{m.departure_city}{m.departure_country && m.departure_country !== m.departure_city ? `, ${m.departure_country}` : ""}</p>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-3 py-2 bg-card border-t border-border text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-primary" />
          <Package size={10} /> Colis ({colisMissions.length})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full" style={{ background: "hsl(280,70%,55%)" }} />
          <ShoppingBag size={10} /> NeedIt ({needitMissions.length})
        </span>
        <span className="ml-auto text-[10px]">{missions.length} mission{missions.length > 1 ? "s" : ""} en attente</span>
      </div>
    </div>
  );
};

export default PublicMissionsMap;
