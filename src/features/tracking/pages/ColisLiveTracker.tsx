import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Map, { Marker, Source, Layer } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { MAPBOX_TOKEN } from "@/lib/mapbox";
import { ArrowLeft, Navigation, MapPin, Clock, Package, Loader2, Radio, Timer } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface LocationData {
  lat: number;
  lng: number;
  updatedAt: string;
}

interface ETAData {
  distanceKm: number;
  durationMin: number;
  routeGeoJson: GeoJSON.Feature | null;
}

/** Geocode a city name via Mapbox Geocoding API */
const geocodeCity = async (city: string, country?: string): Promise<{ lng: number; lat: number } | null> => {
  const query = country ? `${city}, ${country}` : city;
  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&limit=1`
    );
    const data = await res.json();
    if (data.features?.length > 0) {
      const [lng, lat] = data.features[0].center;
      return { lng, lat };
    }
  } catch (e) {
    console.error("Geocode error:", e);
  }
  return null;
};

/** Fetch route + ETA from Mapbox Directions API */
const fetchDirections = async (
  origin: { lng: number; lat: number },
  destination: { lng: number; lat: number }
): Promise<ETAData | null> => {
  try {
    const res = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`
    );
    const data = await res.json();
    if (data.routes?.length > 0) {
      const route = data.routes[0];
      return {
        distanceKm: Math.round(route.distance / 100) / 10,
        durationMin: Math.round(route.duration / 60),
        routeGeoJson: {
          type: "Feature" as const,
          properties: {},
          geometry: route.geometry,
        },
      };
    }
  } catch (e) {
    console.error("Directions error:", e);
  }
  return null;
};

const formatETA = (minutes: number): string => {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
};

const ColisLiveTracker = () => {
  const navigate = useNavigate();
  const { colisId } = useParams<{ colisId: string }>();
  const { user } = useAuth();
  const { t } = useTranslation();

  const [shipment, setShipment] = useState<any>(null);
  const [mission, setMission] = useState<any>(null);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isVoyageur, setIsVoyageur] = useState(false);
  const [watching, setWatching] = useState(false);
  const [eta, setEta] = useState<ETAData | null>(null);
  const [destination, setDestination] = useState<{ lng: number; lat: number } | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const mapRef = useRef<any>(null);
  const etaThrottleRef = useRef<number>(0);

  // Load item data (shipment or needit mission)
  useEffect(() => {
    if (!colisId) return;

    const load = async () => {
      // Try shipment first
      const { data: ship } = await supabase
        .from("shipments")
        .select("*")
        .eq("id", colisId)
        .maybeSingle();

      if (ship) {
        setShipment(ship);
        setIsVoyageur(user?.id === ship.voyageur_id);
      } else {
        // Try needit mission
        const { data: mis } = await supabase
          .from("needit_missions")
          .select("*")
          .eq("id", colisId)
          .maybeSingle();
        if (mis) {
          setMission(mis);
          setIsVoyageur(user?.id === mis.voyageur_id);
        }
      }

      // Load existing live location
      const { data: loc } = await supabase
        .from("live_locations")
        .select("*")
        .eq("shipment_id", colisId)
        .maybeSingle();

      if (loc) {
        setLocation({ lat: loc.latitude, lng: loc.longitude, updatedAt: loc.updated_at });
        setIsSharing(loc.is_sharing);
      }

      setLoading(false);
    };
    load();
  }, [colisId, user]);

  // Geocode destination city once item is loaded
  useEffect(() => {
    const item = shipment || mission;
    if (!item) return;

    const destCity = shipment?.arrival_city || mission?.city;
    const destCountry = shipment?.arrival_country || mission?.country;
    if (!destCity && !destCountry) return;

    geocodeCity(destCity || destCountry, destCountry).then((coords) => {
      if (coords) setDestination(coords);
    });
  }, [shipment, mission]);

  // Compute ETA when location or destination changes (throttled to every 30s)
  useEffect(() => {
    if (!location || !destination || !isSharing) {
      setEta(null);
      return;
    }

    const now = Date.now();
    if (now - etaThrottleRef.current < 30000 && eta) return;
    etaThrottleRef.current = now;

    fetchDirections(
      { lng: location.lng, lat: location.lat },
      destination
    ).then((result) => {
      if (result) setEta(result);
    });
  }, [location, destination, isSharing]);

  // Realtime subscription
  useEffect(() => {
    if (!colisId) return;

    const channel = supabase
      .channel(`live-tracker-${colisId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_locations",
          filter: `shipment_id=eq.${colisId}`,
        },
        (payload: any) => {
          if (payload.eventType === "DELETE") {
            setIsSharing(false);
            setLocation(null);
            return;
          }
          const row = payload.new;
          if (row) {
            setLocation({ lat: row.latitude, lng: row.longitude, updatedAt: row.updated_at });
            setIsSharing(row.is_sharing);
            // Auto-pan map
            if (mapRef.current && !isVoyageur) {
              mapRef.current.flyTo({
                center: [row.longitude, row.latitude],
                duration: 1000,
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [colisId, isVoyageur]);

  // GPS watch for voyageur
  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Géolocalisation non supportée");
      return;
    }
    setWatching(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const now = new Date().toISOString();
        setLocation({ lat, lng, updatedAt: now });

        await supabase.from("live_locations").upsert(
          {
            user_id: user!.id,
            shipment_id: colisId!,
            latitude: lat,
            longitude: lng,
            is_sharing: true,
            updated_at: now,
          },
          { onConflict: "user_id,shipment_id" }
        );
      },
      (err) => {
        console.error("Geolocation error:", err);
        toast.error("Erreur de géolocalisation");
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
  }, [user, colisId]);

  const stopWatching = useCallback(async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setWatching(false);
    setIsSharing(false);

    await supabase
      .from("live_locations")
      .update({ is_sharing: false })
      .eq("user_id", user!.id)
      .eq("shipment_id", colisId!);
  }, [user, colisId]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const item = shipment || mission;
  const itemType = shipment ? "shipment" : "needit";
  const refLabel = shipment
    ? `NIDIT-${colisId?.slice(0, 8).toUpperCase()}`
    : `NEED-${colisId?.slice(0, 8).toUpperCase()}`;

  // Compute time since last update
  const timeSinceUpdate = location?.updatedAt
    ? (() => {
        const diff = Math.floor((Date.now() - new Date(location.updatedAt).getTime()) / 1000);
        if (diff < 60) return `${diff}s`;
        if (diff < 3600) return `${Math.floor(diff / 60)}min`;
        return `${Math.floor(diff / 3600)}h`;
      })()
    : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-soft flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-gradient-soft flex flex-col items-center justify-center gap-4 px-6">
        <Package size={48} className="text-muted-foreground" />
        <p className="text-muted-foreground text-center">Colis introuvable</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Retour
        </Button>
      </div>
    );
  }

  const defaultCenter = location
    ? { longitude: location.lng, latitude: location.lat }
    : { longitude: 2.3522, latitude: 48.8566 };

  return (
    <div className="min-h-screen bg-gradient-soft relative">
      {/* Full-screen map */}
      <div className="absolute inset-0">
        <Map
          ref={mapRef}
          mapboxAccessToken={MAPBOX_TOKEN}
          initialViewState={{
            ...defaultCenter,
            zoom: location ? 14 : 5,
          }}
          style={{ width: "100%", height: "100%" }}
          mapStyle="mapbox://styles/mapbox/dark-v11"
          attributionControl={false}
        >
          {/* Route line */}
          {eta?.routeGeoJson && (
            <Source id="route" type="geojson" data={eta.routeGeoJson}>
              <Layer
                id="route-line"
                type="line"
                paint={{
                  "line-color": "hsl(221, 83%, 53%)",
                  "line-width": 4,
                  "line-opacity": 0.7,
                }}
                layout={{
                  "line-cap": "round",
                  "line-join": "round",
                }}
              />
            </Source>
          )}

          {/* Destination marker */}
          {destination && isSharing && (
            <Marker longitude={destination.lng} latitude={destination.lat} anchor="bottom">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-destructive flex items-center justify-center shadow-lg border-2 border-background">
                  <MapPin size={16} className="text-destructive-foreground" />
                </div>
                <div className="mt-1 px-2 py-0.5 rounded-full bg-card/90 backdrop-blur-sm border border-border">
                  <span className="text-[9px] font-bold text-foreground">Destination</span>
                </div>
              </div>
            </Marker>
          )}

          {/* Voyageur marker */}
          {location && isSharing && (
            <Marker longitude={location.lng} latitude={location.lat} anchor="center">
              <div className="relative">
                {/* Pulse ring */}
                <div className="absolute inset-0 w-12 h-12 -m-2 rounded-full bg-primary/20 animate-ping" />
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg border-2 border-background z-10 relative">
                  <Navigation size={16} className="text-primary-foreground" />
                </div>
              </div>
            </Marker>
          )}
        </Map>
      </div>

      {/* Top bar overlay */}
      <div className="absolute top-0 left-0 right-0 z-10 px-4 pt-12 pb-4 bg-gradient-to-b from-background/90 to-transparent">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-card/90 backdrop-blur-sm border border-border flex items-center justify-center shadow-md"
          >
            <ArrowLeft size={18} className="text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-sm font-bold text-foreground">Suivi en direct</h1>
            <p className="text-xs text-muted-foreground">{refLabel}</p>
          </div>
          {isSharing && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/15 border border-green-500/30">
              <Radio size={10} className="text-green-500 animate-pulse" />
              <span className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase tracking-wider">Live</span>
            </div>
          )}
        </div>
      </div>

      {/* ETA floating badge */}
      {eta && isSharing && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="absolute top-28 left-1/2 -translate-x-1/2 z-10"
        >
          <div className="bg-card/95 backdrop-blur-md border border-border rounded-2xl px-5 py-3 shadow-2xl flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
                <Timer size={16} className="text-primary" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">ETA</p>
                <p className="text-lg font-bold text-foreground leading-tight">{formatETA(eta.durationMin)}</p>
              </div>
            </div>
            <div className="w-px h-8 bg-border" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Distance</p>
              <p className="text-lg font-bold text-foreground leading-tight">{eta.distanceKm} km</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Bottom panel */}
      <AnimatePresence>
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring", damping: 25 }}
          className="absolute bottom-0 left-0 right-0 z-10 px-4 pb-8"
        >
          <div className="bg-card/95 backdrop-blur-md border border-border rounded-2xl p-5 shadow-2xl space-y-4">
            {/* Status row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${isSharing ? "bg-green-500 animate-pulse" : "bg-muted-foreground/40"}`} />
                <span className="text-sm font-semibold text-foreground">
                  {isSharing ? "Voyageur Nidit en mouvement" : "Position non partagée"}
                </span>
              </div>
              {timeSinceUpdate && isSharing && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock size={10} />
                  <span>il y a {timeSinceUpdate}</span>
                </div>
              )}
            </div>

            {/* Route info */}
            <div className="flex items-center gap-3 py-2 px-3 rounded-xl bg-muted/50">
              <MapPin size={14} className="text-primary shrink-0" />
              <span className="text-sm text-foreground font-medium">
                {shipment
                  ? `${shipment.departure_city || "—"} → ${shipment.arrival_city}`
                  : `${mission?.city || mission?.country || "—"}`}
              </span>
            </div>

            {/* ETA inline for bottom panel */}
            {eta && isSharing && (
              <div className="flex items-center gap-3 py-2 px-3 rounded-xl bg-primary/5 border border-primary/10">
                <Timer size={14} className="text-primary shrink-0" />
                <span className="text-sm text-foreground font-medium">
                  Arrivée estimée dans <span className="font-bold text-primary">{formatETA(eta.durationMin)}</span>
                  <span className="text-muted-foreground"> — {eta.distanceKm} km restants</span>
                </span>
              </div>
            )}

            {/* Coordinates */}
            {location && isSharing && (
              <div className="text-xs text-muted-foreground text-center">
                📍 {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
              </div>
            )}

            {/* Action buttons */}
            {isVoyageur ? (
              <Button
                className="w-full rounded-xl font-bold"
                variant={watching ? "destructive" : "default"}
                onClick={() => (watching ? stopWatching() : startWatching())}
              >
                <Navigation size={16} className="mr-2" />
                {watching ? "Arrêter le partage" : "Partager ma position"}
              </Button>
            ) : (
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl"
                  onClick={() =>
                    navigate(
                      shipment
                        ? `/tracking/${colisId}`
                        : `/mission/${colisId}`
                    )
                  }
                >
                  Voir le suivi
                </Button>
                <Button
                  className="flex-1 rounded-xl font-bold"
                  disabled={!location || !isSharing}
                  onClick={() => {
                    if (location && mapRef.current) {
                      mapRef.current.flyTo({
                        center: [location.lng, location.lat],
                        zoom: 16,
                        duration: 1500,
                      });
                    }
                  }}
                >
                  <Navigation size={14} className="mr-2" />
                  Centrer
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default ColisLiveTracker;
