import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Map, { Marker, Source, Layer } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { MAPBOX_TOKEN } from "@/lib/mapbox";
import { ArrowLeft, Navigation, MapPin, Clock, Package, Loader2, Radio } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface LocationData {
  lat: number;
  lng: number;
  updatedAt: string;
}

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
  const watchIdRef = useRef<number | null>(null);
  const mapRef = useRef<any>(null);

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
    ? `COLY-${colisId?.slice(0, 8).toUpperCase()}`
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6">
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
    <div className="min-h-screen bg-background relative">
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
                  {isSharing ? "Voyageur en mouvement" : "Position non partagée"}
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
