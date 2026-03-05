import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useUnreadMessages() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnread = useCallback(async () => {
    if (!user) return;

    // Get all conversation IDs for this user
    const { data: convos } = await supabase
      .from("conversations")
      .select("id")
      .or(`demandeur_id.eq.${user.id},voyageur_id.eq.${user.id}`);

    if (!convos || convos.length === 0) {
      setUnreadCount(0);
      return;
    }

    const convoIds = convos.map((c) => c.id);

    const { count } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .in("conversation_id", convoIds)
      .eq("is_read", false)
      .neq("sender_id", user.id);

    setUnreadCount(count || 0);
  }, [user]);

  useEffect(() => {
    fetchUnread();
  }, [fetchUnread]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("unread-messages-global")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => fetchUnread())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchUnread]);

  return unreadCount;
}
