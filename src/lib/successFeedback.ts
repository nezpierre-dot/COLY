import { toast } from "sonner";
import { hapticSuccess } from "@/lib/haptics";

/**
 * Show a strong visual success confirmation with optional haptic vibration.
 * Use after key actions: mission created, shipment sent, voyage published, etc.
 */
export const successFeedback = (
  message: string,
  options?: { description?: string; duration?: number }
) => {
  // Haptic vibration (mobile)
  hapticSuccess();

  toast.success(message, {
    description: options?.description,
    duration: options?.duration ?? 4000,
    style: {
      background: "hsl(var(--primary))",
      color: "hsl(var(--primary-foreground))",
      border: "none",
      fontWeight: 600,
    },
  });
};
