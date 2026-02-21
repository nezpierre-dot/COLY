import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/integrations/supabase/client";
import { Package, ShoppingBag, Search, Filter, X, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const createPin = (color: string, label: string) =>
  new L.DivIcon({
    className: "",
    html: `<div style="position:relative;display:flex;flex-direction:column;align-items:center">
      <div style="width:32px;height:32px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;font-size:14px">${label}</div>
      <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid ${color};margin-top:-2px"></div>
    </div>`,
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -44],
  });

const colisIcon = createPin("hsl(214,80%,52%)", "📦");
const needitIcon = createPin("hsl(280,70%,55%)", "🛍️");

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
  "Caen": [49.1829, -0.3707],
  "Toulouse": [43.6047, 1.4442],
  "Bordeaux": [44.8378, -0.5792],
  "Nantes": [47.2184, -1.5536],
  "Lille": [50.6292, 3.0573],
  "Nice": [43.7102, 7.2620],
  "Strasbourg": [48.5734, 7.7521],
  "Rennes": [48.1173, -1.6778],
  "Reims": [49.2583, 4.0317],
  "Rabat": [34.0209, -6.8416],
  "Fès": [34.0181, -5.0078],
  "Tanger": [35.7595, -5.8340],
  "Oran": [35.6969, -0.6331],
  "Kinshasa": [4.4419, 15.2663],
  "Libreville": [0.4162, 9.4673],
  "Cotonou": [6.3654, 2.4183],
  "Ouagadougou": [12.3714, -1.5197],
  "Niamey": [13.5137, 2.1098],
};

interface Mission {
  id: string;
  type: string;
  departure_city: string | null;
  departure_country: string | null;
  arrival_city: string | null;
  arrival_country: string | null;
}

type FilterType = "all" | "colis" | "needit";

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length >= 2) {
      map.fitBounds(L.latLngBounds(positions.map((p) => L.latLng(p[0], p[1]))), { padding: [40, 40], maxZoom: 6 });
    } else if (positions.length === 1) {
      map.setView(positions[0], 5);
    }
  }, [positions, map]);
  return null;
}

function FlyToCity({ city }: { city: string | null }) {
  const map = useMap();
  useEffect(() => {
    if (city && CITY_COORDS[city]) {
      map.flyTo(CITY_COORDS[city], 7, { duration: 1.2 });
    }
  }, [city, map]);
  return null;
}

const PublicMissionsMap = () => {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [flyToCity, setFlyToCity] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.rpc("get_public_pending_missions" as any);
      if (data) setMissions(data as Mission[]);
      setLoading(false);
    };
    load();
  }, []);

  // Filter missions based on search and type
  const filteredMissions = useMemo(() => {
    let result = missions;
    if (filterType !== "all") {
      result = result.filter((m) => m.type === filterType);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((m) =>
        (m.departure_city?.toLowerCase().includes(q)) ||
        (m.departure_country?.toLowerCase().includes(q)) ||
        (m.arrival_city?.toLowerCase().includes(q)) ||
        (m.arrival_country?.toLowerCase().includes(q))
      );
    }
    return result;
  }, [missions, filterType, searchQuery]);

  // Search suggestions (matching cities in CITY_COORDS)
  const searchSuggestions = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) return [];
    const q = searchQuery.toLowerCase();
    return Object.keys(CITY_COORDS)
      .filter((city) => city.toLowerCase().includes(q))
      .slice(0, 5);
  }, [searchQuery]);

  const colisMissions = filteredMissions.filter((m) => m.type === "colis");
  const needitMissions = filteredMissions.filter((m) => m.type === "needit");

  const allPositions: [number, number][] = [];
  filteredMissions.forEach((m) => {
    const city = m.departure_city;
    if (city && CITY_COORDS[city]) allPositions.push(CITY_COORDS[city]);
  });

  if (loading) {
    return (
      <div className="rounded-2xl overflow-hidden border border-border bg-muted/30 flex items-center justify-center" style={{ height: 400 }}>
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Chargement de la carte…</p>
        </div>
      </div>
    );
  }

  const center: [number, number] = allPositions.length > 0
    ? [allPositions.reduce((s, p) => s + p[0], 0) / allPositions.length, allPositions.reduce((s, p) => s + p[1], 0) / allPositions.length]
    : [20, 10];

  return (
    <div className="rounded-2xl overflow-hidden border border-border shadow-sm">
      {/* Search & Filter Bar */}
      <div className="bg-card border-b border-border px-3 py-2.5 space-y-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setFlyToCity(null); }}
            placeholder="Rechercher une ville… (ex: Caen, Dakar)"
            className="pl-9 pr-8 h-9 text-sm rounded-xl bg-muted/50 border-border"
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(""); setFlyToCity(null); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Suggestions dropdown */}
        <AnimatePresence>
          {searchSuggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="flex flex-wrap gap-1.5"
            >
              {searchSuggestions.map((city) => (
                <button
                  key={city}
                  onClick={() => { setSearchQuery(city); setFlyToCity(city); }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                >
                  <MapPin size={10} /> {city}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filter chips */}
        <div className="flex gap-1.5">
          {([
            { value: "all" as FilterType, label: "Tout", count: missions.length },
            { value: "colis" as FilterType, label: "Colis", count: missions.filter(m => m.type === "colis").length, color: "primary" },
            { value: "needit" as FilterType, label: "NeedIt", count: missions.filter(m => m.type === "needit").length, color: "secondary" },
          ]).map((f) => (
            <button
              key={f.value}
              onClick={() => setFilterType(f.value)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                filterType === f.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted"
              }`}
            >
              {f.value === "colis" && <Package size={10} />}
              {f.value === "needit" && <ShoppingBag size={10} />}
              {f.value === "all" && <Filter size={10} />}
              {f.label}
              <span className={`text-[10px] ml-0.5 ${filterType === f.value ? "text-primary-foreground/70" : "text-muted-foreground/60"}`}>
                ({f.count})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Map */}
      {missions.length === 0 && !loading ? (
        <div className="flex flex-col items-center justify-center gap-2 py-12 bg-muted/20">
          <MapPin size={28} className="text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Aucune mission en attente pour le moment</p>
        </div>
      ) : (
        <div style={{ height: 380 }}>
          <MapContainer
            center={center}
            zoom={3}
            scrollWheelZoom={true}
            style={{ height: "100%", width: "100%" }}
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/">OSM</a>'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />
            <ZoomControl position="bottomright" />
            <FitBounds positions={allPositions} />
            <FlyToCity city={flyToCity} />

            {colisMissions.map((m) => {
              const city = m.departure_city;
              if (!city || !CITY_COORDS[city]) return null;
              return (
                <Marker key={`colis-${m.id}`} position={CITY_COORDS[city]} icon={colisIcon}>
                  <Popup>
                    <div className="text-xs space-y-1 min-w-[140px]">
                      <p className="font-bold text-sm">📦 Colis en attente</p>
                      <p className="text-foreground">{m.departure_city}{m.arrival_city ? ` → ${m.arrival_city}` : ""}</p>
                      {m.arrival_country && <p className="text-muted-foreground">{m.arrival_country}</p>}
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
                    <div className="text-xs space-y-1 min-w-[140px]">
                      <p className="font-bold text-sm">🛍️ Mission NeedIt</p>
                      <p className="text-foreground">{m.departure_city}{m.departure_country && m.departure_country !== m.departure_city ? `, ${m.departure_country}` : ""}</p>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      )}

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
        <span className="ml-auto text-[10px] font-medium">
          {filteredMissions.length} mission{filteredMissions.length > 1 ? "s" : ""}
          {searchQuery && ` pour "${searchQuery}"`}
        </span>
      </div>
    </div>
  );
};

export default PublicMissionsMap;
