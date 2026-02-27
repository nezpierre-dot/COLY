import { toast } from "sonner";

/**
 * Show a strong visual success confirmation with optional haptic vibration.
 * Use after key actions: mission created, shipment sent, voyage published, etc.
 */
export const successFeedback = (
  message: string,
  options?: { description?: string; duration?: number }
) => {
  // Haptic vibration (mobile)
  if (navigator.vibrate) {
    navigator.vibrate([50, 30, 50]);
  }

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
