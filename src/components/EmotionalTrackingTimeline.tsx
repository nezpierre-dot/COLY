/**
 * EmotionalTrackingTimeline — Composant drop-in pour ColisLiveTracker (F - V13).
 *
 * Différencié de l'existant `TrackingTimeline.tsx` : ajoute le côté "émotionnel"
 * (photos preuve à chaque étape, chat 1-tap, ETA dynamique, score satisfaction).
 *
 * À placer SOUS la carte Mapbox dans ColisLiveTracker.tsx :
 *
 *   <EmotionalTrackingTimeline
 *     steps={[
 *       { key: 'created', label: 'Demande créée', status: 'done', timestamp: '...' },
 *       { key: 'matched', label: 'Voyageur trouvé', status: 'done', voyageur: { ... } },
 *       { key: 'pickedup', label: 'Pris en charge', status: 'current', photoUrl: '...' },
 *       { key: 'enroute', label: 'En route', status: 'pending', eta: '14h32' },
 *       { key: 'delivered', label: 'Livré', status: 'pending' },
 *     ]}
 *     onChatClick={(id) => navigate(`/chat/${id}`)}
 *     onRate={(n) => submitRating(n)}
 *   />
 */

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Package, MapPin, Truck, CheckCircle2, Clock,
  MessageCircle, Star, Camera,
} from "lucide-react";
import { haptic } from "@/hooks/useHaptic";

export type EmotionalStepKey = "created" | "matched" | "pickedup" | "enroute" | "delivered";
export type EmotionalStepStatus = "done" | "current" | "pending";

export interface EmotionalTrackingStep {
  key: EmotionalStepKey;
  label: string;
  status: EmotionalStepStatus;
  timestamp?: string;
  photoUrl?: string;
  eta?: string;
  voyageur?: {
    id: string;
    name: string;
    avatarUrl?: string;
    rating?: number;
  };
}

interface Props {
  steps: EmotionalTrackingStep[];
  onChatClick?: (voyageurId: string) => void;
  onRate?: (rating: number) => void;
  className?: string;
}

const STEP_ICONS: Record<EmotionalStepKey, typeof Package> = {
  created: Package,
  matched: MapPin,
  pickedup: Camera,
  enroute: Truck,
  delivered: CheckCircle2,
};

export function EmotionalTrackingTimeline({ steps, onChatClick, onRate, className }: Props) {
  const [hoverRating, setHoverRating] = useState(0);
  const [submittedRating, setSubmittedRating] = useState<number | null>(null);

  const handleRate = (n: number) => {
    haptic("success");
    setSubmittedRating(n);
    onRate?.(n);
  };

  return (
    <ol
      aria-label="Suivi de livraison étape par étape"
      className={["relative space-y-3 pl-2", className].filter(Boolean).join(" ")}
    >
      {steps.map((step, i) => {
        const Icon = STEP_ICONS[step.key];
        const isLast = i === steps.length - 1;
        const isDone = step.status === "done";
        const isCurrent = step.status === "current";
        const isPending = step.status === "pending";

        return (
          <li key={step.key} className="relative pl-10">
            {!isLast && (
              <div
                className={`absolute left-3 top-9 bottom-0 w-0.5 ${isDone ? "bg-primary" : "bg-border"}`}
                aria-hidden="true"
              />
            )}

            <div className="absolute left-0 top-1">
              <motion.div
                initial={isCurrent ? { scale: 0.9 } : false}
                animate={isCurrent ? { scale: [0.95, 1.05, 0.95] } : {}}
                transition={isCurrent ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : {}}
                className={[
                  "w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2",
                  isDone && "bg-primary border-primary text-primary-foreground",
                  isCurrent && "bg-primary border-primary text-primary-foreground shadow-[0_0_0_4px_hsl(var(--primary)/0.18)]",
                  isPending && "bg-card border-border text-muted-foreground",
                ].filter(Boolean).join(" ")}
                aria-hidden="true"
              >
                <Icon size={14} />
              </motion.div>
            </div>

            <div className={`card-future p-4 ${isCurrent ? "ring-2 ring-primary/30" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-body-base font-bold ${isPending ? "text-muted-foreground" : "text-foreground"}`}>{step.label}</span>
                    {isCurrent && (<span className="chip-info text-[10px] px-2 py-0.5">En cours</span>)}
                  </div>
                  {step.timestamp && (
                    <div className="text-caption-base mt-0.5 flex items-center gap-1">
                      <Clock size={11} aria-hidden="true" />
                      {step.timestamp}
                    </div>
                  )}
                  {step.eta && !isDone && (
                    <div className="text-caption-base mt-0.5 text-primary font-semibold">ETA {step.eta}</div>
                  )}
                </div>

                {(step.key === "matched" || step.key === "enroute") && step.voyageur && !isPending && onChatClick && (
                  <button
                    type="button"
                    onClick={() => { haptic("selection"); onChatClick(step.voyageur!.id); }}
                    className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition shrink-0"
                    aria-label={`Chatter avec ${step.voyageur.name}`}
                  >
                    <MessageCircle size={16} aria-hidden="true" />
                  </button>
                )}
              </div>

              {step.key === "matched" && step.voyageur && !isPending && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/40">
                  {step.voyageur.avatarUrl ? (
                    <img src={step.voyageur.avatarUrl} alt="" className="w-8 h-8 rounded-full" loading="lazy" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                      {step.voyageur.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <span className="text-body-small font-semibold">{step.voyageur.name}</span>
                  {typeof step.voyageur.rating === "number" && (
                    <span className="text-caption-base flex items-center gap-0.5">
                      <Star size={11} className="fill-warning text-warning" aria-hidden="true" />
                      {step.voyageur.rating.toFixed(1)}
                    </span>
                  )}
                </div>
              )}

              {step.photoUrl && !isPending && (
                <div className="mt-3">
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-muted">
                    <img src={step.photoUrl} alt={`Preuve ${step.label}`} className="w-full h-full object-cover" loading="lazy" />
                    <span className="absolute top-2 left-2 chip-success text-[10px] px-2 py-0.5"><Camera size={10} aria-hidden="true" />Preuve</span>
                  </div>
                </div>
              )}

              {step.key === "delivered" && isCurrent && onRate && submittedRating === null && (
                <div className="mt-3 pt-3 border-t border-border/40">
                  <p className="text-body-small font-semibold mb-2">Comment s'est passée la livraison ?</p>
                  <div className="flex items-center gap-1" role="radiogroup" aria-label="Noter la livraison">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={hoverRating >= n}
                        onClick={() => handleRate(n)}
                        onMouseEnter={() => setHoverRating(n)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 focus-visible:ring-2 focus-visible:ring-primary rounded outline-none"
                        aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
                      >
                        <Star size={28} className={hoverRating >= n ? "fill-warning text-warning" : "text-muted-foreground"} aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {step.key === "delivered" && submittedRating !== null && (
                <div className="mt-3 pt-3 border-t border-border/40 flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-success" aria-hidden="true" />
                  <span className="text-body-small font-semibold">Merci ! Note enregistrée ({submittedRating}/5)</span>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default EmotionalTrackingTimeline;
