/**
 * VoyageurProfileBadges — Composant drop-in pour enrichir PublicProfile (E - V13).
 *
 * Affiche :
 *  - Badges objectivés (KYC, ponctualité, vétéran, top trajet, etc.)
 *  - Bloc trust signals (selfie vidéo, langues parlées, réponse < 1h)
 *  - 3 réponses aux questions "Pourquoi tu voyages", "Tes types préférés", "Ma promesse"
 *
 * Usage :
 *   <VoyageurProfileBadges
 *     verifiedKyc
 *     verifiedSince="2024-03"
 *     totalDeliveries={42}
 *     onTimeRate={98}
 *     averageRating={4.9}
 *     topRoute="Paris ↔ Casa"
 *     languages={["FR", "AR", "EN"]}
 *     responseTime="< 1h"
 *     answers={{
 *       whyTravel: "Je rentre voir ma famille au Maroc 1× par mois.",
 *       favoriteTypes: "Cosmétiques, vêtements, cadeaux.",
 *       promise: "Photo à la prise en charge, livraison à 30 min près."
 *     }}
 *   />
 */

import { type ReactNode } from "react";
import {
  ShieldCheck, Award, Star, MapPin, Clock, MessageSquare,
  Languages, Heart, type LucideIcon,
} from "lucide-react";

export interface VoyageurProfileBadgesProps {
  verifiedKyc?: boolean;
  verifiedSince?: string;
  totalDeliveries?: number;
  onTimeRate?: number;
  averageRating?: number;
  topRoute?: string;
  languages?: string[];
  responseTime?: string;
  videoSelfieUrl?: string;
  answers?: {
    whyTravel?: string;
    favoriteTypes?: string;
    promise?: string;
  };
  className?: string;
}

interface Badge {
  icon: LucideIcon;
  label: string;
  tone: "primary" | "success" | "warning" | "accent";
  show: boolean;
}

const TONE_CLASSES: Record<Badge["tone"], string> = {
  primary: "bg-primary/10 text-primary border-primary/20",
  success: "bg-success/10 text-success-foreground border-success/20",
  warning: "bg-warning/15 text-warning-foreground border-warning/30",
  accent: "bg-accent/15 text-accent-foreground border-accent/30",
};

function StatPill({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border/60">
      <Icon size={14} className="text-primary shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        <div className="text-overline">{label}</div>
        <div className="text-body-small font-bold truncate">{value}</div>
      </div>
    </div>
  );
}

export function VoyageurProfileBadges({
  verifiedKyc,
  verifiedSince,
  totalDeliveries = 0,
  onTimeRate,
  averageRating,
  topRoute,
  languages,
  responseTime,
  videoSelfieUrl,
  answers,
  className,
}: VoyageurProfileBadgesProps) {
  const badges: Badge[] = [
    { icon: ShieldCheck, label: "KYC vérifié", tone: "success", show: !!verifiedKyc },
    { icon: Award, label: "Vétéran 2 ans", tone: "primary", show: !!verifiedSince && yearsSince(verifiedSince) >= 2 },
    { icon: Clock, label: `${onTimeRate}% à l'heure`, tone: "success", show: typeof onTimeRate === "number" && onTimeRate >= 95 },
    { icon: Star, label: `${averageRating}/5`, tone: "warning", show: typeof averageRating === "number" && averageRating >= 4.5 },
    { icon: MapPin, label: `Top ${topRoute}`, tone: "accent", show: !!topRoute },
    { icon: Heart, label: `${totalDeliveries}+ livraisons`, tone: "primary", show: totalDeliveries >= 10 },
  ].filter((b) => b.show);

  return (
    <section
      aria-label="Informations de confiance voyageur"
      className={["space-y-5", className].filter(Boolean).join(" ")}
    >
      {/* Badges grid */}
      {badges.length > 0 && (
        <div>
          <h3 className="text-overline mb-2">Badges</h3>
          <ul className="flex flex-wrap gap-2">
            {badges.map((b) => {
              const Icon = b.icon;
              return (
                <li key={b.label} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold ${TONE_CLASSES[b.tone]}`}>
                  <Icon size={12} aria-hidden="true" />
                  <span>{b.label}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Trust signals grid */}
      <div>
        <h3 className="text-overline mb-2">Signaux de confiance</h3>
        <div className="grid grid-cols-2 gap-2">
          {responseTime && (<StatPill icon={MessageSquare} label="Réponse" value={responseTime} />)}
          {languages && languages.length > 0 && (<StatPill icon={Languages} label="Langues" value={languages.join(" · ")} />)}
          {verifiedSince && (<StatPill icon={ShieldCheck} label="Membre depuis" value={formatMonth(verifiedSince)} />)}
          {typeof onTimeRate === "number" && (<StatPill icon={Clock} label="À l'heure" value={`${onTimeRate}%`} />)}
        </div>
      </div>

      {/* Video selfie (KYC public preview) */}
      {videoSelfieUrl && (
        <div>
          <h3 className="text-overline mb-2">Selfie vidéo</h3>
          <div className="relative aspect-square max-w-[200px] rounded-2xl overflow-hidden bg-muted">
            <video src={videoSelfieUrl} muted loop autoPlay playsInline className="w-full h-full object-cover" />
            <span className="absolute bottom-2 left-2 chip-success"><ShieldCheck size={12} aria-hidden="true" />Vérifié</span>
          </div>
        </div>
      )}

      {/* 3 questions réponses */}
      {answers && (answers.whyTravel || answers.favoriteTypes || answers.promise) && (
        <div>
          <h3 className="text-overline mb-2">Faire connaissance</h3>
          <dl className="space-y-3">
            {answers.whyTravel && (
              <div className="card-future p-4">
                <dt className="text-caption-base font-semibold text-muted-foreground mb-1">Pourquoi je voyage</dt>
                <dd className="text-body-base text-foreground">{answers.whyTravel}</dd>
              </div>
            )}
            {answers.favoriteTypes && (
              <div className="card-future p-4">
                <dt className="text-caption-base font-semibold text-muted-foreground mb-1">Mes colis préférés</dt>
                <dd className="text-body-base text-foreground">{answers.favoriteTypes}</dd>
              </div>
            )}
            {answers.promise && (
              <div className="card-future-glow p-4">
                <dt className="text-caption-base font-semibold text-primary mb-1">Ma promesse</dt>
                <dd className="text-body-base font-medium text-foreground">{answers.promise}</dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </section>
  );
}

function yearsSince(isoMonth: string): number {
  const d = new Date(isoMonth);
  if (isNaN(d.getTime())) return 0;
  return (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 365);
}

function formatMonth(isoMonth: string): string {
  const d = new Date(isoMonth);
  if (isNaN(d.getTime())) return isoMonth;
  return d.toLocaleDateString("fr-FR", { month: "short", year: "numeric" });
}

export default VoyageurProfileBadges;
