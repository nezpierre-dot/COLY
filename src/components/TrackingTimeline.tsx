import { motion } from "framer-motion";
import { Check, Clock, Truck, Package, MapPin, XCircle } from "lucide-react";
import Nido from "@/components/Nido";

interface TrackingEvent {
  id: string;
  status: string;
  label: string;
  description: string | null;
  created_at: string;
}

interface TrackingTimelineProps {
  events: TrackingEvent[];
}

const statusConfig: Record<string, { icon: typeof Check; color: string; bgColor: string }> = {
  pending: { icon: Clock, color: "text-accent", bgColor: "bg-accent/15" },
  accepted: { icon: Package, color: "text-primary", bgColor: "bg-primary/15" },
  picked_up: { icon: Package, color: "text-secondary", bgColor: "bg-secondary/15" },
  in_transit: { icon: Truck, color: "text-primary", bgColor: "bg-primary/15" },
  delivered: { icon: Check, color: "text-green-600", bgColor: "bg-green-500/15" },
  cancelled: { icon: XCircle, color: "text-destructive", bgColor: "bg-destructive/15" },
};

const TrackingTimeline = ({ events }: TrackingTimelineProps) => {
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  };

  // Most recent event drives the contextual mascot pose
  const currentStatus = events[0]?.status;
  const isInTransit = currentStatus === "in_transit" || currentStatus === "picked_up";
  const isDelivered = currentStatus === "delivered";

  return (
    <div className="relative">
      {(isInTransit || isDelivered) && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-4 flex items-center justify-center"
        >
          <Nido
            pose={isDelivered ? "celebrate" : "fly"}
            size="md"
            animate={isDelivered ? "bounce" : "float"}
          />
        </motion.div>
      )}
      {events.map((event, index) => {
        const config = statusConfig[event.status] || statusConfig.pending;
        const Icon = config.icon;
        const isLast = index === 0; // Most recent first
        const isFirst = index === events.length - 1;

        return (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.08, duration: 0.3, ease: "easeOut" }}
            className="relative flex gap-4 pb-6 last:pb-0"
          >
            {/* Vertical line */}
            {!isFirst && (
              <div className="absolute left-[19px] top-10 bottom-0 w-0.5 bg-border" />
            )}

            {/* Icon circle */}
            <div className={`relative z-10 w-10 h-10 rounded-full ${config.bgColor} flex items-center justify-center shrink-0 ${
              isLast ? "ring-2 ring-offset-2 ring-offset-background ring-current " + config.color : ""
            }`}>
              <Icon size={18} className={config.color} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-center justify-between gap-2">
                <p className={`text-sm font-semibold ${isLast ? "text-foreground" : "text-muted-foreground"}`}>
                  {event.label}
                </p>
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatTime(event.created_at)}
                </span>
              </div>
              {event.description && (
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {event.description}
                </p>
              )}
              <p className="text-xs text-muted-foreground/60 mt-1">
                {formatDate(event.created_at)}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default TrackingTimeline;
