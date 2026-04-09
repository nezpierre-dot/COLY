import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import Map, { Marker, Source, Layer } from "react-map-gl";
import type { MapRef } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { MapPin, Navigation, Loader2, Clock, Flag, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

import { MAPBOX_TOKEN } from "@/lib/mapbox";

/** Haversine distance in km between two lat/lng points */
function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface Props {
  /** The shipment or mission ID */
  itemId: string;
  /** The voyageur's user ID */
  voyageurId: string;
  /** Whether the current user is the voyageur */
  isVoyageur: boolean;
  /** Auto-start location sharing when component mounts (voyageur only) */
  autoStart?: boolean;
  /** Destination coordinates for distance estimation */
  destination?: { lat: number; lng: number; label?: string } | null;
}

const LiveLocationSharing = ({
  itemId,
  voyageurId,
  isVoyageur,
  autoStart = false,
  destination = null,
}: Props) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [sharing, setSharing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isRecent, setIsRecent] = useState(false);
  const recentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const mapRef = useRef<MapRef>(null);
  const demandeurIdRef = useRef<string | null>(null);
  const notifiedThresholdsRef = useRef<Set<number>>(new Set());

  // Mark timestamp as "recent" for 10s after each update
  const markRecent = useCallback(() => {
    setIsRecent(true);
    if (recentTimerRef.current) clearTimeout(recentTimerRef.current);
    recentTimerRef.current = setTimeout(() => setIsRecent(false), 10000);
  }, []);

  // Cleanup recent timer
  useEffect(() => {
    return () => {
      if (recentTimerRef.current) clearTimeout(recentTimerRef.current);
    };
  }, []);

  // Estimated distance to destination
  const distanceKm = useMemo(() => {
    if (!location || !destination) return null;
    return haversineKm(location.lat, location.lng, destination.lat, destination.lng);
  }, [location, destination]);

  // GeoJSON line between voyageur and destination
  const routeLineGeoJson = useMemo(() => {
    if (!location || !destination) return null;
    return {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "LineString" as const,
        coordinates: [
          [location.lng, location.lat],
          [destination.lng, destination.lat],
        ],
      },
    };
  }, [location, destination]);

  // Fit map to show both voyageur and destination
  const fitMapBounds = useCallback(() => {
    if (!location || !destination || !mapRef.current) return;
    const sw: [number, number] = [
      Math.min(location.lng, destination.lng),
      Math.min(location.lat, destination.lat),
    ];
    const ne: [number, number] = [
      Math.max(location.lng, destination.lng),
      Math.max(location.lat, destination.lat),
    ];
    mapRef.current.fitBounds([sw, ne], { padding: 40, maxZoom: 15, duration: 800 });
  }, [location, destination]);

  // Auto-fit bounds on first load
  const hasFittedRef = useRef(false);
  useEffect(() => {
    if (!location || !destination || hasFittedRef.current) return;
    fitMapBounds();
    hasFittedRef.current = true;
  }, [location, destination, fitMapBounds]);

  // Reset fit flag when destination changes
  useEffect(() => {
    hasFittedRef.current = false;
  }, [destination]);

  // Fetch demandeur ID for proximity notifications
  useEffect(() => {
    const fetchDemandeur = async () => {
      const { data: shipment } = await supabase
        .from("shipments")
        .select("user_id")
        .eq("id", itemId)
        .maybeSingle();
      if (shipment) {
        demandeurIdRef.current = shipment.user_id;
      } else {
        const { data: mission } = await supabase
          .from("needit_missions")
          .select("user_id")
          .eq("id", itemId)
          .maybeSingle();
        if (mission) demandeurIdRef.current = mission.user_id;
      }
    };
    if (isVoyageur) fetchDemandeur();
  }, [itemId, isVoyageur]);

  // Proximity notification thresholds in km
  const PROXIMITY_THRESHOLDS = [
    { km: 5, title: "📍 Voyageur à proximité", message: "Le voyageur est à moins de 5 km de la destination !" },
    { km: 1, title: "🏁 Arrivée imminente", message: "Le voyageur est à moins de 1 km — préparez-vous !" },
  ];

  const checkProximityNotifications = useCallback(
    async (lat: number, lng: number) => {
      if (!destination || !demandeurIdRef.current) return;
      const dist = haversineKm(lat, lng, destination.lat, destination.lng);
      for (const threshold of PROXIMITY_THRESHOLDS) {
        if (dist <= threshold.km && !notifiedThresholdsRef.current.has(threshold.km)) {
          notifiedThresholdsRef.current.add(threshold.km);
          await supabase.from("notifications").insert({
            user_id: demandeurIdRef.current,
            title: threshold.title,
            message: threshold.message,
            type: `proximity:${threshold.km}km:${itemId}`,
          });
        }
      }
    },
    [destination, itemId]
  );

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("live_locations")
        .select("*")
        .eq("shipment_id", itemId)
        .eq("user_id", voyageurId)
        .maybeSingle();

      if (data) {
        setSharing(data.is_sharing);
        setLocation({ lat: data.latitude, lng: data.longitude });
        setLastUpdated(data.updated_at);
      }
      setLoading(false);
    };
    load();
  }, [itemId, voyageurId]);

  // Subscribe to realtime updates (for demandeur)
  useEffect(() => {
    if (isVoyageur) return;

    const channel = supabase
      .channel(`live-loc-${itemId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_locations",
          filter: `shipment_id=eq.${itemId}`,
        },
        (payload: any) => {
          const row = payload.new;
          if (row) {
            setLocation({ lat: row.latitude, lng: row.longitude });
            setSharing(row.is_sharing);
            setLastUpdated(row.updated_at);
            markRecent();
          }
          if (payload.eventType === "DELETE") {
            setSharing(false);
            setLocation(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [itemId, isVoyageur, markRecent]);

  // GPS watch for voyageur
  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error(t("location.notSupported"));
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLocation({ lat, lng });
        const now = new Date().toISOString();
        setLastUpdated(now);
        markRecent();

        // Upsert position
        await supabase.from("live_locations").upsert(
          {
            user_id: user!.id,
            shipment_id: itemId,
            latitude: lat,
            longitude: lng,
            is_sharing: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,shipment_id" }
        );

        // Check proximity and notify demandeur
        await checkProximityNotifications(lat, lng);
      },
      (err) => {
        console.error("Geolocation error:", err);
        toast.error(t("location.error"));
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );
  }, [user, itemId, t, markRecent, checkProximityNotifications]);

  const stopWatching = useCallback(async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    await supabase
      .from("live_locations")
      .update({ is_sharing: false })
      .eq("user_id", user!.id)
      .eq("shipment_id", itemId);
  }, [user, itemId]);

  // Auto-start sharing for voyageur
  useEffect(() => {
    if (autoStart && isVoyageur && !loading && !sharing) {
      setSharing(true);
      startWatching();
    }
  }, [autoStart, isVoyageur, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const handleToggle = async (enabled: boolean) => {
    setSharing(enabled);
    if (enabled) {
      startWatching();
      toast.success(t("location.sharingOn"));
    } else {
      stopWatching();
      toast.success(t("location.sharingOff"));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 size={20} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Navigation size={16} className="text-primary" />
          <span className="text-sm font-semibold text-foreground">{t("location.title")}</span>
        </div>
        {isVoyageur && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {sharing ? t("location.on") : t("location.off")}
            </span>
            <Switch checked={sharing} onCheckedChange={handleToggle} />
          </div>
        )}
      </div>

      {/* Map or placeholder */}
      <AnimatePresence mode="wait">
        {sharing && location ? (
          <motion.div
            key="map"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 200 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Map
              ref={mapRef}
              mapboxAccessToken={MAPBOX_TOKEN}
              initialViewState={{
                longitude: location.lng,
                latitude: location.lat,
                zoom: 14,
              }}
              style={{ width: "100%", height: 200 }}
              mapStyle="mapbox://styles/mapbox/light-v11"
              attributionControl={false}
              interactive={!isVoyageur}
            >
              {/* Voyageur marker */}
              <Marker longitude={location.lng} latitude={location.lat} anchor="bottom">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg border-2 border-white">
                    <MapPin size={16} className="text-primary-foreground" />
                  </div>
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-primary animate-ping" />
                </div>
              </Marker>

              {/* Destination marker */}
              {destination && (
                <Marker longitude={destination.lng} latitude={destination.lat} anchor="bottom">
                  <div className="relative">
                    <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center shadow-md border-2 border-white">
                      <Flag size={14} className="text-accent-foreground" />
                    </div>
                  </div>
                </Marker>
              )}

              {/* Route line between voyageur and destination */}
              {routeLineGeoJson && (
                <Source id="route-line" type="geojson" data={routeLineGeoJson}>
                  <Layer
                    id="route-line-layer"
                    type="line"
                    paint={{
                      "line-color": "#6366f1",
                      "line-width": 2.5,
                      "line-dasharray": [3, 2],
                      "line-opacity": 0.7,
                    }}
                  />
                </Source>
              )}

              {/* Recenter button */}
              {destination && (
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute top-2 right-2 z-10 h-8 w-8 rounded-lg shadow-md"
                  onClick={fitMapBounds}
                >
                  <Maximize2 size={14} />
                </Button>
              )}
            </Map>
          </motion.div>
        ) : (
          <motion.div
            key="placeholder"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-8 px-4 text-center"
          >
            <MapPin size={24} className="text-muted-foreground mb-2" />
            <p className="text-xs text-muted-foreground">
              {isVoyageur ? t("location.activateHint") : t("location.waitingHint")}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer: timestamp + distance */}
      {sharing && (lastUpdated || distanceKm !== null) && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-border">
          {/* Timestamp with pulse animation when recent */}
          {lastUpdated && (
            <motion.div
              className="flex items-center gap-1.5"
              animate={isRecent ? { scale: [1, 1.05, 1] } : {}}
              transition={{ duration: 0.6, repeat: isRecent ? Infinity : 0, repeatType: "loop" }}
            >
              <div className="relative">
                <Clock size={12} className="text-muted-foreground" />
                {isRecent && (
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                )}
              </div>
              <span className={`text-[11px] ${isRecent ? "text-primary font-medium" : "text-muted-foreground"}`}>
                {new Date(lastUpdated).toLocaleTimeString()}
              </span>
            </motion.div>
          )}

          {/* Distance estimation */}
          {distanceKm !== null && (
            <div className="flex items-center gap-1.5">
              <Flag size={12} className="text-muted-foreground" />
              <span className="text-[11px] font-medium text-foreground">
                {distanceKm < 1
                  ? `${Math.round(distanceKm * 1000)} m`
                  : `${distanceKm.toFixed(1)} km`}
              </span>
              {destination?.label && (
                <span className="text-[11px] text-muted-foreground truncate max-w-[100px]">
                  — {destination.label}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LiveLocationSharing;
