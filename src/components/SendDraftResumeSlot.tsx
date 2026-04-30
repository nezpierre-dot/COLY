import { AnimatePresence } from "framer-motion";
import { useState } from "react";
import DraftResumeBanner from "@/components/DraftResumeBanner";
import { useDraft } from "@/hooks/useDraft";
import { useTranslation } from "@/hooks/useTranslation";

interface SendDraftResumeSlotProps {
  onResume: () => void;
}

/**
 * Slot Dashboard : affiche le DraftResumeBanner uniquement
 * si un brouillon "send-coly" existe dans le localStorage.
 * Encapsule la lecture useDraft + l'état de dismiss local.
 */
const SendDraftResumeSlot = ({ onResume }: SendDraftResumeSlotProps) => {
  const { t } = useTranslation();
  const { read, clear, hasDraft } = useDraft<Record<string, any>>("send-coly");
  const [dismissed, setDismissed] = useState(false);

  if (!hasDraft || dismissed) return null;

  const entry = read();
  if (!entry) return null;

  return (
    <AnimatePresence>
      <DraftResumeBanner
        updatedAt={entry.updatedAt}
        onResume={onResume}
        onDismiss={() => {
          clear();
          setDismissed(true);
        }}
        label={t("draft.sendColyLabel")}
      />
    </AnimatePresence>
  );
};

export default SendDraftResumeSlot;
