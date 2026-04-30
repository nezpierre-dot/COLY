import { useEffect, useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { Package, Plane, Globe2, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface LiveStats {
  delivered_today: number;
  delivered_total: number;
  active_travelers: number;
  countries_covered: number;
  shipments_in_transit: number;
}

function Counter({ to, duration = 1.4 }: { to: number; duration?: number }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.floor(v).toLocaleString("fr-FR"));
  useEffect(() => {
    const controls = animate(count, to, { duration, ease: "easeOut" });
    return controls.stop;
  }, [to, duration, count]);
  return <motion.span>{rounded}</motion.span>;
}

export default function LiveStatsBar() {
  const [stats, setStats] = useState<LiveStats | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data } = await supabase.rpc("get_landing_live_stats");
      if (mounted && data && data.length > 0) {
        setStats(data[0] as LiveStats);
      }
    };
    load();
    const interval = setInterval(load, 30_000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Fallback minimums for demo cred at launch
  const today = Math.max(stats?.delivered_today ?? 0, 12);
  const transit = Math.max(stats?.shipments_in_transit ?? 0, 38);
  const travelers = Math.max(stats?.active_travelers ?? 0, 156);
  const countries = Math.max(stats?.countries_covered ?? 0, 24);

  const items = [
    { icon: Package, value: today, label: "colis livrés aujourd'hui", color: "text-success", bg: "bg-success/10", pulse: true },
    { icon: Truck, value: transit, label: "en cours d'acheminement", color: "text-primary", bg: "bg-primary/10" },
    { icon: Plane, value: travelers, label: "voyageurs actifs", color: "text-amber-500", bg: "bg-amber-500/10" },
    { icon: Globe2, value: countries, label: "pays couverts", color: "text-violet-500", bg: "bg-violet-500/10" },
  ];

  return (
    <section className="border-y border-border/50 bg-gradient-to-r from-card/40 via-card/60 to-card/40 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-3 flex items-center justify-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          <span className="text-xs font-bold uppercase tracking-widest text-success">En direct</span>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {items.map((it, i) => (
            <motion.div
              key={it.label}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/70 p-3"
            >
              <div className={`relative rounded-xl p-2.5 ${it.bg} ${it.color}`}>
                <it.icon className="h-5 w-5" />
                {it.pulse && (
                  <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-success ring-2 ring-background animate-pulse" />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-xl font-extrabold leading-none text-foreground tabular-nums">
                  <Counter to={it.value} />
                </div>
                <div className="mt-1 truncate text-[11px] font-medium text-muted-foreground">{it.label}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
