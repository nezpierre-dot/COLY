import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Camera, Check, Clock, Loader2, Package, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import PhotoLightbox from "@/components/PhotoLightbox";
import Nido from "@/components/Nido";

interface Proof {
  id: string;
  photo_url: string;
  created_at: string;
}

interface Props {
  /** Mission or shipment ID (the proofs table column is called shipment_id for both) */
  itemId: string;
  /** Initial mission status from the parent fetch (kept in sync via realtime) */
  initialStatus: string;
  /** Optional: fired whenever the realtime channel pushes a status update */
  onStatusChange?: (newStatus: string) => void;
  /** Tracks shipments instead of needit_missions */
  source?: "needit_missions" | "shipments";
}

type Step = {
  key: "accepted" | "picked_up" | "in_transit" | "delivered";
  label: string;
  description: string;
  icon: typeof Check;
};

const STEPS: Step[] = [
  { key: "accepted", label: "Accepté", description: "Voyageur Nidit attribué", icon: Package },
  { key: "picked_up", label: "Récupéré", description: "Le colis est entre ses mains", icon: Camera },
  { key: "in_transit", label: "En route", description: "En cours d'acheminement", icon: Truck },
  { key: "delivered", label: "Livré", description: "Remis au destinataire", icon: Check },
];

const STATUS_ORDER = ["pending", "accepted", "picked_up", "in_transit", "delivered", "completed"];

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  const date = d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `${date} · ${time}`;
};

/**
 * Live mission/shipment timeline — Récupéré → En route → Livré, with timestamps
 * and photo proofs. Subscribes to Supabase Realtime to update in place when the
 * voyageur progresses or uploads a proof.
 */
const MissionLiveTimeline = ({
  itemId,
  initialStatus,
  onStatusChange,
  source = "needit_missions",
}: Props) => {
  const [status, setStatus] = useState(initialStatus);
  const [pickup, setPickup] = useState<Proof | null>(null);
  const [delivery, setDelivery] = useState<Proof | null>(null);
  const [loading, setLoading] = useState(true);

  // Initial load + subscribe to realtime updates
  useEffect(() => {
    let active = true;

    const fetchProofs = async () => {
      const [p, d] = await Promise.all([
        supabase
          .from("pickup_proofs")
          .select("id, photo_url, created_at")
          .eq("shipment_id", itemId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("delivery_proofs")
          .select("id, photo_url, created_at")
          .eq("shipment_id", itemId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (!active) return;
      if (p.data) setPickup(p.data as Proof);
      if (d.data) setDelivery(d.data as Proof);
      setLoading(false);
    };
    fetchProofs();

    const channel = supabase
      .channel(`mission-timeline-${itemId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: source, filter: `id=eq.${itemId}` },
        (payload) => {
          const next = (payload.new as { status?: string })?.status;
          if (next && next !== status) {
            setStatus(next);
            onStatusChange?.(next);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "pickup_proofs", filter: `shipment_id=eq.${itemId}` },
        (payload) => setPickup(payload.new as Proof)
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "delivery_proofs", filter: `shipment_id=eq.${itemId}` },
        (payload) => setDelivery(payload.new as Proof)
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId, source]);

  // Keep local status in sync if parent passes a fresher one
  useEffect(() => {
    if (initialStatus !== status) setStatus(initialStatus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialStatus]);

  const currentIndex = useMemo(() => {
    // Treat both `delivered` and NeedIt's `completed` as the final step
    const normalized = status === "completed" ? "delivered" : status;
    const stepIdx = STEPS.findIndex((s) => s.key === normalized);
    if (stepIdx >= 0) return stepIdx;
    // For statuses earlier than first step (e.g. pending)
    return STATUS_ORDER.indexOf(status) >= STATUS_ORDER.indexOf("accepted") ? 0 : -1;
  }, [status]);

  const isCancelled = status === "cancelled";
  const proofFor = (key: Step["key"]): Proof | null =>
    key === "picked_up" ? pickup : key === "delivered" ? delivery : null;

  const timestampFor = (key: Step["key"]): string | null => {
    if (key === "picked_up") return pickup?.created_at ?? null;
    if (key === "delivered") return delivery?.created_at ?? null;
    return null;
  };

  return (
    <section
      aria-label="Suivi en temps réel"
      className="rounded-2xl border border-border bg-card p-5"
    >
      <header className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="relative inline-flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
          </span>
          <h3 className="text-sm font-bold tracking-tight text-foreground">Suivi en temps réel</h3>
        </div>
        {loading && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
      </header>

      {isCancelled ? (
        <p className="text-sm text-destructive">Suivi interrompu — mission annulée.</p>
      ) : (
        <ol className="space-y-4">
          {STEPS.map((step, idx) => {
            const reached = idx <= currentIndex;
            const isCurrent = idx === currentIndex;
            const Icon = step.icon;
            const proof = proofFor(step.key);
            const ts = timestampFor(step.key);

            return (
              <motion.li
                key={step.key}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.06, duration: 0.3 }}
                className="relative flex gap-3"
              >
                {/* Connector */}
                {idx < STEPS.length - 1 && (
                  <span
                    aria-hidden="true"
                    className={`absolute left-[19px] top-10 bottom-[-12px] w-0.5 ${
                      idx < currentIndex ? "bg-primary" : "bg-border"
                    }`}
                  />
                )}

                <div
                  className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${
                    reached
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  } ${isCurrent ? "ring-2 ring-primary/40 ring-offset-2 ring-offset-card" : ""}`}
                >
                  {reached ? <Icon size={18} /> : <Clock size={16} />}
                </div>

                <div className="min-w-0 flex-1 pt-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p
                      className={`text-sm font-semibold ${
                        reached ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {step.label}
                    </p>
                    {ts && (
                      <time
                        dateTime={ts}
                        className="shrink-0 text-xs font-medium text-muted-foreground"
                      >
                        {formatDateTime(ts)}
                      </time>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>

                  {/* Proof thumbnail */}
                  {proof && (
                    <div className="mt-2">
                      <PhotoLightbox src={proof.photo_url} alt={`Preuve ${step.label}`}>
                        <div className="relative overflow-hidden rounded-xl border border-border">
                          <img
                            src={proof.photo_url}
                            alt={`Preuve ${step.label}`}
                            loading="lazy"
                            className="h-24 w-full object-cover"
                          />
                          <span className="absolute bottom-1 right-1 inline-flex items-center gap-1 rounded-md bg-background/85 px-1.5 py-0.5 text-[10px] font-bold text-foreground backdrop-blur">
                            <Camera size={10} aria-hidden="true" /> Preuve
                          </span>
                        </div>
                      </PhotoLightbox>
                    </div>
                  )}

                  {isCurrent && idx === STEPS.length - 1 && (
                    <div className="mt-2 inline-flex items-center justify-center">
                      <Nido pose="celebrate" size="sm" animate="bounce" />
                    </div>
                  )}
                </div>
              </motion.li>
            );
          })}
        </ol>
      )}
    </section>
  );
};

export default MissionLiveTimeline;
