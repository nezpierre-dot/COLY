import { Bell, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";

export default function PushNotificationToggle() {
  const { t } = useTranslation();
  const { supported, blocked, permission, subscribed, loading, subscribe, unsubscribe } =
    usePushNotifications();

  if (!supported) {
    return (
      <div className="text-sm text-muted-foreground">
        Notifications push non supportées par ce navigateur.
      </div>
    );
  }

  if (blocked) {
    return (
      <div className="text-sm text-muted-foreground">
        Notifications push indisponibles en aperçu. Installez l'app pour les activer.
      </div>
    );
  }

  if (permission === "denied") {
    return (
      <div className="text-sm text-destructive">
        Tu as bloqué les notifications. Réautorise-les dans les réglages du navigateur.
      </div>
    );
  }

  if (subscribed) {
    return (
      <Button
        variant="outline"
        onClick={async () => {
          await unsubscribe();
          toast({ title: "Notifications push désactivées" });
        }}
        disabled={loading}
        className="gap-2"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellOff className="h-4 w-4" />}
        Désactiver les notifications push
      </Button>
    );
  }

  return (
    <Button
      onClick={async () => {
        const ok = await subscribe();
        if (ok) toast({ title: "Notifications push activées 🔔" });
        else toast({ title: "Activation impossible", variant: "destructive" });
      }}
      disabled={loading}
      className="gap-2"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
      Activer les notifications push
    </Button>
  );
}
