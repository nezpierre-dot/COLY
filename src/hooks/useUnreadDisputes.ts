import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useUnreadDisputes() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnread = useCallback(async () => {
    if (!user) return;

    // Get all dispute IDs for this user
    const { data: disputes } = await supabase
      .from("disputes")
      .select("id")
      .eq("user_id", user.id);

    if (!disputes || disputes.length === 0) {
      setUnreadCount(0);
      return;
    }

    const disputeIds = disputes.map((d) => d.id);

    // Count admin messages that are newer than user's last message per dispute
    const { data: msgs } = await supabase
      .from("dispute_messages" as any)
      .select("dispute_id, sender_role, created_at")
      .in("dispute_id", disputeIds)
      .order("created_at", { ascending: false });

    if (!msgs || (msgs as any[]).length === 0) {
      setUnreadCount(0);
      return;
    }

    // For each dispute, check if last message is from admin (= unread response)
    const disputeLastMsg: Record<string, string> = {};
    (msgs as any[]).forEach((m: any) => {
      if (!disputeLastMsg[m.dispute_id]) {
        disputeLastMsg[m.dispute_id] = m.sender_role;
      }
    });

    const count = Object.values(disputeLastMsg).filter((role) => role === "admin").length;
    setUnreadCount(count);
  }, [user]);

  useEffect(() => {
    fetchUnread();
  }, [fetchUnread]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("unread-disputes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "dispute_messages" }, () => fetchUnread())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchUnread]);

  return unreadCount;
}
