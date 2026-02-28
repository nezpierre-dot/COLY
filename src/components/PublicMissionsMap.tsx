import { useEffect, useState, useMemo, useRef } from "react";
import Map, { Marker, Popup, NavigationControl } from "react-map-gl";
import type { MapRef } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { supabase } from "@/integrations/supabase/client";
import { Package, ShoppingBag, Search, Filter, X, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";

const MAPBOX_TOKEN = "pk.eyJ1IjoicGllcnJlLTQzOTciLCJhIjoiY21sd2N6dTlmMGJkMTNlcXduMWtnZTJyMyJ9.vV_ZqV0mJ5WLbE6aX3QDJg";

// Mapbox uses [lng, lat]
const CITY_COORDS: Record<string, [number, number]> = {
  "Genève": [6.1432, 46.2044],
  "Casablanca": [-7.5898, 33.5731],
  "Paris": [2.3522, 48.8566],
  "Tunis": [10.1815, 36.8065],
  "Marseille": [5.3698, 43.2965],
  "Lyon": [4.8357, 45.7640],
  "Dakar": [-17.4677, 14.7167],
  "Abidjan": [-4.0083, 5.3600],
  "Alger": [3.0588, 36.7538],
  "London": [-0.1278, 51.5074],
  "New York": [-74.0060, 40.7128],
  "Dubai": [55.2708, 25.2048],
  "Istanbul": [28.9784, 41.0082],
  "Bruxelles": [4.3517, 50.8503],
  "Amsterdam": [4.9041, 52.3676],
  "Madrid": [-3.7038, 40.4168],
  "Rome": [12.4964, 41.9028],
  "Berlin": [13.4050, 52.5200],
  "Montréal": [-73.5673, 45.5017],
  "Barcelone": [2.1734, 41.3851],
  "Douala": [9.7679, 4.0511],
  "Bamako": [-8.0029, 12.6392],
  "Conakry": [-13.5784, 9.6412],
  "Lomé": [1.2123, 6.1375],
  "Accra": [-0.1870, 5.6037],
  "Lagos": [3.3792, 6.5244],
  "Nairobi": [36.8219, -1.2921],
  "Maroc": [-7.0926, 31.7917],
  "France": [2.2137, 46.2276],
  "Sénégal": [-14.4524, 14.4974],
  "Côte d'Ivoire": [-5.5471, 7.5400],
  "Algérie": [1.6596, 28.0339],
  "Tunisie": [9.5375, 33.8869],
  "Cameroun": [12.3547, 7.3697],
  "Mali": [-3.9962, 17.5707],
  "Guinée": [-15.1804, 11.8037],
  "Togo": [0.8248, 8.6195],
  "Ghana": [-1.0232, 7.9465],
  "Nigeria": [8.6753, 9.0820],
  "Kenya": [37.9062, 0.0236],
  "Caen": [-0.3707, 49.1829],
  "Toulouse": [1.4442, 43.6047],
  "Bordeaux": [-0.5792, 44.8378],
  "Nantes": [-1.5536, 47.2184],
  "Lille": [3.0573, 50.6292],
  "Nice": [7.2620, 43.7102],
  "Strasbourg": [7.7521, 48.5734],
  "Rennes": [-1.6778, 48.1173],
  "Reims": [4.0317, 49.2583],
  "Rabat": [-6.8416, 34.0209],
  "Fès": [-5.0078, 34.0181],
  "Tanger": [-5.8340, 35.7595],
  "Oran": [-0.6331, 35.6969],
  "Kinshasa": [15.2663, -4.4419],
  "Libreville": [9.4673, 0.4162],
  "Cotonou": [2.4183, 6.3654],
  "Ouagadougou": [-1.5197, 12.3714],
  "Niamey": [2.1098, 13.5137],
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

const PinMarker = ({ color, label }: { color: string; label: string }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
    <div
      style={{
        width: 32, height: 32, borderRadius: "50%", background: color,
        border: "3px solid white", boxShadow: "0 2px 8px rgba(0,0,0,.3)",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
      }}
    >
      {label}
    </div>
    <div
      style={{
        width: 0, height: 0,
        borderLeft: "6px solid transparent", borderRight: "6px solid transparent",
        borderTop: `8px solid ${color}`, marginTop: -2,
      }}
    />
  </div>
);

const PublicMissionsMap = () => {
  const mapRef = useRef<MapRef>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [popupInfo, setPopupInfo] = useState<Mission | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.rpc("get_public_pending_missions" as any);
      if (data) setMissions(data as Mission[]);
      setLoading(false);
    };
    load();
  }, []);

  const filteredMissions = useMemo(() => {
    let result = missions;
    if (filterType !== "all") result = result.filter((m) => m.type === filterType);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((m) =>
        m.departure_city?.toLowerCase().includes(q) ||
        m.departure_country?.toLowerCase().includes(q) ||
        m.arrival_city?.toLowerCase().includes(q) ||
        m.arrival_country?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [missions, filterType, searchQuery]);

  const searchSuggestions = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) return [];
    const q = searchQuery.toLowerCase();
    return Object.keys(CITY_COORDS).filter((c) => c.toLowerCase().includes(q)).slice(0, 5);
  }, [searchQuery]);

  const colisMissions = filteredMissions.filter((m) => m.type === "colis");
  const needitMissions = filteredMissions.filter((m) => m.type === "needit");

  const allPositions = useMemo(() => {
    const positions: [number, number][] = [];
    filteredMissions.forEach((m) => {
      const city = m.departure_city;
      if (city && CITY_COORDS[city]) positions.push(CITY_COORDS[city]);
    });
    return positions;
  }, [filteredMissions]);

  // Fit bounds
  useEffect(() => {
    if (allPositions.length >= 2 && mapRef.current) {
      const lngs = allPositions.map((p) => p[0]);
      const lats = allPositions.map((p) => p[1]);
      mapRef.current.fitBounds(
        [[Math.min(...lngs) - 2, Math.min(...lats) - 2], [Math.max(...lngs) + 2, Math.max(...lats) + 2]],
        { padding: 40, duration: 800, maxZoom: 6 }
      );
    }
  }, [allPositions]);

  const flyToCity = (city: string) => {
    const coords = CITY_COORDS[city];
    if (coords && mapRef.current) {
      mapRef.current.flyTo({ center: coords, zoom: 7, duration: 1200 });
    }
  };

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

  return (
    <div className="rounded-2xl overflow-hidden border border-border shadow-sm">
      {/* Search & Filter Bar */}
      <div className="bg-card border-b border-border px-3 py-2.5 space-y-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher une ville… (ex: Caen, Dakar)"
            className="pl-9 pr-8 h-9 text-sm rounded-xl bg-muted/50 border-border"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X size={14} />
            </button>
          )}
        </div>

        <AnimatePresence>
          {searchSuggestions.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="flex flex-wrap gap-1.5">
              {searchSuggestions.map((city) => (
                <button
                  key={city}
                  onClick={() => { setSearchQuery(city); flyToCity(city); }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                >
                  <MapPin size={10} /> {city}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-1.5">
          {([
            { value: "all" as FilterType, label: "Tout", count: missions.length },
            { value: "colis" as FilterType, label: "Colis", count: missions.filter(m => m.type === "colis").length },
            { value: "needit" as FilterType, label: "NeedIt", count: missions.filter(m => m.type === "needit").length },
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
              <span className={`text-xs ml-0.5 ${filterType === f.value ? "text-primary-foreground/70" : "text-muted-foreground/60"}`}>
                ({f.count})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Map */}
      {missions.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-12 bg-muted/20">
          <MapPin size={28} className="text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Aucune mission en attente pour le moment</p>
        </div>
      ) : (
        <div style={{ height: 380 }}>
          <Map
            ref={mapRef}
            mapboxAccessToken={MAPBOX_TOKEN}
            initialViewState={{ longitude: 10, latitude: 20, zoom: 2 }}
            style={{ width: "100%", height: "100%" }}
            mapStyle="mapbox://styles/mapbox/light-v11"
            attributionControl={false}
          >
            <NavigationControl position="bottom-right" showCompass={false} />

            {colisMissions.map((m) => {
              const city = m.departure_city;
              if (!city || !CITY_COORDS[city]) return null;
              const coords = CITY_COORDS[city];
              return (
                <Marker key={`colis-${m.id}`} longitude={coords[0]} latitude={coords[1]} anchor="bottom" onClick={(e) => { e.originalEvent.stopPropagation(); setPopupInfo(m); }}>
                  <PinMarker color="hsl(214,80%,52%)" label="📦" />
                </Marker>
              );
            })}

            {needitMissions.map((m) => {
              const city = m.departure_city;
              if (!city || !CITY_COORDS[city]) return null;
              const coords = CITY_COORDS[city];
              return (
                <Marker key={`needit-${m.id}`} longitude={coords[0]} latitude={coords[1]} anchor="bottom" onClick={(e) => { e.originalEvent.stopPropagation(); setPopupInfo(m); }}>
                  <PinMarker color="hsl(280,70%,55%)" label="🛍️" />
                </Marker>
              );
            })}

            {popupInfo && CITY_COORDS[popupInfo.departure_city || ""] && (
              <Popup
                longitude={CITY_COORDS[popupInfo.departure_city!][0]}
                latitude={CITY_COORDS[popupInfo.departure_city!][1]}
                anchor="top"
                onClose={() => setPopupInfo(null)}
                closeOnClick={false}
              >
                <div className="text-xs space-y-1 min-w-[140px]">
                  <p className="font-bold text-sm">{popupInfo.type === "colis" ? "📦 Colis en attente" : "🛍️ Mission NeedIt"}</p>
                  <p>{popupInfo.departure_city}{popupInfo.arrival_city ? ` → ${popupInfo.arrival_city}` : ""}</p>
                  {popupInfo.arrival_country && <p className="text-muted-foreground">{popupInfo.arrival_country}</p>}
                </div>
              </Popup>
            )}
          </Map>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 px-3 py-2 bg-card border-t border-border text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-primary" />
          <Package size={10} /> Colis ({colisMissions.length})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full" style={{ background: "hsl(280,70%,55%)" }} />
          <ShoppingBag size={10} /> NeedIt ({needitMissions.length})
        </span>
        <span className="ml-auto text-xs font-medium">
          {filteredMissions.length} mission{filteredMissions.length > 1 ? "s" : ""}
          {searchQuery && ` pour "${searchQuery}"`}
        </span>
      </div>
    </div>
  );
};

export default PublicMissionsMap;
