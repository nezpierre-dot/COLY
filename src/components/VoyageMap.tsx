import { useEffect, useRef, useMemo, useCallback } from "react";
import Map, { Marker, Popup, Source, Layer, NavigationControl } from "react-map-gl";
import type { MapRef } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";

import { MAPBOX_TOKEN } from "@/lib/mapbox";

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
};

interface VoyageMapProps {
  voyages: Voyage[];
  selectedVoyageId: string | null;
  onSelectVoyage: (id: string) => void;
  pendingShipments?: PendingShipment[];
  pendingMissions?: PendingMission[];
}

const MarkerDot = ({ color, emoji, onClick }: { color: string; emoji?: string; onClick?: () => void }) => (
  <div
    onClick={onClick}
    style={{
      width: 30, height: 30, borderRadius: "50%", background: color,
      border: "3px solid white", boxShadow: "0 2px 8px rgba(0,0,0,.3)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 12, cursor: onClick ? "pointer" : "default",
    }}
  >
    {emoji || <div style={{ width: 8, height: 8, borderRadius: "50%", background: "white" }} />}
  </div>
);

const VoyageMap = ({ voyages, selectedVoyageId, onSelectVoyage, pendingShipments = [], pendingMissions = [] }: VoyageMapProps) => {
  const mapRef = useRef<MapRef>(null);

  const allPositions: [number, number][] = useMemo(() => {
    const positions: [number, number][] = [];
    voyages.forEach((v) => {
      if (CITY_COORDS[v.departure_city]) positions.push(CITY_COORDS[v.departure_city]);
      if (CITY_COORDS[v.arrival_city]) positions.push(CITY_COORDS[v.arrival_city]);
    });
    pendingShipments.forEach((s) => {
      if (CITY_COORDS[s.arrival_city]) positions.push(CITY_COORDS[s.arrival_city]);
    });
    pendingMissions.forEach((m) => {
      if (m.city && CITY_COORDS[m.city]) positions.push(CITY_COORDS[m.city]);
    });
    return positions;
  }, [voyages, pendingShipments, pendingMissions]);

  // Build route lines GeoJSON
  const routeLines = useMemo(() => {
    const features = voyages
      .map((v) => {
        const from = CITY_COORDS[v.departure_city];
        const to = CITY_COORDS[v.arrival_city];
        if (!from || !to) return null;
        const isSelected = v.id === selectedVoyageId;
        return {
          type: "Feature" as const,
          properties: { selected: isSelected, id: v.id },
          geometry: { type: "LineString" as const, coordinates: [from, to] },
        };
      })
      .filter(Boolean);
    return { type: "FeatureCollection" as const, features };
  }, [voyages, selectedVoyageId]);

  // Fit bounds on mount/data change
  useEffect(() => {
    if (allPositions.length >= 2 && mapRef.current) {
      const lngs = allPositions.map((p) => p[0]);
      const lats = allPositions.map((p) => p[1]);
      mapRef.current.fitBounds(
        [
          [Math.min(...lngs) - 2, Math.min(...lats) - 2],
          [Math.max(...lngs) + 2, Math.max(...lats) + 2],
        ],
        { padding: 40, duration: 800 }
      );
    }
  }, [allPositions]);

  return (
    <div className="rounded-2xl overflow-hidden border border-border shadow-sm" style={{ height: 340 }}>
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{ longitude: 10, latitude: 20, zoom: 2 }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        scrollZoom={false}
        attributionControl={false}
      >
        <NavigationControl position="bottom-right" showCompass={false} />

        {/* Route lines */}
        <Source id="routes" type="geojson" data={routeLines as any}>
          <Layer
            id="route-lines-bg"
            type="line"
            filter={["==", ["get", "selected"], false]}
            paint={{ "line-color": "hsl(252, 40%, 75%)", "line-width": 2, "line-dasharray": [3, 2], "line-opacity": 0.5 }}
          />
          <Layer
            id="route-lines-selected"
            type="line"
            filter={["==", ["get", "selected"], true]}
            paint={{ "line-color": "hsl(214, 80%, 52%)", "line-width": 3, "line-opacity": 1 }}
          />
        </Source>

        {/* Voyage markers */}
        {voyages.map((v) => {
          const from = CITY_COORDS[v.departure_city];
          const to = CITY_COORDS[v.arrival_city];
          if (!from || !to) return null;
          return (
            <span key={v.id}>
              <Marker longitude={from[0]} latitude={from[1]} anchor="center">
                <MarkerDot color="hsl(214, 80%, 52%)" onClick={() => onSelectVoyage(v.id)} />
              </Marker>
              <Marker longitude={to[0]} latitude={to[1]} anchor="center">
                <MarkerDot color="hsl(252, 40%, 75%)" onClick={() => onSelectVoyage(v.id)} />
              </Marker>
            </span>
          );
        })}

        {/* Pending shipment markers */}
        {pendingShipments.map((s) => {
          const coords = CITY_COORDS[s.arrival_city];
          if (!coords) return null;
          return (
            <Marker key={`colis-${s.id}`} longitude={coords[0]} latitude={coords[1]} anchor="center">
              <MarkerDot color="hsl(38, 92%, 50%)" emoji="📦" />
            </Marker>
          );
        })}

        {/* Pending NeedIt markers */}
        {pendingMissions.map((m) => {
          const city = m.city || m.country;
          const coords = CITY_COORDS[city];
          if (!coords) return null;
          return (
            <Marker key={`needit-${m.id}`} longitude={coords[0]} latitude={coords[1]} anchor="center">
              <MarkerDot color="hsl(280, 70%, 55%)" />
            </Marker>
          );
        })}
      </Map>

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
            <span className="flex items-center gap-1">📦 Colis ({pendingShipments.length})</span>
          )}
          {pendingMissions.length > 0 && (
            <span className="flex items-center gap-1">🛍️ NeedIt ({pendingMissions.length})</span>
          )}
        </div>
      )}
    </div>
  );
};

export default VoyageMap;
