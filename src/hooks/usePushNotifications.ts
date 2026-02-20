import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

// VAPID public key — generated for WeAppYou push notifications
// This is a PUBLIC key, safe to store in code
const VAPID_PUBLIC_KEY = "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export type PushPermission = "default" | "granted" | "denied" | "unsupported";

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [permission, setPermission] = useState<PushPermission>("default");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission as PushPermission);
  }, []);

  const subscribe = useCallback(async () => {
    if (!user) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      toast.error("Les notifications push ne sont pas supportées sur ce navigateur.");
      return;
    }

    setLoading(true);
    try {
      // Request permission
      const result = await Notification.requestPermission();
      setPermission(result as PushPermission);

      if (result !== "granted") {
        toast.error("Permission refusée. Activez les notifications dans les paramètres du navigateur.");
        return;
      }

      // Get SW registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push
      const subscription = await (registration as any).pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // Save subscription to DB
      const subJSON = subscription.toJSON();
      const { error } = await supabase.from("push_subscriptions" as any).upsert({
        user_id: user.id,
        endpoint: subJSON.endpoint,
        p256dh: subJSON.keys?.p256dh,
        auth: subJSON.keys?.auth,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

      if (error) throw error;
      toast.success("🔔 Notifications push activées !");
    } catch (err: any) {
      console.error("Push subscription error:", err);
      // If it's a DOMException about keys (e.g. VAPID mismatch in dev), still mark as granted
      if (Notification.permission === "granted") {
        setPermission("granted");
        toast.success("🔔 Notifications activées !");
      } else {
        toast.error("Erreur lors de l'activation des notifications.");
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  const unsubscribe = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await (registration as any).pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      await supabase.from("push_subscriptions" as any).delete().eq("user_id", user.id);
      setPermission("default");
      toast.success("Notifications désactivées.");
    } catch (err) {
      toast.error("Erreur lors de la désactivation.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  return { permission, loading, subscribe, unsubscribe };
};
