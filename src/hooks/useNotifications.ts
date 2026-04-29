import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import {
  translateNotifList,
  type DisplayNotification,
  type RawNotification,
} from "@/lib/notificationI18n";

/**
 * Public type kept identical to the legacy shape (title/message are the
 * already-translated display strings) so existing call sites keep working.
 * Extra `i18n_key`/`i18n_params` are exposed for future use.
 */
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  i18n_key?: string | null;
  i18n_params?: Record<string, unknown> | null;
}

export function useNotifications() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [rawNotifications, setRawNotifications] = useState<RawNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const deletedIdsRef = useRef(new Set<string>());

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("id, title, message, type, is_read, created_at, i18n_key, i18n_params")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) {
      const filtered = (data as RawNotification[]).filter(
        (n) => !deletedIdsRef.current.has(n.id),
      );
      setRawNotifications(filtered);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchNotifications();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotifications]);

  // Translate every notification using current language. Recompute when
  // language changes (i18n.language is part of useTranslation's render scope).
  const notifications = useMemo<Notification[]>(() => {
    const lang = i18n.language; // dependency for memoization
    void lang;
    const translated: DisplayNotification[] = translateNotifList(rawNotifications, t);
    return translated.map((n) => ({
      id: n.id,
      title: n.displayTitle,
      message: n.displayMessage,
      type: n.type,
      is_read: n.is_read,
      created_at: n.created_at,
      i18n_key: n.i18n_key,
      i18n_params: n.i18n_params,
    }));
  }, [rawNotifications, t, i18n.language]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setRawNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    setRawNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const deleteNotification = async (id: string) => {
    deletedIdsRef.current.add(id);
    setRawNotifications((prev) => prev.filter((n) => n.id !== id));
    const { error } = await supabase.from("notifications").delete().eq("id", id);
    if (error) {
      // Rollback if delete failed
      deletedIdsRef.current.delete(id);
      fetchNotifications();
    }
  };

  return {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh: fetchNotifications,
  };
}
