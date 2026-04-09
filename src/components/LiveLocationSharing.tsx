import { useEffect, useState, useRef, useCallback } from "react";
import Map, { Marker } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { MapPin, Navigation, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

import { MAPBOX_TOKEN } from "@/lib/mapbox";

interface Props {
  /** The shipment or mission ID */
  itemId: string;
  /** The voyageur's user ID */
  voyageurId: string;
  /** Whether the current user is the voyageur */
  isVoyageur: boolean;
  /** Auto-start location sharing when component mounts (voyageur only) */
  autoStart?: boolean;
}

const LiveLocationSharing = ({ itemId, voyageurId, isVoyageur, autoStart = false }: Props) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [sharing, setSharing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Load existing location record
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
  }, [itemId, isVoyageur]);

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
      },
      (err) => {
        console.error("Geolocation error:", err);
        toast.error(t("location.error"));
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );
  }, [user, itemId, t]);

  const stopWatching = useCallback(async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    // Update sharing status
    await supabase
      .from("live_locations")
      .update({ is_sharing: false })
      .eq("user_id", user!.id)
      .eq("shipment_id", itemId);
  }, [user, itemId]);

  // Auto-start sharing for voyageur when in_transit
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
              <Marker longitude={location.lng} latitude={location.lat} anchor="bottom">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg border-2 border-white">
                    <MapPin size={16} className="text-primary-foreground" />
                  </div>
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-primary animate-ping" />
                </div>
              </Marker>
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
    </div>
  );
};

export default LiveLocationSharing;
