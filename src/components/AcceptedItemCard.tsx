import { motion } from "framer-motion";
import { Camera, Check, CheckCircle, Loader2, Lock } from "lucide-react";
import React from "react";

type Step = { key: string; label: string };

interface AcceptedItemCardProps {
  id: string;
  title: string;
  price?: string | null;
  status: string;
  steps: Step[];
  onClick: () => void;
  /** Whether the camera button is blocked (e.g. waiting for proof of purchase) */
  blocked?: boolean;
  blockedMessage?: string;
  /** Preview state */
  previewUrl: string | null;
  capturingId: string | null;
  uploadingProof: boolean;
  onStartCapture: (id: string) => void;
  onRetake: () => void;
  onConfirm: () => void;
}

const AcceptedItemCard: React.FC<AcceptedItemCardProps> = ({
  id,
  title,
  price,
  status,
  steps,
  onClick,
  blocked,
  blockedMessage,
  previewUrl,
  capturingId,
  uploadingProof,
  onStartCapture,
  onRetake,
  onConfirm,
}) => {
  const statusIndex = steps.findIndex((s) => s.key === status);
  const currentIdx = statusIndex >= 0 ? statusIndex : 0;
  const isAccepted = status === "accepted";
  const isCapturing = capturingId === id;

  return (
    <motion.div
      key={id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl p-4 space-y-3 cursor-pointer hover:border-primary/30 transition-colors"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground truncate">{title}</span>
        {price && <span className="text-xs font-bold text-primary">{price} €</span>}
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-0">
        {steps.map((step, i) => {
          const isDone = i <= currentIdx;
          const isCurrent = i === currentIdx;
          return (
            <div key={step.key} className="flex items-center flex-1">
              {i > 0 && (
                <div className={`h-0.5 flex-1 transition-colors ${isDone ? "bg-[#30D158]" : "bg-border"}`} />
              )}
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 transition-all ${
                  isDone ? "bg-[#30D158] border-[#30D158]" : "bg-card border-border"
                } ${isCurrent ? "ring-2 ring-[#30D158]/30 ring-offset-1 ring-offset-card" : ""}`}
              >
                {isDone ? (
                  <CheckCircle size={14} className="text-white" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/25" />
                )}
              </div>
              {i < steps.length - 1 && (
                <div className={`h-0.5 flex-1 transition-colors ${i < currentIdx ? "bg-[#30D158]" : "bg-border"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Labels */}
      <div className="flex justify-between">
        {steps.map((step, i) => (
          <span
            key={step.key}
            className={`text-[9px] font-semibold text-center flex-1 ${
              i <= currentIdx ? "text-[#30D158]" : "text-muted-foreground/50"
            }`}
          >
            {step.label}
          </span>
        ))}
      </div>

      {/* Action area for accepted items */}
      {isAccepted && blocked && (
        <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 rounded-xl p-3 text-xs">
          <Lock size={14} className="shrink-0" />
          <span>{blockedMessage || "En attente de la preuve d'achat"}</span>
        </div>
      )}

      {isAccepted && !blocked && (
        previewUrl && isCapturing ? (
          <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
            <img src={previewUrl} alt="Aperçu" className="w-full max-h-[200px] object-cover rounded-xl border border-border" />
            <div className="flex gap-2">
              <button
                onClick={onRetake}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-border text-foreground text-xs font-bold"
              >
                <Camera size={14} /> Reprendre
              </button>
              <button
                onClick={onConfirm}
                disabled={uploadingProof}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#30D158] text-white text-xs font-bold disabled:opacity-50"
              >
                {uploadingProof ? (
                  <><Loader2 size={14} className="animate-spin" /> Envoi...</>
                ) : (
                  <><Check size={14} /> Confirmer</>
                )}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStartCapture(id);
            }}
            disabled={uploadingProof}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#0D84FF] text-white text-xs font-bold active:scale-[0.97] transition-all disabled:opacity-50"
          >
            <Camera size={14} /> Prendre la photo de récupération
          </button>
        )
      )}
    </motion.div>
  );
};

export default AcceptedItemCard;
