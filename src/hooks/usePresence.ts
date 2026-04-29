import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const PRESENCE_CHANNEL = "presence:online-users";
const HEARTBEAT_MS = 60_000; // touch_last_seen every minute while tab is visible

/**
 * Tracks the current user's presence on a global Realtime channel and
 * heartbeats `last_seen_at` in the DB.
 * Should be mounted once near the App root for authenticated sessions.
 */
export function useGlobalPresenceTracker() {
  const { user } = useAuth();
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase.channel(PRESENCE_CHANNEL, {
      config: { presence: { key: user.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        // no-op (consumers subscribe via useUserPresence)
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ online_at: new Date().toISOString() });
          await supabase.rpc("touch_last_seen").then(() => {}, () => {});
        }
      });

    const beat = () => {
      if (document.visibilityState === "visible") {
        supabase.rpc("touch_last_seen").then(() => {}, () => {});
        channel.track({ online_at: new Date().toISOString() }).catch(() => {});
      }
    };
    heartbeatRef.current = setInterval(beat, HEARTBEAT_MS);

    const onVis = () => beat();
    document.addEventListener("visibilitychange", onVis);

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      document.removeEventListener("visibilitychange", onVis);
      supabase.removeChannel(channel);
    };
  }, [user?.id]);
}

/**
 * Subscribes to the global presence channel and returns the set of user IDs
 * currently online. Use a single instance high in the tree to avoid duplicate
 * channels.
 */
export function useOnlineUsers(): Set<string> {
  const [online, setOnline] = useState<Set<string>>(new Set());

  useEffect(() => {
    const channel = supabase.channel(PRESENCE_CHANNEL);

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setOnline(new Set(Object.keys(state)));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return online;
}

/**
 * Returns presence info for a single user.
 * `isOnline` comes from realtime presence; `lastSeenAt` is the DB fallback.
 */
export function useUserPresence(userId: string | null | undefined): {
  isOnline: boolean;
  lastSeenAt: string | null;
} {
  const online = useOnlineUsers();
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLastSeenAt(null);
      return;
    }
    let cancelled = false;
    supabase
      .from("profiles_public" as any)
      .select("last_seen_at")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setLastSeenAt((data as any)?.last_seen_at ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return {
    isOnline: !!userId && online.has(userId),
    lastSeenAt,
  };
}

/**
 * Format a "vu il y a X" label from an ISO timestamp.
 */
export function formatLastSeen(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `vu il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `vu il y a ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `vu il y a ${d} j`;
  return "vu il y a longtemps";
}
